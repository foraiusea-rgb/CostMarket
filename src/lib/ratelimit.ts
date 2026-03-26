/**
 * Rate Limiter — In-memory sliding window
 * 
 * Production: use Redis-backed rate limiting (e.g., upstash/ratelimit).
 * This provides per-IP protection against brute force and abuse.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 60_000);

export interface RateLimitConfig {
  /** Maximum requests in the window */
  limit: number;
  /** Window size in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit for a given key (typically IP + route).
 * Returns whether the request is allowed and remaining quota.
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    // New window
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: config.limit - 1, resetAt: now + windowMs };
  }

  if (entry.count >= config.limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: config.limit - entry.count, resetAt: entry.resetAt };
}

/** Pre-configured rate limits for different endpoints */
export const RATE_LIMITS = {
  auth: { limit: 5, windowSeconds: 60 },        // 5 auth attempts per minute
  trade: { limit: 30, windowSeconds: 60 },       // 30 trades per minute
  api: { limit: 120, windowSeconds: 60 },        // 120 general API calls per minute
  admin: { limit: 60, windowSeconds: 60 },       // 60 admin actions per minute
} as const;

/**
 * Extract client IP from request headers.
 * In production behind a proxy, use X-Forwarded-For.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}
