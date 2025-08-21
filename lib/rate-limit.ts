// Simple in-memory rate limiter (per process) for low-volume routes like registration.
// NOT suitable for multi-instance or serverless scaling; replace with Redis or Upstash in production.

type Entry = { count: number; first: number };
const buckets: Map<string, Entry> = new Map();

// Defaults: 5 attempts per 10 minutes per IP+route key
const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 5;

export interface RateLimitResult {
  limited: boolean;
  remaining: number;
  reset: number; // epoch ms when window resets
}

export function checkRateLimit(key: string, limit = LIMIT, windowMs = WINDOW_MS): RateLimitResult {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry) {
    buckets.set(key, { count: 1, first: now });
    return { limited: false, remaining: limit - 1, reset: now + windowMs };
  }
  if (now - entry.first > windowMs) {
    // reset window
    entry.count = 1;
    entry.first = now;
    return { limited: false, remaining: limit - 1, reset: now + windowMs };
  }
  entry.count += 1;
  const limited = entry.count > limit;
  return { limited, remaining: Math.max(0, limit - entry.count), reset: entry.first + windowMs };
}

// Helper to derive client IP from headers (best-effort)
export function extractClientIP(headers: Headers): string {
  const xff = headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}
