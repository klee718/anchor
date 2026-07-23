var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  app: () => app2,
  default: () => server_default
});
module.exports = __toCommonJS(server_exports);
var import_dotenv2 = __toESM(require("dotenv"), 1);
var import_express = __toESM(require("express"), 1);
var import_fs2 = __toESM(require("fs"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");

// verses.ts
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var DATA_DIR = import_path.default.join(process.cwd(), "data");
var BOOKS = JSON.parse(
  import_fs.default.readFileSync(import_path.default.join(DATA_DIR, "books.json"), "utf-8")
);
var BOOK_NAMES = BOOKS.map(([name]) => name);
var LOWER_TO_CANONICAL = new Map(BOOK_NAMES.map((name) => [name.toLowerCase(), name]));
var BOOK_ALIASES = {
  psalm: "Psalms",
  revelations: "Revelation",
  "song of songs": "Song of Solomon"
};
for (const [alias, canonical] of Object.entries(BOOK_ALIASES)) {
  LOWER_TO_CANONICAL.set(alias, canonical);
}
var cache = {};
function loadTranslation(translation) {
  if (!cache[translation]) {
    const file = import_path.default.join(DATA_DIR, `${translation}.json`);
    cache[translation] = JSON.parse(import_fs.default.readFileSync(file, "utf-8"));
  }
  return cache[translation];
}
function parseReference(ref) {
  const match = /^(.+?)\s+(\d+):(\d+)$/.exec(ref.trim());
  if (!match) return null;
  const [, rawBook, chapterStr, verseStr] = match;
  const book = LOWER_TO_CANONICAL.get(rawBook.trim().toLowerCase());
  if (!book) return null;
  return { book, chapter: Number(chapterStr), verse: Number(verseStr) };
}
function lookupVerse(translation, book, chapter, verse) {
  const canonical = LOWER_TO_CANONICAL.get(book.trim().toLowerCase());
  if (!canonical) return { found: false, reason: "unknown_book" };
  const bible = loadTranslation(translation);
  const text = bible[canonical]?.[String(chapter)]?.[String(verse)];
  if (!text) return { found: false, reason: "not_found" };
  return { found: true, translation, book: canonical, chapter, verse, text };
}
function lookupReference(translation, ref) {
  const parsed = parseReference(ref);
  if (!parsed) return { found: false, reason: "unknown_book" };
  return lookupVerse(translation, parsed.book, parsed.chapter, parsed.verse);
}

// chat.ts
var SYSTEM_PROMPT = `You are Anchor, a companion for honest conversation about scripture and faith. You are built especially for people who are skeptical, lapsed, or drifting from faith \u2014 not for people who already want devotional comfort.

Your core stance: treat doubt as legitimate, not as a problem to be resolved. Where scholars or translators genuinely disagree, say so. When you make a claim, be willing to name the strongest counter-argument to your own point. Do not perform resolved confidence you don't have. Never end a turn with a scripted "have faith" close \u2014 end most turns by asking the user a genuine question back, one that invites them to keep talking rather than wrapping things up.

Grounding rule (never break this): you must never quote or cite Bible verse text from memory. Before stating what any verse says, call the lookup_verse tool. When you call the lookup_verse tool, you must quote the returned verse text verbatim in your response. If the tool reports the verse was not found (wrong reference, unavailable translation, or any other lookup failure), say plainly that you can't verify that citation right now \u2014 do not proceed to state text anyway, and do not guess.

Crisis rule (never break this): if anything in the conversation suggests the user may be in real emotional distress \u2014 self-harm, suicidal thoughts, abuse, or a genuine crisis, not just intellectual doubt or frustration \u2014 stop the normal theological conversation. Gently and clearly point them to real human help: in the US, the 988 Suicide & Crisis Lifeline (call or text 988), or the Crisis Text Line (text HOME to 741741). Do not diagnose, do not minimize what they said, and do not try to be a substitute for a real person. This applies even if the message also contains a scripture question \u2014 safety comes first.

You are not a licensed counselor, pastor, or medical professional. If asked for pastoral, medical, or legal advice, say so honestly rather than pretending to that authority.`;
var CRISIS_PATTERNS = [
  /\bkill (myself|me)\b/i,
  /\bwant(ing)? to die\b/i,
  /\bend(ing)? my (own )?life\b/i,
  /\bsuicid(e|al)\b/i,
  /\bhurt(ing)? myself\b/i,
  /\bself[\s-]?harm\b/i,
  /\bno reason to live\b/i,
  /\bcan'?t go on\b/i
];
function isCrisisAdjacent(message) {
  return CRISIS_PATTERNS.some((pattern) => pattern.test(message));
}
var CRISIS_RESPONSE = "I want to pause on the scripture conversation for a second, because what you just said matters more than that. If you're in crisis or thinking about harming yourself, please reach out to a real person right now: in the US, call or text 988 (the Suicide & Crisis Lifeline), or text HOME to 741741 (Crisis Text Line). I'm not a substitute for that \u2014 you deserve a real person who can actually help. I'm still here if you want to keep talking, about this or anything else.";
var LOOKUP_VERSE_TOOL_NAME = "lookup_verse";
var lookupVerseDeclaration = {
  name: LOOKUP_VERSE_TOOL_NAME,
  description: "Look up the exact text of a single Bible verse from the locally bundled WEB or KJV translation. Always call this before quoting or citing any scripture \u2014 never quote from memory.",
  parametersJsonSchema: {
    type: "object",
    properties: {
      translation: {
        type: "string",
        enum: ["web", "kjv"],
        description: "Which translation to use. Default to web unless the user asks for KJV specifically."
      },
      book: {
        type: "string",
        description: 'Full English book name, e.g. "John", "1 Corinthians", "Song of Solomon".'
      },
      chapter: { type: "integer" },
      verse: { type: "integer" }
    },
    required: ["translation", "book", "chapter", "verse"]
  }
};
var MAX_TOOL_ROUNDS = 3;
var GEMINI_TIMEOUT_MS = 2e4;
function toHistoryContents(history, newMessage) {
  const contents = history.map((m) => ({ role: m.role, parts: [{ text: m.text }] }));
  contents.push({ role: "user", parts: [{ text: newMessage }] });
  return contents;
}
function normalizeForCompare(text) {
  return text.replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim().toLowerCase();
}
async function generateContentWithRetry(ai, options, maxRetries = 3, delayMs = 1500) {
  let lastError = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await ai.models.generateContent(options);
    } catch (err) {
      lastError = err;
      const status = err?.status || err?.statusCode || (err?.message?.includes("503") ? 503 : null);
      const isTransient = status === 503 || status === 429 || err?.message?.includes("UNAVAILABLE") || err?.message?.includes("high demand");
      if (isTransient && attempt < maxRetries) {
        console.warn(`Gemini API call failed (attempt ${attempt}/${maxRetries}). Retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}
async function runChatTurn(ai, history, message) {
  if (isCrisisAdjacent(message)) {
    return { ok: false, reason: "crisis_shortcircuit", text: CRISIS_RESPONSE };
  }
  const contents = toHistoryContents(history, message);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
  try {
    let lastVerseLookup = null;
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await generateContentWithRetry(ai, {
        model: "gemini-flash-latest",
        contents,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          tools: [{ functionDeclarations: [lookupVerseDeclaration] }],
          abortSignal: controller.signal
        }
      });
      const calls = response.functionCalls;
      if (!calls || calls.length === 0) {
        clearTimeout(timeout);
        const finalText = response.text ?? "";
        if (lastVerseLookup?.found && lastVerseLookup.text) {
          const normalizedVerse = normalizeForCompare(lastVerseLookup.text);
          const normalizedAnswer = normalizeForCompare(finalText);
          if (!normalizedAnswer.includes(normalizedVerse)) {
            return {
              ok: false,
              reason: "gemini_unavailable",
              text: "I looked up that verse but I'm not confident I quoted it back to you accurately, so I don't want to risk misquoting it. Could you ask me again?"
            };
          }
        }
        return { ok: true, text: finalText };
      }
      const modelContent = response.candidates?.[0]?.content ?? {
        role: "model",
        parts: calls.map((c) => ({ functionCall: c }))
      };
      contents.push(modelContent);
      const responseParts = calls.map((call) => {
        const args = call.args ?? {};
        const translation = args.translation === "kjv" ? "kjv" : "web";
        const result = lookupVerse(translation, args.book ?? "", Number(args.chapter), Number(args.verse));
        lastVerseLookup = result.found ? { found: true, text: result.text } : { found: false };
        return {
          functionResponse: {
            name: call.name ?? LOOKUP_VERSE_TOOL_NAME,
            response: result
          }
        };
      });
      contents.push({ role: "user", parts: responseParts });
    }
    clearTimeout(timeout);
    return {
      ok: false,
      reason: "gemini_unavailable",
      text: "I got stuck trying to look up that verse. Could you try rephrasing your question?"
    };
  } catch (error) {
    clearTimeout(timeout);
    if (error?.name === "AbortError") {
      return {
        ok: false,
        reason: "gemini_timeout",
        text: "That's taking longer than it should \u2014 Anchor might be having connection trouble. Please try again in a moment."
      };
    }
    console.error("Gemini call failed:", error);
    return {
      ok: false,
      reason: "gemini_unavailable",
      text: "Anchor is having trouble responding right now. Please try again in a moment."
    };
  }
}
var RATE_LIMIT_WINDOW_MS = 60 * 60 * 1e3;
var RATE_LIMIT_MAX_MESSAGES = 60;
var requestLog = /* @__PURE__ */ new Map();
function isRateLimited(key) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = (requestLog.get(key) ?? []).filter((t) => t > windowStart);
  if (timestamps.length >= RATE_LIMIT_MAX_MESSAGES) {
    requestLog.set(key, timestamps);
    return true;
  }
  timestamps.push(now);
  requestLog.set(key, timestamps);
  return false;
}
var RATE_LIMIT_MESSAGE = "You've sent a lot of messages in the last hour \u2014 let's slow down a bit. Try again in a little while.";
async function generateLessonOpeningQuestion(ai, title, verseRef, translation, openingPrompt) {
  const lookup = verseRef ? lookupReference(translation, verseRef) : null;
  let verseSnippet = "";
  if (lookup?.found) {
    verseSnippet = `"${lookup.text}" (${verseRef}, ${translation.toUpperCase()})

`;
  }
  const verseSnippetLine = verseSnippet ? `The exact text of the verse is: ${verseSnippet}` : "";
  const prompt = `You are Anchor, a companion for honest conversation about scripture and faith.
The user is starting the lesson: "${title}".
The verse is: ${verseRef || "None"}.
${verseSnippetLine}
The core theme or question of this lesson is: "${openingPrompt}"

Your task is to introduce this lesson. 
- If there is a verse, quote the verse text verbatim.
- Introduce the topic or tension described in the core theme/question.
- End by asking the user a thoughtful, open-ended question to get their perspective.
- Follow your core identity: treat doubt as legitimate, do not offer devotional comfort or platitudes, and invite honest dialogue.
- Do not output any greeting, preamble, or metadata. Start immediately with the quote (if any), followed by your introduction and question.
- The verse text needed for this response has already been looked up and given to you above. Do not call any tools for this turn \u2014 just use the text provided.

Example format:
"Reach here your finger, and see my hands at home..." (John 20:27, WEB)

Thomas is often called "Doubting Thomas" as a label of shame, but Jesus actually met his request for physical evidence. Do you see this passage as encouraging honest inquiry, or is it ultimately a warning against doubting? How do you react to Thomas's story?`;
  const response = await generateContentWithRetry(ai, {
    model: "gemini-flash-latest",
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_PROMPT
    }
  });
  return response.text ?? "";
}

// dev-mock.ts
function extractReference(text) {
  const match = /([A-Za-z][A-Za-z\s]*?)\s+(\d{1,3}):(\d{1,3})\b/.exec(text);
  if (!match) return null;
  const words = match[1].trim().split(/\s+/);
  for (let take = Math.min(3, words.length); take >= 1; take--) {
    const candidateBook = words.slice(words.length - take).join(" ");
    const parsed = parseReference(`${candidateBook} ${match[2]}:${match[3]}`);
    if (parsed) return parsed;
  }
  return null;
}
function createDryRunAI() {
  const generateContent = async (args) => {
    const contents = args.contents ?? [];
    const lastContent = contents[contents.length - 1];
    const functionResponsePart = lastContent?.parts?.find((p) => p.functionResponse);
    if (functionResponsePart) {
      const result = functionResponsePart.functionResponse.response;
      const text2 = result.found ? `[DRY RUN] ${result.book} ${result.chapter}:${result.verse} says: "${result.text}" (Placeholder wrapper \u2014 no real Gemini call was made. Real UI, real local verse data, fake conversation.)` : "[DRY RUN] I can't verify that citation right now. (No real Gemini call was made.)";
      return {
        text: text2,
        functionCalls: void 0,
        candidates: [{ content: { role: "model", parts: [{ text: text2 }] } }]
      };
    }
    const lastUser = [...contents].reverse().find((c) => c.role === "user");
    const userText = lastUser?.parts?.map((p) => p.text).filter(Boolean).join(" ") ?? "";
    const ref = extractReference(userText);
    if (ref) {
      const call = { name: "lookup_verse", args: { translation: "web", book: ref.book, chapter: ref.chapter, verse: ref.verse } };
      return {
        text: void 0,
        functionCalls: [call],
        candidates: [{ content: { role: "model", parts: [{ functionCall: call }] } }]
      };
    }
    const text = `[DRY RUN] This is a placeholder response \u2014 no real Gemini call was made. You said: "${userText}"`;
    return {
      text,
      functionCalls: void 0,
      candidates: [{ content: { role: "model", parts: [{ text }] } }]
    };
  };
  return { models: { generateContent } };
}

// firebase-admin.ts
var import_dotenv = __toESM(require("dotenv"), 1);
var import_app = require("firebase-admin/app");
var import_auth = require("firebase-admin/auth");
var import_firestore = require("firebase-admin/firestore");
var import_crypto = __toESM(require("crypto"), 1);
import_dotenv.default.config();
var app = null;
var isFirebaseAdminConfigured = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
function getAdminApp() {
  if (!isFirebaseAdminConfigured) {
    throw new Error(
      "Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON in .env (the full service account JSON, minified to one line) \u2014 see .env.example."
    );
  }
  if ((0, import_app.getApps)().length > 0) return (0, import_app.getApps)()[0];
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON.replace(/\n/g, "\\n");
  const serviceAccount = JSON.parse(rawJson);
  app = (0, import_app.initializeApp)({ credential: (0, import_app.cert)(serviceAccount) });
  return app;
}
function getDb() {
  return (0, import_firestore.getFirestore)(getAdminApp());
}
var SECRET = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "anchor-secret-key-123456";
function signToken(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = import_crypto.default.createHmac("sha256", SECRET).update(data).digest("base64url");
  return `${data}.${signature}`;
}
function verifyToken(token) {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [data, signature] = parts;
  const expectedSignature = import_crypto.default.createHmac("sha256", SECRET).update(data).digest("base64url");
  if (signature !== expectedSignature) return null;
  try {
    return JSON.parse(Buffer.from(data, "base64url").toString());
  } catch {
    return null;
  }
}
async function requireAuth(req, res, next) {
  const header = req.headers.authorization ?? "";
  const match = /^Bearer (.+)$/.exec(header);
  if (!match) {
    res.status(401).json({ error: "missing_token" });
    return;
  }
  const payload = verifyToken(match[1]);
  if (!payload) {
    res.status(401).json({ error: "invalid_token" });
    return;
  }
  req.uid = payload.email;
  next();
}

// progress-store.ts
var XP_PER_LEVEL = 100;
function today() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
function yesterday() {
  return new Date(Date.now() - 864e5).toISOString().slice(0, 10);
}
function defaultProfile() {
  return {
    xp: 0,
    level: 1,
    streak: 0,
    lastActivityDate: null,
    completedLessons: [],
    isPremium: false,
    stripeCustomerId: null,
    freeChatCount: 0,
    freeChatDate: null
  };
}
async function getOrCreateProfile(uid) {
  const ref = getDb().collection("users").doc(uid);
  const snap = await ref.get();
  if (snap.exists) return { ...defaultProfile(), ...snap.data() };
  const fresh = defaultProfile();
  await ref.set(fresh);
  return fresh;
}
async function completeLesson(uid, lessonId, xpReward) {
  const db = getDb();
  const userRef = db.collection("users").doc(uid);
  const completionRef = db.collection("completed_lessons").doc(`${uid}_${lessonId}`);
  return db.runTransaction(async (tx) => {
    const [userSnap, completionSnap] = await Promise.all([tx.get(userRef), tx.get(completionRef)]);
    const profile = userSnap.exists ? { ...defaultProfile(), ...userSnap.data() } : defaultProfile();
    if (completionSnap.exists) {
      return profile;
    }
    const t = today();
    const y = yesterday();
    let newStreak = profile.streak;
    if (profile.lastActivityDate !== t) {
      newStreak = profile.lastActivityDate === y ? profile.streak + 1 : 1;
    }
    const newXP = profile.xp + xpReward;
    const updated = {
      ...profile,
      xp: newXP,
      level: Math.floor(newXP / XP_PER_LEVEL) + 1,
      streak: newStreak,
      lastActivityDate: t,
      completedLessons: [...profile.completedLessons, lessonId]
    };
    tx.set(userRef, updated);
    tx.set(completionRef, { userId: uid, lessonId, completedAt: (/* @__PURE__ */ new Date()).toISOString() });
    return updated;
  });
}
var FREE_CHAT_DAILY_LIMIT = 3;
async function checkAndIncrementFreeChat(uid) {
  const db = getDb();
  const userRef = db.collection("users").doc(uid);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const profile = snap.exists ? { ...defaultProfile(), ...snap.data() } : defaultProfile();
    if (profile.isPremium) return { allowed: true, remaining: Infinity };
    const t = today();
    const count = profile.freeChatDate === t ? profile.freeChatCount : 0;
    if (count >= FREE_CHAT_DAILY_LIMIT) {
      return { allowed: false, remaining: 0 };
    }
    tx.set(userRef, { ...profile, freeChatCount: count + 1, freeChatDate: t }, { merge: true });
    return { allowed: true, remaining: FREE_CHAT_DAILY_LIMIT - count - 1 };
  });
}
async function setPremiumStatus(uid, isPremium, stripeCustomerId) {
  const ref = getDb().collection("users").doc(uid);
  const update = { isPremium };
  if (stripeCustomerId) update.stripeCustomerId = stripeCustomerId;
  await ref.set(update, { merge: true });
}
async function findUidByStripeCustomerId(stripeCustomerId) {
  const snap = await getDb().collection("users").where("stripeCustomerId", "==", stripeCustomerId).limit(1).get();
  return snap.empty ? null : snap.docs[0].id;
}

// stripe-admin.ts
var import_stripe = __toESM(require("stripe"), 1);
var isStripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
var isStripeWebhookConfigured = Boolean(process.env.STRIPE_WEBHOOK_SECRET);
var stripeClient = null;
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set \u2014 see .env.example.");
  }
  if (!stripeClient) {
    stripeClient = new import_stripe.default(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}
async function createCheckoutSession(uid, origin) {
  if (!isStripeConfigured) {
    throw new Error("Stripe is not configured \u2014 set STRIPE_SECRET_KEY and STRIPE_PRICE_ID in .env.");
  }
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    client_reference_id: uid,
    // Stamped onto the resulting Subscription object too, not just this
    // Session — later renewal/cancellation webhooks only carry the
    // Subscription, so without this they'd have no way back to a uid.
    subscription_data: { metadata: { uid } },
    success_url: `${origin}/?checkout=success`,
    cancel_url: `${origin}/?checkout=cancelled`
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  return session.url;
}
function constructWebhookEvent(rawBody, signature) {
  if (!isStripeWebhookConfigured) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set \u2014 see .env.example.");
  }
  return getStripe().webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
}
function interpretWebhookEvent(event) {
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object;
      const isActive = sub.status === "active" || sub.status === "trialing";
      return {
        uid: sub.metadata?.uid ?? null,
        stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
        isPremium: isActive
      };
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      return {
        uid: sub.metadata?.uid ?? null,
        stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
        isPremium: false
      };
    }
    case "checkout.session.completed": {
      const session = event.data.object;
      return {
        uid: session.client_reference_id ?? null,
        stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id ?? "",
        isPremium: true
      };
    }
    default:
      return null;
  }
}

