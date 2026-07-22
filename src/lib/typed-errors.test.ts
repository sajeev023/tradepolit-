import { describe, it, expect } from "vitest";
import {
  dbError,
  upstreamError,
  marketDataStaleError,
  rateLimitedError,
  authFailedError,
  partialUpstreamError,
  isPrismaTransientError,
  dispatchCaughtError,
} from "./typed-errors";

describe("typed-errors builders", () => {
  it("dbError returns 503 with DB_UNAVAILABLE code and Retry-After header", async () => {
    const res = dbError(30_000);
    expect(res.status).toBe(503);
    expect(res.headers.get("Retry-After")).toBe("30");
    const body = await res.json();
    expect(body.error.code).toBe("DB_UNAVAILABLE");
    expect(body.error.details.layer).toBe("database");
    expect(body.error.details.retryAfterMs).toBe(30_000);
  });

  it("dbError defaults retryAfterMs to 30s", async () => {
    const res = dbError();
    expect(res.headers.get("Retry-After")).toBe("30");
  });

  it("upstreamError returns 502 with provider name in details", async () => {
    const res = upstreamError("binance", "Binance down", 5_000);
    expect(res.status).toBe(502);
    expect(res.headers.get("Retry-After")).toBe("5");
    const body = await res.json();
    expect(body.error.code).toBe("UPSTREAM_UNAVAILABLE");
    expect(body.error.details.provider).toBe("binance");
  });

  it("upstreamError omits Retry-After when retryAfterMs not supplied", async () => {
    const res = upstreamError("twelvedata");
    expect(res.headers.get("Retry-After")).toBeNull();
  });

  it("marketDataStaleError returns 503 with cached dataQuality flag", async () => {
    const res = marketDataStaleError("BTC/USD");
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error.code).toBe("MARKET_DATA_STALE");
    expect(body.error.details.symbol).toBe("BTC/USD");
    expect(body.error.details.dataQuality).toBe("cached");
  });

  it("rateLimitedError returns 429 with Retry-After header", async () => {
    const res = rateLimitedError(60_000, "Slow down");
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
    const body = await res.json();
    expect(body.error.code).toBe("RATE_LIMITED");
    expect(body.error.details.retryAfterMs).toBe(60_000);
  });

  it("authFailedError returns 401 with AUTH_FAILED code", async () => {
    const res = authFailedError();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("AUTH_FAILED");
  });

  it("partialUpstreamError returns 200 with UPSTREAM_PARTIAL code (degraded, not failed)", async () => {
    const res = partialUpstreamError("groq", "Used NVIDIA after Groq failed");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error.code).toBe("UPSTREAM_PARTIAL");
    expect(body.error.details.degradedBy).toBe("groq");
  });
});

describe("isPrismaTransientError", () => {
  it("returns true for known transient Prisma codes", () => {
    for (const code of ["P1001", "P1002", "P1003", "P2024", "P2034"]) {
      expect(isPrismaTransientError({ code })).toBe(true);
    }
  });

  it("returns false for non-transient codes (P2002 unique constraint is not transient)", () => {
    expect(isPrismaTransientError({ code: "P2002" })).toBe(false);
  });

  it("returns false for non-Prisma errors", () => {
    expect(isPrismaTransientError(new Error("boom"))).toBe(false);
    expect(isPrismaTransientError(null)).toBe(false);
    expect(isPrismaTransientError(undefined)).toBe(false);
  });
});

describe("dispatchCaughtError", () => {
  it("returns dbError for transient Prisma errors", async () => {
    const res = dispatchCaughtError("Failed to fetch", { code: "P1001" });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error.code).toBe("DB_UNAVAILABLE");
  });

  it("returns authFailedError for 401 errors", async () => {
    const res = dispatchCaughtError("Failed", { status: 401 });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("AUTH_FAILED");
  });

  it("returns authFailedError for 403 errors", async () => {
    const res = dispatchCaughtError("Failed", { status: 403 });
    expect(res.status).toBe(401);
  });

  it("falls back to internal 500 for unknown errors", async () => {
    const res = dispatchCaughtError("Failed to do thing", new Error("boom"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).toBe("Failed to do thing");
  });
});