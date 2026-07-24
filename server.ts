import dotenv from "dotenv";
dotenv.config({ override: true });

import express from "express";
import fs from "fs";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { type Translation, lookupReference } from "./verses.js";
import { runChatTurn, generateLessonOpeningQuestion, isRateLimited, RATE_LIMIT_MESSAGE, type ChatMessage } from "./chat.js";
import { createDryRunAI } from "./dev-mock.js";
import { requireAuth, isFirebaseAdminConfigured, type AuthedRequest, signToken } from "./firebase-admin.js";
import { getOrCreateProfile, completeLesson, checkAndIncrementFreeChat, setPremiumStatus, findUidByStripeCustomerId } from "./progress-store.js";
import { createCheckoutSession, constructWebhookEvent, interpretWebhookEvent, isStripeConfigured } from "./stripe-admin.js";
import { dryRunGetOrCreateProfile, dryRunCompleteLesson, dryRunCheckAndIncrementFreeChat } from "./dry-run-store.js";

function isDryRun(): boolean {
  return process.env.DRY_RUN?.trim().toLowerCase() === "true";
}

function isVercelHosting(): boolean {
  return (
    process.env.V_HOSTING?.trim().toLowerCase() === "true" ||
    process.env.V_HOSTING?.trim().toLowerCase() === "true"
  );
}

export const app = express();

// Whitelist validator for V_HOSTING mode.
function isWhitelistedUser(email: string, pass: string): boolean {
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedPass = pass.trim();

  // 1. Check ALLOWED_USERS env var format: "email1:pass1,email2:pass2"
  if (process.env.ALLOWED_USERS) {
    const entries = process.env.ALLOWED_USERS.split(",");
    for (const entry of entries) {
      const [u, p] = entry.trim().split(":");
      if (u && p && u.trim().toLowerCase() === trimmedEmail && p.trim() === trimmedPass) {
        return true;
      }
    }
  }

  // 2. Check users.txt file in project root
  try {
    const candidates = [
      path.join(process.cwd(), "users.txt"),
      path.join(__dirname, "users.txt"),
      path.join(__dirname, "..", "users.txt"),
    ];
    const txtPath = candidates.find((p) => fs.existsSync(p));
    if (txtPath) {
      const content = fs.readFileSync(txtPath, "utf-8");
      const lines = content.split("\n");
      for (const line of lines) {
        const cleanLine = line.trim();
        if (!cleanLine || cleanLine.startsWith("#")) continue;
        const [u, p] = cleanLine.split(":");
        if (u && p && u.trim().toLowerCase() === trimmedEmail && p.trim() === trimmedPass) {
          return true;
        }
      }
    }
  } catch (err) {
    console.error("Error reading users.txt:", err);
  }

  return false;
}

// Middleware: Preview Whitelist Auth Check (active when V_HOSTING=TRUE)
function requirePreviewAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!isVercelHosting() || !req.path.startsWith("/api/")) return next();

  // Public exceptions: preview login/logout/status, health, and stripe webhook
  if (
    req.path.startsWith("/api/auth/preview") ||
    req.path === "/api/health" ||
    req.path === "/api/stripe/webhook" ||
    req.path === "/api/custom-login"
  ) {
    return next();
  }

  const cookieHeader = req.headers.cookie || "";
  const tokenHeader = req.headers["x-preview-auth"];
  const authHeader = req.headers.authorization;
  const isAuthenticated = cookieHeader.includes("anchor_preview_auth=true") || tokenHeader === "true" || Boolean(authHeader);

  if (isAuthenticated) {
    return next();
  }

  res.status(401).json({
    ok: false,
    reason: "preview_auth_required",
    text: "Preview whitelist authentication required.",
  });
}

// Stripe webhook needs raw body — registered before express.json()
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const signature = req.headers["stripe-signature"];
  if (typeof signature !== "string") {
    res.status(400).json({ error: "missing_signature" });
    return;
  }
  try {
    const event = constructWebhookEvent(req.body as Buffer, signature);
    const interpreted = interpretWebhookEvent(event);
    if (interpreted?.uid) {
      await setPremiumStatus(interpreted.uid, interpreted.isPremium, interpreted.stripeCustomerId);
    } else if (interpreted) {
      const uid = await findUidByStripeCustomerId(interpreted.stripeCustomerId);
      if (uid) await setPremiumStatus(uid, interpreted.isPremium);
    }
    res.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook verification failed:", error);
    res.status(400).json({ error: "webhook_verification_failed" });
  }
});

app.use(express.json());

// URL normalizer for Vercel serverless rewrites: ensures req.url always has /api prefix
app.use((req, _res, next) => {
  if (req.url && !req.url.startsWith("/api") && req.url !== "/") {
    req.url = "/api" + (req.url.startsWith("/") ? req.url : "/" + req.url);
  }
  next();
});

