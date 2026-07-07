import "server-only";

/**
 * Lightweight in-process fixed-window rate limiter.
 *
 * Deliberately dependency-free (no Redis) so it works on a single Node
 * instance out of the box. On a multi-instance / serverless deployment each
 * instance keeps its own counters, so the effective limit is per-instance —
 * good enough as a brute-force speed-bump, but swap `hit()` for an Upstash
 * Redis INCR+EXPIRE if you need a globally-consistent limit. The public API
 * (`rateLimit`) is intentionally the same shape either way.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

// Keyed by `${name}:${identifier}`. Survives across requests within one
// process; cleared on cold start (acceptable for a speed-bump).
const buckets = new Map<string, Bucket>();

// Opportunistic sweep so the map can't grow unbounded on a long-lived process.
let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  /** How many requests remain in the current window. */
  remaining: number;
  /** Seconds until the window resets (0 when not limited). */
  retryAfterSeconds: number;
}

export interface RateLimitRule {
  /** Namespace, e.g. "login". */
  name: string;
  /** Max requests allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

/** Predefined rules for the app's sensitive endpoints. */
export const RATE_LIMITS = {
  login: { name: "login", limit: 5, windowMs: 15 * 60_000 },
  register: { name: "register", limit: 3, windowMs: 60 * 60_000 },
  passwordReset: { name: "pwreset", limit: 5, windowMs: 60 * 60_000 },
  mediaSignature: { name: "media", limit: 30, windowMs: 60 * 60_000 },
  teamInvite: { name: "team_invite", limit: 20, windowMs: 24 * 60 * 60_000 },
} as const satisfies Record<string, RateLimitRule>;

/**
 * Records one hit against `rule` for `identifier` (e.g. an IP or user id) and
 * reports whether it is within the limit. Fail-open on internal error.
 */
export function rateLimit(rule: RateLimitRule, identifier: string): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const key = `${rule.name}:${identifier}`;
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + rule.windowMs });
    return { ok: true, remaining: rule.limit - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= rule.limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return {
    ok: true,
    remaining: rule.limit - existing.count,
    retryAfterSeconds: 0,
  };
}
