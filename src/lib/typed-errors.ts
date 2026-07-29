import { NextResponse } from "next/server";
import { ZodError } from "zod";
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

// ─── Unified error hierarchy ─────────────────────────────────────────────────
// Routes throw typed `BaseError` subclasses; the route wrapper (or
// `dispatchCaughtError`) catches them and renders the ApiError envelope via
// `toErrorResponse`. This replaces the prior `dispatchCaughtError(err?: any)`
// type-safety black hole where every caught value was `any` and the error code
// was decided by sniffing duck-typed fields. With `instanceof` narrowing the
// compiler enforces that every error maps to exactly one envelope shape.

export abstract class BaseError extends Error {
  /** Stable machine-readable code surfaced to the client as `error.code`. */
  abstract readonly code: ErrorCode;
  /** HTTP status the wrapper maps this error to. */
  abstract readonly status: number;
  /** Extra fields for `error.details`; omit when there is nothing to add. */
  abstract details(): Record<string, unknown> | undefined;
  /** Retry-After header value in ms; subclasses override to surface it. */
  retryAfterMs(): number | undefined { return undefined; }
  constructor(message: string) {
    super(message);
    // Restore the prototype chain after the Error subclass capture so
    // `instanceof` works reliably under targeting older TS lib configs.
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 401 — authentication failed (session expired, invalid token, missing user). */
export class AuthError extends BaseError {
  readonly code: ErrorCode = "AUTH_FAILED";
  readonly status = 401;
  details() { return undefined; }
  constructor(message = "Your session has expired. Please sign in again.") {
    super(message);
  }
}

/** 503 — a transient Prisma connectivity error (P1001/P1002/...). */
export class PrismaTransientError extends BaseError {
  readonly code: ErrorCode = "DB_UNAVAILABLE";
  readonly status = 503;
  readonly retry: number;
  constructor(retryAfterMs = 30_000) {
    super("We're having brief trouble reaching our database. Your action will retry automatically.");
    this.retry = retryAfterMs;
  }
  details() { return { layer: "database", retryAfterMs: this.retry }; }
  retryAfterMs() { return this.retry; }
}

/** 400 — request body/query failed Zod validation. */
export class ZodValidationError extends BaseError {
  readonly code: ErrorCode = "VALIDATION_ERROR";
  readonly status = 400;
  private readonly issues: Array<{ path: string; message: string }>;
  constructor(error: ZodError) {
    super("Validation failed");
    this.issues = error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
  }
  details() { return { issues: this.issues }; }
}

/** 502 — an upstream provider (Binance, TwelveData, Groq, Stripe, ...) is unavailable. */
export class UpstreamError extends BaseError {
  readonly code: ErrorCode = "UPSTREAM_UNAVAILABLE";
  readonly status = 502;
  readonly provider: string;
  private readonly retry?: number;
  constructor(provider: string, message?: string, retryAfterMs?: number) {
    super(message || `${provider} is temporarily unavailable. Falling back where possible.`);
    this.provider = provider;
    this.retry = retryAfterMs;
  }
  details() { return { provider: this.provider, retryAfterMs: this.retry }; }
  retryAfterMs() { return this.retry; }
}

/** 429 — rate limited. Always carries Retry-After. */
export class RateLimitError extends BaseError {
  readonly code: ErrorCode = "RATE_LIMITED";
  readonly status = 429;
  readonly retry: number;
  constructor(retryAfterMs = 60_000, message?: string) {
    super(message || "Too many requests. Please slow down.");
    this.retry = retryAfterMs;
  }
  details() { return { retryAfterMs: this.retry }; }
  retryAfterMs() { return this.retry; }
}

/** 502 — a Stripe API call failed. Carries the Stripe error code when present. */
export class StripeError extends BaseError {
  readonly code: ErrorCode = "STRIPE_ERROR";
  readonly status = 502;
  readonly stripeCode?: string;
  constructor(message: string, stripeCode?: string) {
    super(message);
    this.stripeCode = stripeCode;
  }
  details() { return { stripeCode: this.stripeCode }; }
}

/**
 * Render a `BaseError` (or subclass) into the ApiError envelope. The single
 * dispatch point for the error hierarchy — routes throw, the wrapper catches
 * and calls this. Narrowing is exhaustive over the hierarchy, so adding a new
 * error class produces a compile-time reminder to map it here.
 */
export function toErrorResponse(err: BaseError): NextResponse<ApiError> {
  const headers: Record<string, string> = {};
  const retry = err.retryAfterMs();
  if (retry !== undefined) {
    headers["Retry-After"] = String(Math.ceil(retry / 1000));
  }
  return jsonError(err.code, err.message, err.status, err.details(), Object.keys(headers).length ? headers : undefined);
}

/**
 * Thrown by the market-data layer when a caller requests a symbol that is not
 * in the supported instrument registry (src/lib/supported-symbols.ts). This is
 * distinct from a supported-but-provider-down symbol, which legitimately falls
 * back to clearly-labelled SIMULATED data. An *unsupported* symbol must never
 * silently receive fabricated prices — for a trading app that is the most
 * dangerous defect, so the data layer fails fast and routes map this to 422.
 */
export class UnsupportedSymbolError extends BaseError {
  readonly code: ErrorCode = "UNSUPPORTED_SYMBOL";
  readonly status = 422;
  readonly symbol: string;
  constructor(symbol: string) {
    super(`"${symbol}" is not a supported instrument. Choose from the available markets in the watchlist.`);
    this.symbol = symbol;
  }
  details() { return { symbol: this.symbol }; }
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
export function isPrismaTransientError(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
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
 * Typed `BaseError` subclasses (thrown by the new route wrapper and migrated
 * routes) render directly via `toErrorResponse`. Legacy non-typed errors are
 * still classified by duck-typing so existing unmigrated routes keep working:
 *
 * - Prisma transient → dbError (503 with Retry-After)
 * - 401/403 in the error status → authFailedError (401)
 * - Otherwise → internalError (500) with the supplied message
 *
 * Use this in any route whose outer catch currently lumps DB outages,
 * auth failures, and programmer bugs into the same generic 500.
 */
export function dispatchCaughtError(message: string, err?: unknown) {
  // Typed hierarchy: render via the single dispatch point.
  if (err instanceof BaseError) {
    return toErrorResponse(err);
  }
  if (isPrismaTransientError(err)) {
    return toErrorResponse(new PrismaTransientError(30_000));
  }
  const status = (err as { status?: number; statusCode?: number })?.status
    ?? (err as { statusCode?: number })?.statusCode;
  if (status === 401 || status === 403) {
    return toErrorResponse(new AuthError());
  }
  return jsonError("INTERNAL_ERROR", message, 500);
}