app.use(requirePreviewAuth);

// Lazy initialization of Gemini client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      // Real Gemini client — works in both DRY_RUN and production modes.
      aiClient = new GoogleGenAI({ apiKey });
    } else if (isDryRun()) {
      // DRY_RUN without an API key: use fake/mock AI so the UI is still testable.
      aiClient = createDryRunAI();
    } else {
      throw new Error("GEMINI_API_KEY environment variable is missing. Set it in .env.");
    }
  }
  return aiClient;
}

async function requireAuthUnlessDryRun(req: AuthedRequest, res: express.Response, next: express.NextFunction) {
  if (isDryRun()) {
    req.uid = "dry-run-user";
    next();
    return;
  }
  await requireAuth(req, res, next);
}

// --- Custom Login Endpoint ---
app.post("/api/custom-login", async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== "string" || typeof password !== "string") {
    res.status(400).json({ ok: false, error: "Email and password are required." });
    return;
  }

  const trimmedEmail = email.trim().toLowerCase();

  // 1. Verify credentials against users.txt / ALLOWED_USERS
  if (!isWhitelistedUser(trimmedEmail, password)) {
    res.status(401).json({ ok: false, error: "Invalid email or password." });
    return;
  }

  try {
    // Generate our own local session token, completely bypassing Firebase Auth lookup
    const token = signToken({ email: trimmedEmail });
    res.json({ ok: true, token });
  } catch (error: any) {
    console.error("Custom login failed:", error);
    res.status(500).json({ ok: false, error: error?.message || "Failed to authenticate." });
  }
});

// --- Preview Auth Endpoints ---
app.get("/api/auth/preview-status", (req, res) => {
  const cookieHeader = req.headers.cookie || "";
  const tokenHeader = req.headers["x-preview-auth"];
  const vercelHosting = isVercelHosting();
  const isAuthenticated = !vercelHosting || cookieHeader.includes("anchor_preview_auth=true") || tokenHeader === "true";

  res.json({
    ok: true,
    vercelHosting,
    authenticated: isAuthenticated,
  });
});

app.post("/api/auth/preview-login", (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== "string" || typeof password !== "string") {
    res.status(400).json({ ok: false, error: "Email and password are required." });
    return;
  }

  if (isWhitelistedUser(email, password)) {
    res.setHeader("Set-Cookie", "anchor_preview_auth=true; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000"); // 30 days
    res.json({ ok: true });
  } else {
    res.status(401).json({ ok: false, error: "Invalid email or password. Please request access from the admin." });
  }
});

app.post("/api/auth/preview-logout", (_req, res) => {
  res.setHeader("Set-Cookie", "anchor_preview_auth=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
  res.json({ ok: true });
});

// T1 health check
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    geminiConfigured: isDryRun() || Boolean(process.env.GEMINI_API_KEY),
    dryRun: isDryRun(),
    authConfigured: isFirebaseAdminConfigured,
    stripeConfigured: isStripeConfigured,
    vercelHosting: isVercelHosting(),
  });
});

// T2 verse lookup
app.get("/api/verse", (req, res) => {
  const translation = (req.query.translation === "kjv" ? "kjv" : "web") as Translation;
  const ref = typeof req.query.ref === "string" ? req.query.ref : "";
  if (!ref) {
    res.status(400).json({ found: false, reason: "missing_ref" });
    return;
  }
  const result = lookupReference(translation, ref);
  res.json(result);
});

// Progress Sync
app.get("/api/progress", requireAuthUnlessDryRun, async (req: AuthedRequest, res) => {
  if (isDryRun()) {
    res.json({ ok: true, profile: dryRunGetOrCreateProfile(req.uid!) });
    return;
  }
  try {
    const profile = await getOrCreateProfile(req.uid!);
    res.json({ ok: true, profile });
  } catch (error) {
    console.error("Failed to load progress:", error);
    res.status(503).json({ ok: false, error: "progress_unavailable" });
  }
});

app.post("/api/progress/complete", requireAuthUnlessDryRun, async (req: AuthedRequest, res) => {
  const lessonId = typeof req.body?.lessonId === "string" ? req.body.lessonId : "";
  const xpReward = Number(req.body?.xpReward) || 0;
  if (!lessonId) {
    res.status(400).json({ ok: false, error: "missing_lesson_id" });
    return;
  }
  if (isDryRun()) {
    res.json({ ok: true, profile: dryRunCompleteLesson(req.uid!, lessonId, xpReward) });
    return;
  }
  try {
    const profile = await completeLesson(req.uid!, lessonId, xpReward);
    res.json({ ok: true, profile });
  } catch (error) {
    console.error("Failed to record lesson completion:", error);
    res.status(503).json({ ok: false, error: "progress_unavailable" });
  }
});