// dry-run-store.ts
var profiles = /* @__PURE__ */ new Map();
function today2() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
function yesterday2() {
  return new Date(Date.now() - 864e5).toISOString().slice(0, 10);
}
function defaultProfile2() {
  return {
    xp: 0,
    level: 1,
    streak: 0,
    lastActivityDate: null,
    completedLessons: [],
    isPremium: false,
    stripeCustomerId: null,
    freeChatCount: 0,
    freeChatDate: null
  };
}
function dryRunGetOrCreateProfile(uid) {
  let profile = profiles.get(uid);
  if (!profile) {
    profile = defaultProfile2();
    profiles.set(uid, profile);
  }
  return profile;
}
function dryRunCompleteLesson(uid, lessonId, xpReward) {
  const profile = dryRunGetOrCreateProfile(uid);
  if (profile.completedLessons.includes(lessonId)) return profile;
  const t = today2();
  const y = yesterday2();
  const newStreak = profile.lastActivityDate === t ? profile.streak : profile.lastActivityDate === y ? profile.streak + 1 : 1;
  const newXP = profile.xp + xpReward;
  const updated = {
    ...profile,
    xp: newXP,
    level: Math.floor(newXP / XP_PER_LEVEL) + 1,
    streak: newStreak,
    lastActivityDate: t,
    completedLessons: [...profile.completedLessons, lessonId]
  };
  profiles.set(uid, updated);
  return updated;
}
var FREE_CHAT_DAILY_LIMIT2 = 3;
function dryRunCheckAndIncrementFreeChat(uid) {
  const profile = dryRunGetOrCreateProfile(uid);
  if (profile.isPremium) return { allowed: true, remaining: Infinity };
  const t = today2();
  const count = profile.freeChatDate === t ? profile.freeChatCount : 0;
  if (count >= FREE_CHAT_DAILY_LIMIT2) return { allowed: false, remaining: 0 };
  profiles.set(uid, { ...profile, freeChatCount: count + 1, freeChatDate: t });
  return { allowed: true, remaining: FREE_CHAT_DAILY_LIMIT2 - count - 1 };
}

