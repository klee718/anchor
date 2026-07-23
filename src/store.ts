import { getIdToken } from "./firebase";

export interface AnchorProgress {
  xp: number;
  level: number;
  streak: number;
  lastActivityDate: string | null;
  completedLessons: string[];
  isPremium: boolean;
}

export const XP_PER_LEVEL = 100;

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Fetches (or lazily creates) the signed-in user's progress from Firestore
 * via the server. In DRY_RUN mode the server serves this from an in-memory
 * store instead — no Firebase project needed either way.
 */
export async function fetchProgress(): Promise<AnchorProgress> {
  const res = await fetch("/api/progress", { headers: await authHeaders() });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error ?? "progress_unavailable");
  return data.profile;
}

/**
 * Records a lesson completion server-side (XP/level/streak are computed
 * there, not on the client) and returns the updated profile.
 */
export async function completeLessonRemote(lessonId: string, xpReward: number): Promise<AnchorProgress> {
  const res = await fetch("/api/progress/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({ lessonId, xpReward }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error ?? "progress_unavailable");
  return data.profile;
}

export function xpInCurrentLevel(p: AnchorProgress): number {
  return p.xp % XP_PER_LEVEL;
}
