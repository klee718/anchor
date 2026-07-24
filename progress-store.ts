// Server-side, Firestore-backed progress logic — the authoritative version
// of src/store.ts's pure functions. The client never writes Firestore
// directly; it calls /api/progress and /api/progress/complete, and the
// server computes XP/streak/premium state here.
import { getDb } from "./firebase-admin.js";

export const XP_PER_LEVEL = 100;

export interface UserProfile {
  xp: number;
  level: number;
  streak: number;
  lastActivityDate: string | null;
  completedLessons: string[];
  isPremium: boolean;
  stripeCustomerId: string | null;
  freeChatCount: number;
  freeChatDate: string | null;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterday(): string {
  return new Date(Date.now() - 86400000).toISOString().slice(0, 10);
}

function defaultProfile(): UserProfile {
  return {
    xp: 0,
    level: 1,
    streak: 0,
    lastActivityDate: null,
    completedLessons: [],
    isPremium: false,
    stripeCustomerId: null,
    freeChatCount: 0,
    freeChatDate: null,
  };
}

export async function getOrCreateProfile(uid: string): Promise<UserProfile> {
  const ref = getDb().collection("users").doc(uid);
  const snap = await ref.get();
  if (snap.exists) return { ...defaultProfile(), ...(snap.data() as Partial<UserProfile>) };
  const fresh = defaultProfile();
  await ref.set(fresh);
  return fresh;
}

/**
 * Records a lesson completion: computes XP/level/streak, writes the updated
 * /users/{uid} doc, and writes a /completed_lessons/{uid}_{lessonId} doc
 * (idempotent — completing the same lesson twice doesn't double-award XP).
 */
export async function completeLesson(uid: string, lessonId: string, xpReward: number): Promise<UserProfile> {
  const db = getDb();
  const userRef = db.collection("users").doc(uid);
  const completionRef = db.collection("completed_lessons").doc(`${uid}_${lessonId}`);

  return db.runTransaction(async (tx) => {
    const [userSnap, completionSnap] = await Promise.all([tx.get(userRef), tx.get(completionRef)]);
    const profile: UserProfile = userSnap.exists ? { ...defaultProfile(), ...(userSnap.data() as Partial<UserProfile>) } : defaultProfile();

    if (completionSnap.exists) {
      // Already completed — return current profile unchanged, don't re-award XP.
      return profile;
    }

    const t = today();
    const y = yesterday();
    let newStreak = profile.streak;
    if (profile.lastActivityDate !== t) {
      newStreak = profile.lastActivityDate === y ? profile.streak + 1 : 1;
    }

    const newXP = profile.xp + xpReward;
    const updated: UserProfile = {
      ...profile,
      xp: newXP,
      level: Math.floor(newXP / XP_PER_LEVEL) + 1,
      streak: newStreak,
      lastActivityDate: t,
      completedLessons: [...profile.completedLessons, lessonId],
    };

    tx.set(userRef, updated);
    tx.set(completionRef, { userId: uid, lessonId, completedAt: new Date().toISOString() });
    return updated;
  });
}

const FREE_CHAT_DAILY_LIMIT = 3;

/**
 * Enforces the free-tier daily free-chat message cap. Premium users always
 * pass. Returns { allowed: false } once a free user hits the daily limit —
 * the caller should show a paywall rather than calling Gemini.
 */
export async function checkAndIncrementFreeChat(uid: string): Promise<{ allowed: boolean; remaining: number }> {
  const db = getDb();
  const userRef = db.collection("users").doc(uid);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const profile: UserProfile = snap.exists ? { ...defaultProfile(), ...(snap.data() as Partial<UserProfile>) } : defaultProfile();

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

export async function setPremiumStatus(uid: string, isPremium: boolean, stripeCustomerId?: string): Promise<void> {
  const ref = getDb().collection("users").doc(uid);
  const update: Partial<UserProfile> = { isPremium };
  if (stripeCustomerId) update.stripeCustomerId = stripeCustomerId;
  await ref.set(update, { merge: true });
}

export async function findUidByStripeCustomerId(stripeCustomerId: string): Promise<string | null> {
  const snap = await getDb().collection("users").where("stripeCustomerId", "==", stripeCustomerId).limit(1).get();
  return snap.empty ? null : snap.docs[0].id;
}