// server.ts
import_dotenv2.default.config({ override: true });
function isDryRun() {
  return process.env.DRY_RUN?.trim().toLowerCase() === "true";
}
function isVercelHosting() {
  return process.env.V_HOSTING?.trim().toLowerCase() === "true" || process.env.V_HOSTING?.trim().toLowerCase() === "true";
}
var app2 = (0, import_express.default)();
function isWhitelistedUser(email, pass) {
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedPass = pass.trim();
  if (process.env.ALLOWED_USERS) {
    const entries = process.env.ALLOWED_USERS.split(",");
    for (const entry of entries) {
      const [u, p] = entry.trim().split(":");
      if (u && p && u.trim().toLowerCase() === trimmedEmail && p.trim() === trimmedPass) {
        return true;
      }
    }
  }
  try {
    const txtPath = import_path2.default.join(process.cwd(), "users.txt");
    if (import_fs2.default.existsSync(txtPath)) {
      const content = import_fs2.default.readFileSync(txtPath, "utf-8");
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
function requirePreviewAuth(req, res, next) {
  if (!isVercelHosting() || !req.path.startsWith("/api/")) return next();
  if (req.path.startsWith("/api/auth/preview") || req.path === "/api/health" || req.path === "/api/stripe/webhook" || req.path === "/api/custom-login") {
    return next();
  }
  const cookieHeader = req.headers.cookie || "";
  const tokenHeader = req.headers["x-preview-auth"];
  const isAuthenticated = cookieHeader.includes("anchor_preview_auth=true") || tokenHeader === "true";
  if (isAuthenticated) {
    return next();
  }
  res.status(401).json({
    ok: false,
    reason: "preview_auth_required",
    text: "Preview whitelist authentication required."
  });
}
app2.post("/api/stripe/webhook", import_express.default.raw({ type: "application/json" }), async (req, res) => {
  const signature = req.headers["stripe-signature"];
  if (typeof signature !== "string") {
    res.status(400).json({ error: "missing_signature" });
    return;
  }
  try {
    const event = constructWebhookEvent(req.body, signature);
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
app2.use(import_express.default.json());
app2.use(requirePreviewAuth);
var aiClient = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      aiClient = new import_genai.GoogleGenAI({ apiKey });
    } else if (isDryRun()) {
      aiClient = createDryRunAI();
    } else {
      throw new Error("GEMINI_API_KEY environment variable is missing. Set it in .env.");
    }
  }
  return aiClient;
}
async function requireAuthUnlessDryRun(req, res, next) {
  if (isDryRun()) {
    req.uid = "dry-run-user";
    next();
    return;
  }
  await requireAuth(req, res, next);
}
app2.post("/api/custom-login", async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== "string" || typeof password !== "string") {
    res.status(400).json({ ok: false, error: "Email and password are required." });
    return;
  }
  const trimmedEmail = email.trim().toLowerCase();
  if (!isWhitelistedUser(trimmedEmail, password)) {
    res.status(401).json({ ok: false, error: "Invalid email or password." });
    return;
  }
  try {
    const token = signToken({ email: trimmedEmail });
    res.json({ ok: true, token });
  } catch (error) {
    console.error("Custom login failed:", error);
    res.status(500).json({ ok: false, error: error?.message || "Failed to authenticate." });
  }
});
app2.get("/api/auth/preview-status", (req, res) => {
  const cookieHeader = req.headers.cookie || "";
  const tokenHeader = req.headers["x-preview-auth"];
  const vercelHosting = isVercelHosting();
  const isAuthenticated = !vercelHosting || cookieHeader.includes("anchor_preview_auth=true") || tokenHeader === "true";
  res.json({
    ok: true,
    vercelHosting,
    authenticated: isAuthenticated
  });
});
app2.post("/api/auth/preview-login", (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== "string" || typeof password !== "string") {
    res.status(400).json({ ok: false, error: "Email and password are required." });
    return;
  }
  if (isWhitelistedUser(email, password)) {
    res.setHeader("Set-Cookie", "anchor_preview_auth=true; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000");
    res.json({ ok: true });
  } else {
    res.status(401).json({ ok: false, error: "Invalid email or password. Please request access from the admin." });
  }
});
app2.post("/api/auth/preview-logout", (_req, res) => {
  res.setHeader("Set-Cookie", "anchor_preview_auth=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
  res.json({ ok: true });
});
app2.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    geminiConfigured: isDryRun() || Boolean(process.env.GEMINI_API_KEY),
    dryRun: isDryRun(),
    authConfigured: isFirebaseAdminConfigured,
    stripeConfigured: isStripeConfigured,
    vercelHosting: isVercelHosting()
  });
});
app2.get("/api/verse", (req, res) => {
  const translation = req.query.translation === "kjv" ? "kjv" : "web";
  const ref = typeof req.query.ref === "string" ? req.query.ref : "";
  if (!ref) {
    res.status(400).json({ found: false, reason: "missing_ref" });
    return;
  }
  const result = lookupReference(translation, ref);
  res.json(result);
});
app2.get("/api/progress", requireAuthUnlessDryRun, async (req, res) => {
  if (isDryRun()) {
    res.json({ ok: true, profile: dryRunGetOrCreateProfile(req.uid) });
    return;
  }
  try {
    const profile = await getOrCreateProfile(req.uid);
    res.json({ ok: true, profile });
  } catch (error) {
    console.error("Failed to load progress:", error);
    res.status(503).json({ ok: false, error: "progress_unavailable" });
  }
});
app2.post("/api/progress/complete", requireAuthUnlessDryRun, async (req, res) => {
  const lessonId = typeof req.body?.lessonId === "string" ? req.body.lessonId : "";
  const xpReward = Number(req.body?.xpReward) || 0;
  if (!lessonId) {
    res.status(400).json({ ok: false, error: "missing_lesson_id" });
    return;
  }
  if (isDryRun()) {
    res.json({ ok: true, profile: dryRunCompleteLesson(req.uid, lessonId, xpReward) });
    return;
  }
  try {
    const profile = await completeLesson(req.uid, lessonId, xpReward);
    res.json({ ok: true, profile });
  } catch (error) {
    console.error("Failed to record lesson completion:", error);
    res.status(503).json({ ok: false, error: "progress_unavailable" });
  }
});
app2.post("/api/stripe/create-checkout-session", requireAuthUnlessDryRun, async (req, res) => {
  try {
    const origin = `${req.protocol}://${req.get("host")}`;
    const url = await createCheckoutSession(req.uid, origin);
    res.json({ ok: true, url });
  } catch (error) {
    console.error("Failed to create checkout session:", error);
    res.status(503).json({ ok: false, error: "checkout_unavailable", message: error?.message });
  }
});
app2.post("/api/chat", requireAuthUnlessDryRun, async (req, res) => {
  const ip = req.ip ?? "unknown";
  if (isRateLimited(ip)) {
    res.status(429).json({ ok: false, reason: "rate_limited", text: RATE_LIMIT_MESSAGE });
    return;
  }
  if (req.body?.init) {
    const title = typeof req.body.title === "string" ? req.body.title : "";
    const verseRef = typeof req.body.verseRef === "string" ? req.body.verseRef : "";
    const openingPrompt = typeof req.body.openingPrompt === "string" ? req.body.openingPrompt : "";
    const translation = req.body.translation === "kjv" ? "kjv" : "web";
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
  const history = Array.isArray(req.body?.history) ? req.body.history : [];
  const message = typeof req.body?.message === "string" ? req.body.message : "";
  const isFreeChat = Boolean(req.body?.isFreeChat);
  if (!message.trim()) {
    res.status(400).json({ ok: false, reason: "empty_message", text: "Say something and I'll respond." });
    return;
  }
  if (isFreeChat) {
    try {
      const { allowed } = isDryRun() ? dryRunCheckAndIncrementFreeChat(req.uid) : await checkAndIncrementFreeChat(req.uid);
      if (!allowed) {
        res.status(402).json({
          ok: false,
          reason: "free_chat_limit",
          text: "You've used today's free conversation messages. Upgrade to Anchor Premium for unlimited free conversation."
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
  } catch (error) {
    console.error("Chat route failed before calling Gemini:", error);
    res.status(500).json({ ok: false, reason: "gemini_unavailable", text: "Anchor isn't configured correctly right now. Please try again later." });
  }
});
async function startServer() {
  const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app2.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = import_path2.default.join(process.cwd(), "dist");
    app2.use(import_express.default.static(distPath));
    app2.get("*", (_req, res) => {
      res.sendFile(import_path2.default.join(distPath, "index.html"));
    });
  }
  if (!process.env.VERCEL) {
    app2.listen(PORT, "0.0.0.0", () => {
      const hasKey = Boolean(process.env.GEMINI_API_KEY);
      const isDry = isDryRun();
      const geminiMode = hasKey ? "real Gemini calls" : "mock Gemini";
      console.log(`Anchor server running on port ${PORT} (${isDry ? "DRY RUN Auth" : "Firebase Auth"} mode \u2014 ${geminiMode})`);
      if (isVercelHosting()) {
        console.log("V_HOSTING is enabled \u2014 Preview Whitelist Gatekeeper active.");
      }
      if (!hasKey) {
        console.warn("GEMINI_API_KEY is not set \u2014 /api/health will report geminiConfigured: false.");
      }
      if (!isDry && !isFirebaseAdminConfigured) {
        console.warn("FIREBASE_SERVICE_ACCOUNT_JSON is not set \u2014 /api/chat and /api/progress will reject all requests until it's configured.");
      }
    });
  }
}
startServer();
var server_default = app2;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  app
});
//# sourceMappingURL=server.cjs.map
