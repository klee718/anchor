// Login audit trail backed by Upstash Redis (REST API, no admin SDK/service
// account needed — just KV_REST_API_URL/KV_REST_API_TOKEN, auto-injected by
// the Vercel Upstash integration). Recording a login is best-effort: a Redis
// hiccup should never block a user from signing in, so callers should treat
// recordLogin as fire-and-forget and swallow its errors.
import { Redis } from "@upstash/redis";

let client: Redis | null = null;

function getRedis(): Redis {
  if (!client) client = Redis.fromEnv();
  return client;
}

export interface LoginEvent {
  email: string;
  ip: string;
  ts: string;
}

const RECENT_LOGINS_KEY = "login_events";
const MAX_RECENT_LOGINS = 500;

export async function recordLogin(email: string, ip: string): Promise<void> {
  const event: LoginEvent = { email, ip, ts: new Date().toISOString() };
  const redis = getRedis();
  await Promise.all([
    redis.lpush(RECENT_LOGINS_KEY, event),
    redis.ltrim(RECENT_LOGINS_KEY, 0, MAX_RECENT_LOGINS - 1),
    redis.hset(`user_login:${email}`, { lastLogin: event.ts, lastIp: ip }),
    redis.hincrby(`user_login:${email}`, "loginCount", 1),
  ]);
}

export async function getRecentLogins(limit = 100): Promise<LoginEvent[]> {
  const redis = getRedis();
  return redis.lrange<LoginEvent>(RECENT_LOGINS_KEY, 0, limit - 1);
}

export async function getUserLoginInfo(email: string): Promise<{ lastLogin: string; lastIp: string; loginCount: number } | null> {
  const redis = getRedis();
  const info = await redis.hgetall<{ lastLogin: string; lastIp: string; loginCount: number }>(`user_login:${email}`);
  return info ?? null;
}
