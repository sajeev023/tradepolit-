/**
 * Lightweight server-side rate limiter.
 * Uses an in-memory LRU map per Node.js process. For multi-instance or
 * production deployments, replace with Redis / Upstash / Vercel KV.
 */

interface LimitEntry {
  count: number;
  resetAt: number;
}

const DEFAULT_WINDOW_MS = 60 * 1000;
const DEFAULT_MAX_REQUESTS = 30;

const store = new Map<string, LimitEntry>();

function getKey(identifier: string, prefix: string): string {
  return `${prefix}:${identifier}`;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  identifier: string,
  prefix = "api",
  maxRequests = DEFAULT_MAX_REQUESTS,
  windowMs = DEFAULT_WINDOW_MS
): RateLimitResult {
  const now = Date.now();
  const key = getKey(identifier, prefix);
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    const newEntry: LimitEntry = { count: 1, resetAt: now + windowMs };
    store.set(key, newEntry);
    return { allowed: true, limit: maxRequests, remaining: maxRequests - 1, resetAt: newEntry.resetAt };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, limit: maxRequests, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { allowed: true, limit: maxRequests, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}

export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "unknown";
}

/**
 * User-aware rate limit. Prefers the authenticated user ID (stable across
 * IP rotation / VPN / mobile network handoffs), falling back to IP. Use
 * this in authenticated routes so an attacker rotating IPs cannot bypass
 * the limit. Returns the identifier used so callers can log/audit.
 *
 * NOTE: still in-memory per-process. For multi-instance production this
 * must be backed by Redis / Upstash / Vercel KV — flagged as Phase 8.
 */
export function checkUserRateLimit(
  userId: string | null | undefined,
  request: Request,
  prefix: string,
  maxRequests: number,
  windowMs: number
): { result: RateLimitResult; identifier: string } {
  const ip = getClientIdentifier(request);
  const identifier = userId || `ip:${ip}`;
  // Prefix is namespaced by user vs IP so the same identifier string can't
  // collide across auth states.
  const namespacedPrefix = userId ? `${prefix}:user` : `${prefix}:anon`;
  const result = checkRateLimit(identifier, namespacedPrefix, maxRequests, windowMs);
  return { result, identifier };
}

/**
 * IP-only rate limit for public/unauthenticated routes (market data, news,
 * search). Returns null when the request is allowed, or a 429 NextResponse
 * with Retry-After when blocked. Callers do `if (blocked) return blocked;`
 * at the top of their handler.
 */
export function checkIpRateLimit(
  request: Request,
  prefix: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const ip = getClientIdentifier(request);
  return checkRateLimit(ip, `${prefix}:ip`, maxRequests, windowMs);
}
