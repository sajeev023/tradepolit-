import { NextResponse } from "next/server";
import type { ApiError, ErrorCode } from "./types";

function jsonError(
  code: ErrorCode,
  message: string,
  status: number,
  details?: Record<string, unknown>,
  headers?: HeadersInit
): NextResponse<ApiError> {
  return NextResponse.json(
    { error: { code, message, details } },
    { status, headers }
  );
}

/**
 * Thrown by the market-data layer when a caller requests a symbol that is not
 * in the supported instrument registry (src/lib/supported-symbols.ts). This is
 * distinct from a supported-but-provider-down symbol, which legitimately falls
 * back to clearly-labelled SIMULATED data. An *unsupported* symbol must never
 * silently receive fabricated prices — for a trading app that is the most
 * dangerous defect, so the data layer fails fast and routes map this to 422.
 */
export class UnsupportedSymbolError extends Error {
  readonly symbol: string;
  readonly status = 422;
  constructor(symbol: string) {
    super(`Symbol "${symbol}" is not supported. Use a symbol from the supported instrument registry.`);
    this.name = "UnsupportedSymbolError";
    this.symbol = symbol;
  }
}

/**
 * 422 — the requested symbol is not in the supported instrument registry.
 * The client should treat this as a permanent client error (not retryable).
 */
export function unsupportedSymbolError(symbol: string) {
  return jsonError(
    "UNSUPPORTED_SYMBOL",
    `"${symbol}" is not a supported instrument. Choose from the available markets in the watchlist.`,
    422,
    { symbol }
  );
}

/**
 * 503 — database is unreachable. Include retryAfterMs so the client can
 * implement exponential backoff and surface a "we'll retry in Ns" toast
 * instead of a generic failure.
 */
export function dbError(retryAfterMs = 30_000, details?: Record<string, unknown>) {
  return jsonError(
    "DB_UNAVAILABLE",
    "We're having brief trouble reaching our database. Your action will retry automatically.",
    503,
    { layer: "database", retryAfterMs, ...details },
    { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) }
  );
}

/**
 * 502 — an upstream provider (Binance, TwelveData, Groq, NVIDIA, OpenAI,
 * Stripe, Finnhub, NewsAPI, Supabase) is unavailable. Use `provider` to
 * distinguish failures in logs and on the client.
 */
export function upstreamError(
  provider: string,
  message?: string,
  retryAfterMs?: number,
  details?: Record<string, unknown>
) {
  const headers: Record<string, string> = {};
  if (retryAfterMs) headers["Retry-After"] = String(Math.ceil(retryAfterMs / 1000));
  return jsonError(
    "UPSTREAM_UNAVAILABLE",
    message || `${provider} is temporarily unavailable. Falling back where possible.`,
    502,
    { provider, retryAfterMs, ...details },
    Object.keys(headers).length ? headers : undefined
  );
}

/**
 * 503 — market data is stale but a (clearly-labelled) simulated or cached
 * payload is included so the client can still render. The details field
 * carries `dataQuality` so the frontend can show a banner.
 */
export function marketDataStaleError(symbol: string, details?: Record<string, unknown>) {
  return jsonError(
    "MARKET_DATA_STALE",
    `Live market data for ${symbol} is momentarily delayed. Showing cached values.`,
    503,
    { symbol, dataQuality: "cached", ...details }
  );
}

/**
 * 429 — rate limited. Always include Retry-After so the client can
 * schedule the next request instead of failing silently.
 */
export function rateLimitedError(retryAfterMs = 60_000, message?: string) {
  return jsonError(
    "RATE_LIMITED",
    message || "Too many requests. Please slow down.",
    429,
    { retryAfterMs },
    { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) }
  );
}

/**
 * 401 — authentication failed (session expired, invalid token, missing user).
 */
export function authFailedError(message = "Your session has expired. Please sign in again.") {
  return jsonError("AUTH_FAILED", message, 401);
}

/**
 * 503 — partial upstream failure: one provider failed but a fallback
 * succeeded. Useful for AI routes where e.g. Groq failed but NVIDIA won.
 */
export function partialUpstreamError(provider: string, message: string, details?: Record<string, unknown>) {
  return jsonError(
    "UPSTREAM_PARTIAL",
    message,
    200, // 200 because the request succeeded; details carry the warning
    { degradedBy: provider, ...details }
  );
}

/**
 * Returns true if the given error looks like a transient Prisma
 * connectivity error that should trigger a dbError response rather
 * than a generic 500.
 */
export function isPrismaTransientError(err: any): boolean {
  const code = err?.code;
  if (!code) return false;
  // P1001 connection lost, P1002 timed out, P1003 cannot reach, P1008 crashed,
  // P1010 connection closed, P2024 transaction cancelled, P2034 race
  return [
    "P1001", "P1002", "P1003", "P1004", "P1006", "P1007", "P1008", "P1009", "P1010",
    "P2024", "P2034",
  ].includes(code);
}

/**
 * Dispatch the right typed response from a caught error. Drop-in
 * replacement for `internalError("Failed to X")` in route catch blocks.
 *
 * - Prisma transient → dbError (503 with Retry-After)
 * - 401/403 in the error status → authFailedError (401)
 * - Otherwise → internalError (500) with the supplied message
 *
 * Use this in any route whose outer catch currently lumps DB outages,
 * auth failures, and programmer bugs into the same generic 500.
 */
export function dispatchCaughtError(message: string, err?: any) {
  if (isPrismaTransientError(err)) {
    return dbError(30_000);
  }
  // Unsupported symbol from the market-data layer → 422 (not a 500).
  if (err instanceof UnsupportedSymbolError) {
    return unsupportedSymbolError(err.symbol);
  }
  const status = err?.status ?? err?.statusCode;
  if (status === 401 || status === 403) {
    return authFailedError();
  }
  return jsonError("INTERNAL_ERROR", message, 500);
}