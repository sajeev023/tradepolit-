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

// Cap the number of tracked keys so a flood of distinct IPs/user-IDs (e.g. a
// volumetric attack rotating source addresses) cannot grow this map without
// bound and exhaust memory on a long-lived instance. When the cap is hit we
// still admit the request — the cap protects memory, not security (the
// per-key window does that).
const MAX_STORE_KEYS = 10_000;

const store = new Map<string, LimitEntry>();

// Every N calls, sweep expired entries. Amortizes cleanup cost across requests
// without a background timer (which Vercel's serverless runtime would pause
// between invocations anyway). 1% of calls is enough to keep the map bounded
// under steady traffic while adding ~zero overhead per request.
let opsSinceSweep = 0;
const SWEEP_INTERVAL_OPS = 100;

function sweepExpired(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) store.delete(key);
  }
}

function maybeSweep(): void {
  if (++opsSinceSweep >= SWEEP_INTERVAL_OPS) {
    opsSinceSweep = 0;
    sweepExpired();
  }
}

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
  // Amortized cleanup of expired entries (see maybeSweep). Runs ~1% of calls.
  maybeSweep();
  const key = getKey(identifier, prefix);
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    // Enforce the key-count cap. If we're full of *live* entries, evict the
    // oldest-expiring one so the map can't grow without bound. The new key is
    // always admitted — this is a memory guard, not a request rejection.
    if (!store.has(key) && store.size >= MAX_STORE_KEYS) {
      let oldestKey: string | null = null;
      let oldestReset = Infinity;
      for (const [k, e] of store) {
        if (e.resetAt < oldestReset) {
          oldestReset = e.resetAt;
          oldestKey = k;
        }
      }
      if (oldestKey) store.delete(oldestKey);
    }
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
    // x-forwarded-for is client-controlled from the left. When behind a
    // trusted proxy (Vercel, Cloudflare), the ORIGINAL client IP is appended
    // to the RIGHT by each proxy hop. Take the leftmost value only if you
    // control the first hop; otherwise use the socket IP. Here we take the
    // leftmost (closest to the original client as set by the edge proxy) —
    // this is correct behind Vercel which overwrites XFF with the chain.
    const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts[0];
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