// Stripe Checkout Session Creation
app.post("/api/stripe/create-checkout-session", requireAuthUnlessDryRun, async (req: AuthedRequest, res) => {
  try {
    const origin = `${req.protocol}://${req.get("host")}`;
    const url = await createCheckoutSession(req.uid!, origin);
    res.json({ ok: true, url });
  } catch (error: any) {
    console.error("Failed to create checkout session:", error);
    res.status(503).json({ ok: false, error: "checkout_unavailable", message: error?.message });
  }
});

// Chat Turn Handler
app.post("/api/chat", requireAuthUnlessDryRun, async (req: AuthedRequest, res) => {
  const ip = req.ip ?? "unknown";
  if (isRateLimited(ip)) {
    res.status(429).json({ ok: false, reason: "rate_limited", text: RATE_LIMIT_MESSAGE });
    return;
  }

  if (req.body?.init) {
    const title = typeof req.body.title === "string" ? req.body.title : "";
    const verseRef = typeof req.body.verseRef === "string" ? req.body.verseRef : "";
    const openingPrompt = typeof req.body.openingPrompt === "string" ? req.body.openingPrompt : "";
    const translation = (req.body.translation === "kjv" ? "kjv" : "web") as Translation;
    
    try {
      const ai = getGeminiClient();
      const questionText = await generateLessonOpeningQuestion(ai, title, verseRef, translation, openingPrompt);
      if (!questionText.trim()) {
        res.status(500).json({ ok: false, reason: "gemini_unavailable", text: "Anchor didn't respond. Please try again." });
        return;
      }
      res.json({ ok: true, text: questionText });
    } catch (error) {
      console.error("Failed to generate lesson opening question:", error);
      res.status(500).json({ ok: false, reason: "gemini_unavailable", text: "Failed to initialize this lesson." });
    }
    return;
  }

  const history: ChatMessage[] = Array.isArray(req.body?.history) ? req.body.history : [];
  const message = typeof req.body?.message === "string" ? req.body.message : "";
  const isFreeChat = Boolean(req.body?.isFreeChat);
  if (!message.trim()) {
    res.status(400).json({ ok: false, reason: "empty_message", text: "Say something and I'll respond." });
    return;
  }

  if (isFreeChat) {
    try {
      const { allowed } = isDryRun() ? dryRunCheckAndIncrementFreeChat(req.uid!) : await checkAndIncrementFreeChat(req.uid!);
      if (!allowed) {
        res.status(402).json({
          ok: false,
          reason: "free_chat_limit",
          text: "You've used today's free conversation messages. Upgrade to Anchor Premium for unlimited free conversation.",
        });
        return;
      }
    } catch (error) {
      console.error("Free-chat limit check failed:", error);
      res.status(503).json({ ok: false, reason: "gemini_unavailable", text: "Anchor is having trouble right now. Please try again in a moment." });
      return;
    }
  }

  try {
    const ai = getGeminiClient();
    const result = await runChatTurn(ai, history, message);
    res.json(result);
  } catch (error: any) {
    console.error("Chat route failed before calling Gemini:", error);
    res.status(500).json({ ok: false, reason: "gemini_unavailable", text: "Anchor isn't configured correctly right now. Please try again later." });
  }
});

async function startServer() {
  const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      const hasKey = Boolean(process.env.GEMINI_API_KEY);
      const isDry = isDryRun();
      const geminiMode = hasKey ? "real Gemini calls" : "mock Gemini";
      console.log(`Anchor server running on port ${PORT} (${isDry ? "DRY RUN Auth" : "Firebase Auth"} mode — ${geminiMode})`);
      if (isVercelHosting()) {
        console.log("V_HOSTING is enabled — Preview Whitelist Gatekeeper active.");
      }
      if (!hasKey) {
        console.warn("GEMINI_API_KEY is not set — /api/health will report geminiConfigured: false.");
      }
      if (!isDry && !isFirebaseAdminConfigured) {
        console.warn("FIREBASE_SERVICE_ACCOUNT_JSON is not set — /api/chat and /api/progress will reject all requests until it's configured.");
      }
    });
  }
}

// Fallback 404 Handler for API routes: Ensure all unmatched API calls return JSON instead of HTML
app.use((_req, res) => {
  res.status(404).json({ ok: false, error: "API endpoint not found." });
});

// Global Express Error Handler: Guarantee all server errors return JSON instead of HTML
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Server error caught by global handler:", err);
  res.status(500).json({
    ok: false,
    error: err?.message || "Internal server error.",
  });
});

startServer();

export default app;
