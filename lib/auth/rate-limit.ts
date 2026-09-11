type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function prune(now: number) {
  if (buckets.size < 2_000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Fixed-window rate limiter (in-memory per process).
 * Good enough for single-instance / serverless warm instances;
 * combine with Turnstile for production.
 */
export function consumeRateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
}): { ok: true; remaining: number } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  prune(now);
  const current = buckets.get(params.key);
  if (!current || current.resetAt <= now) {
    buckets.set(params.key, { count: 1, resetAt: now + params.windowMs });
    return { ok: true, remaining: params.limit - 1 };
  }
  if (current.count >= params.limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }
  current.count += 1;
  return { ok: true, remaining: params.limit - current.count };
}

/** Convenience wrapper used by public endpoints. */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfterSec?: number } {
  const result = consumeRateLimit({ key, limit, windowMs });
  if (result.ok) return { ok: true };
  return { ok: false, retryAfterSec: result.retryAfterSec };
}

/** Clears all buckets — useful after deploys / local recovery. */
export function resetRateLimits() {
  buckets.clear();
}

export function clientIpFromRequest(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

const PROD_LIMITS = {
  login: { limit: 20, windowMs: 15 * 60_000 },
  signup: { limit: 20, windowMs: 60 * 60_000 },
  forgot: { limit: 8, windowMs: 60 * 60_000 },
  demo: { limit: 30, windowMs: 60 * 60_000 },
  reset: { limit: 15, windowMs: 60 * 60_000 },
} as const;

const DEV_LIMITS = {
  login: { limit: 200, windowMs: 15 * 60_000 },
  signup: { limit: 100, windowMs: 60 * 60_000 },
  forgot: { limit: 50, windowMs: 60 * 60_000 },
  demo: { limit: 100, windowMs: 60 * 60_000 },
  reset: { limit: 50, windowMs: 60 * 60_000 },
} as const;

export function getAuthLimits() {
  return process.env.NODE_ENV === "production" ? PROD_LIMITS : DEV_LIMITS;
}

/** @deprecated use getAuthLimits() */
export const AUTH_LIMITS = PROD_LIMITS;
