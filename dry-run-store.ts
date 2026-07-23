// In-memory progress store used only when DRY_RUN=true. Mirrors
// progress-store.ts's Firestore-backed logic exactly, so the dry-run demo
// stays fully self-contained (no Gemini key, no Firebase project, no
// Firestore) — this is the whole point of dry-run mode. State lives only
// for the life of the dev server process; that's fine, it's a demo aid,
// not a real persistence layer.
import { XP_PER_LEVEL, type UserProfile } from "./progress-store";

const profiles = new Map<string, UserProfile>();

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

export function dryRunGetOrCreateProfile(uid: string): UserProfile {
  let profile = profiles.get(uid);
  if (!profile) {
    profile = defaultProfile();
    profiles.set(uid, profile);
  }
  return profile;
}

export function dryRunCompleteLesson(uid: string, lessonId: string, xpReward: number): UserProfile {
  const profile = dryRunGetOrCreateProfile(uid);
  if (profile.completedLessons.includes(lessonId)) return profile;

  const t = today();
  const y = yesterday();
  const newStreak = profile.lastActivityDate === t ? profile.streak : profile.lastActivityDate === y ? profile.streak + 1 : 1;

  const newXP = profile.xp + xpReward;
  const updated: UserProfile = {
    ...profile,
    xp: newXP,
    level: Math.floor(newXP / XP_PER_LEVEL) + 1,
    streak: newStreak,
    lastActivityDate: t,
    completedLessons: [...profile.completedLessons, lessonId],
  };
  profiles.set(uid, updated);
  return updated;
}

const FREE_CHAT_DAILY_LIMIT = 3;

export function dryRunCheckAndIncrementFreeChat(uid: string): { allowed: boolean; remaining: number } {
  const profile = dryRunGetOrCreateProfile(uid);
  if (profile.isPremium) return { allowed: true, remaining: Infinity };

  const t = today();
  const count = profile.freeChatDate === t ? profile.freeChatCount : 0;
  if (count >= FREE_CHAT_DAILY_LIMIT) return { allowed: false, remaining: 0 };

  profiles.set(uid, { ...profile, freeChatCount: count + 1, freeChatDate: t });
  return { allowed: true, remaining: FREE_CHAT_DAILY_LIMIT - count - 1 };
}
