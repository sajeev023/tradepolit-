import { describe, it, expect } from "vitest";
import { ZodError, z } from "zod";
import {
  BaseError,
  AuthError,
  PrismaTransientError,
  ZodValidationError,
  UpstreamError,
  RateLimitError,
  StripeError,
  UnsupportedSymbolError,
  toErrorResponse,
  dispatchCaughtError,
} from "../typed-errors";

/**
 * Phase 6 — unified error hierarchy dispatch tests.
 *
 * `toErrorResponse` is the single dispatch point that renders a typed
 * `BaseError` into the `ApiError` envelope. The contract: each subclass maps to
 * exactly one (status, code) pair, Retry-After is surfaced only when the
 * subclass carries a retry window, and `instanceof` narrowing (not duck-typing)
 * decides the shape. This replaces the old `dispatchCaughtError(err?: any)`
 * type-safety black hole.
 */
describe("toErrorResponse — status & code dispatch per subclass", () => {
  it("AuthError → 401 AUTH_FAILED, no Retry-After, no details", async () => {
    const res = toErrorResponse(new AuthError());
    expect(res.status).toBe(401);
    expect(res.headers.get("Retry-After")).toBeNull();
    const body = await res.json();
    expect(body.error.code).toBe("AUTH_FAILED");
    expect(body.error.details).toBeUndefined();
  });

  it("PrismaTransientError → 503 DB_UNAVAILABLE with Retry-After header and layer detail", async () => {
    const res = toErrorResponse(new PrismaTransientError(30_000));
    expect(res.status).toBe(503);
    expect(res.headers.get("Retry-After")).toBe("30");
    const body = await res.json();
    expect(body.error.code).toBe("DB_UNAVAILABLE");
    expect(body.error.details).toEqual({ layer: "database", retryAfterMs: 30_000 });
  });

  it("ZodValidationError → 400 VALIDATION_ERROR with flattened issue list", async () => {
    const schema = z.object({ email: z.string().email() });
    const result = schema.safeParse({ email: "not-an-email" });
    if (result.success) throw new Error("expected parse failure");
    const res = toErrorResponse(new ZodValidationError(result.error));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(Array.isArray(body.error.details.issues)).toBe(true);
    expect(body.error.details.issues[0].path).toBe("email");
  });

  it("UpstreamError → 502 UPSTREAM_UNAVAILABLE with provider + optional Retry-After", async () => {
    const withRetry = toErrorResponse(new UpstreamError("binance", undefined, 5_000));
    expect(withRetry.status).toBe(502);
    expect(withRetry.headers.get("Retry-After")).toBe("5");
    const body = await withRetry.json();
    expect(body.error.code).toBe("UPSTREAM_UNAVAILABLE");
    expect(body.error.details.provider).toBe("binance");

    const noRetry = toErrorResponse(new UpstreamError("twelvedata"));
    expect(noRetry.headers.get("Retry-After")).toBeNull();
  });

  it("RateLimitError → 429 RATE_LIMITED, always carries Retry-After", async () => {
    const res = toErrorResponse(new RateLimitError(60_000));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
    const body = await res.json();
    expect(body.error.code).toBe("RATE_LIMITED");
    expect(body.error.details.retryAfterMs).toBe(60_000);
  });

  it("StripeError → 502 STRIPE_ERROR with stripe code detail", async () => {
    const res = toErrorResponse(new StripeError("Card declined", "card_declined"));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error.code).toBe("STRIPE_ERROR");
    expect(body.error.details).toEqual({ stripeCode: "card_declined" });
  });

  it("UnsupportedSymbolError → 422 UNSUPPORTED_SYMBOL (not retryable, no Retry-After)", async () => {
    const res = toErrorResponse(new UnsupportedSymbolError("FAKE/XYZ"));
    expect(res.status).toBe(422);
    expect(res.headers.get("Retry-After")).toBeNull();
    const body = await res.json();
    expect(body.error.code).toBe("UNSUPPORTED_SYMBOL");
    expect(body.error.details.symbol).toBe("FAKE/XYZ");
  });
});

describe("toErrorResponse — Retry-After rounding", () => {
  it("rounds sub-second retry windows up to 1s", async () => {
    const res = toErrorResponse(new RateLimitError(500));
    expect(res.headers.get("Retry-After")).toBe("1");
  });
});

describe("BaseError — instanceof narrowing", () => {
  it("every subclass is instanceof BaseError (the dispatch relies on this)", () => {
    expect(new AuthError()).toBeInstanceOf(BaseError);
    expect(new PrismaTransientError()).toBeInstanceOf(BaseError);
    expect(new ZodValidationError(new ZodError([]))).toBeInstanceOf(BaseError);
    expect(new UpstreamError("x")).toBeInstanceOf(BaseError);
    expect(new RateLimitError()).toBeInstanceOf(BaseError);
    expect(new StripeError("x")).toBeInstanceOf(BaseError);
    expect(new UnsupportedSymbolError("x")).toBeInstanceOf(BaseError);
  });

  it("preserves its own concrete subclass name after the prototype reset", () => {
    expect(new AuthError().name).toBe("AuthError");
    expect(new RateLimitError().name).toBe("RateLimitError");
    expect(new UnsupportedSymbolError("X").name).toBe("UnsupportedSymbolError");
  });
});

describe("dispatchCaughtError — typed hierarchy short-circuits duck-typing", () => {
  it("renders a thrown BaseError via toErrorResponse without re-classifying", async () => {
    const res = dispatchCaughtError("ignored", new UnsupportedSymbolError("FAKE"));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("UNSUPPORTED_SYMBOL");
  });

  it("maps a transient Prisma error code to 503 DB_UNAVAILABLE", async () => {
    const res = dispatchCaughtError("Failed", { code: "P1001" });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error.code).toBe("DB_UNAVAILABLE");
  });

  it("maps a 401 status-bearing error to AUTH_FAILED", async () => {
    const res = dispatchCaughtError("Failed", { status: 401 });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("AUTH_FAILED");
  });

  it("falls back to 500 INTERNAL_ERROR for unknown errors", async () => {
    const res = dispatchCaughtError("Failed to do thing", new Error("boom"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).toBe("Failed to do thing");
  });
});