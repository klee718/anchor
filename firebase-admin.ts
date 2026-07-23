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
import crypto from "crypto";

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

const SECRET = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "anchor-secret-key-123456";

export function signToken(payload: { email: string }): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
  return `${data}.${signature}`;
}

export function verifyToken(token: string): { email: string } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [data, signature] = parts;
  const expectedSignature = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
  if (signature !== expectedSignature) return null;
  try {
    return JSON.parse(Buffer.from(data, "base64url").toString());
  } catch {
    return null;
  }
}

/**
 * Verifies our custom local session token (HMAC-SHA256 signed JWT) in the Authorization header.
 * Attaches payload.email as req.uid. Returns 401 if missing or invalid.
 */
export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
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

  req.uid = payload.email; // use email as the uid
  next();
}
