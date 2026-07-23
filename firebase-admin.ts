// Server-side Firebase Admin: verifies client ID tokens and gives route
// handlers access to Firestore. Requires a real service account — see
// .env.example for FIREBASE_SERVICE_ACCOUNT_JSON. Until that's set, every
// verification attempt fails with a clear "not configured" error rather
// than silently accepting unverified requests.
//
// dotenv.config() is called here (not just in server.ts) because in ESM all
// static imports are hoisted before any module-level code runs — so calling
// it only in server.ts means the env vars are not loaded yet when this
// module's isFirebaseAdminConfigured constant is evaluated.
import dotenv from "dotenv";
dotenv.config();

import { initializeApp, cert, getApps, type App } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import type { Request, Response, NextFunction } from "express";

let app: App | null = null;

export const isFirebaseAdminConfigured = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

function getAdminApp(): App {
  if (!isFirebaseAdminConfigured) {
    throw new Error(
      "Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON in .env (the full service account JSON, minified to one line) — see .env.example."
    );
  }
  if (getApps().length > 0) return getApps()[0];

  // dotenvx (used here) expands \n escape sequences to real newline characters
  // even in unquoted .env values. Real newlines inside a JSON string value are
  // invalid — JSON.parse throws "Bad control character". Escape them back to
  // the \n escape sequence so JSON.parse (and then firebase-admin's cert())
  // can handle the PEM private key correctly.
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON!.replace(/\n/g, "\\n");
  const serviceAccount = JSON.parse(rawJson);
  app = initializeApp({ credential: cert(serviceAccount) });
  return app;
}

export function getAdminAuthInstance() {
  return getAdminAuth(getAdminApp());
}

export function getDb(): Firestore {
  return getFirestore(getAdminApp());
}

export interface AuthedRequest extends Request {
  uid?: string;
}

/**
 * Verifies the Firebase ID token in the Authorization header (Bearer <token>)
 * and attaches req.uid. Returns 401 if missing/invalid, 503 if Firebase
 * Admin itself isn't configured (a deployment problem, not a client one).
 */
export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!isFirebaseAdminConfigured) {
    res.status(503).json({ error: "auth_not_configured", message: "Server auth is not set up yet." });
    return;
  }

  const header = req.headers.authorization ?? "";
  const match = /^Bearer (.+)$/.exec(header);
  if (!match) {
    res.status(401).json({ error: "missing_token" });
    return;
  }

  try {
    const decoded = await getAdminAuth(getAdminApp()).verifyIdToken(match[1]);
    req.uid = decoded.uid;
    next();
  } catch (error) {
    console.error("Token verification failed:", error);
    res.status(401).json({ error: "invalid_token" });
  }
}
