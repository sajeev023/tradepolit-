import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { User } from "@prisma/client";

// Mock the auth + rate-limit seams so the wrapper's orchestration is tested in
// isolation, not the Supabase/LRU internals.
vi.mock("../auth", () => ({
  getAuthenticatedUser: vi.fn(),
}));
vi.mock("../rate-limit", () => ({
  checkUserRateLimit: vi.fn(),
}));

const { createHandler, createPublicHandler } = await import("../route-handler");
const { getAuthenticatedUser } = await import("../auth");
const { checkUserRateLimit } = await import("../rate-limit");
const { unauthorizedError } = await import("../api-helpers");

const mockUser = { id: "user-1", email: "u@test.com" } as unknown as User;

function req(url: string, init?: RequestInit): NextRequest {
  // Next's NextRequest uses its own RequestInit (signal is non-nullable); cast
  // at the library seam rather than threading Next's type through every call.
  return new NextRequest(new URL(url, "http://localhost:3000"), init as ConstructorParameters<typeof NextRequest>[1]);
}

describe("createHandler — auth gate", () => {
  beforeEach(() => {
    vi.mocked(getAuthenticatedUser).mockReset();
    vi.mocked(checkUserRateLimit).mockReset();
    vi.mocked(checkUserRateLimit).mockReturnValue({
      result: { allowed: true, limit: 60, remaining: 59, resetAt: Date.now() + 60_000 },
      identifier: "user-1",
    });
  });

  it("returns 401 UNAUTHORIZED when no user is authenticated", async () => {
    // The real getAuthenticatedUser returns a non-null error response when no
    // user is present; mirror that shape so the mock matches the return type.
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: null, error: unauthorizedError() });
    const handler = createHandler({
      handler: async () => NextResponse.json({ ok: true }),
    });
    const res = await handler(req("/api/v1/x"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("hands the handler a non-null user when authenticated", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: mockUser, error: null });
    let receivedUser: User | null = null;
    const handler = createHandler({
      handler: async (ctx) => {
        receivedUser = ctx.user;
        return NextResponse.json({ ok: true });
      },
    });
    const res = await handler(req("/api/v1/x"));
    expect(res.status).toBe(200);
    expect(receivedUser).toBe(mockUser);
  });
});

describe("createHandler — rate limit", () => {
  beforeEach(() => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: mockUser, error: null });
    vi.mocked(checkUserRateLimit).mockReset();
  });

  it("returns 429 RATE_LIMITED with Retry-After when the limit is exceeded", async () => {
    vi.mocked(checkUserRateLimit).mockReturnValue({
      result: { allowed: false, limit: 5, remaining: 0, resetAt: Date.now() + 30_000 },
      identifier: "user-1",
    });
    const handler = createHandler({
      rateLimit: { prefix: "trades", max: 5, windowMs: 60_000 },
      handler: async () => NextResponse.json({ ok: true }),
    });
    const res = await handler(req("/api/v1/trades", { method: "POST" }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("30");
    const body = await res.json();
    expect(body.error.code).toBe("RATE_LIMITED");
  });

  it("applies the default 60/min limit when no rateLimit config is supplied", async () => {
    const rl = vi.mocked(checkUserRateLimit).mockReturnValue({
      result: { allowed: true, limit: 60, remaining: 59, resetAt: Date.now() + 60_000 },
      identifier: "user-1",
    });
    const handler = createHandler({ handler: async () => NextResponse.json({ ok: true }) });
    await handler(req("/api/v1/x"));
    expect(rl).toHaveBeenCalledWith("user-1", expect.anything(), "api", 60, 60_000);
  });

  it("rateLimit: false explicitly opts out (no checkUserRateLimit call)", async () => {
    const rl = vi.mocked(checkUserRateLimit).mockReturnValue({
      result: { allowed: true, limit: 60, remaining: 59, resetAt: Date.now() + 60_000 },
      identifier: "user-1",
    });
    const handler = createHandler({
      rateLimit: false,
      handler: async () => NextResponse.json({ ok: true }),
    });
    const res = await handler(req("/api/v1/x"));
    expect(res.status).toBe(200);
    expect(rl).not.toHaveBeenCalled();
  });
});

describe("createHandler — Zod validation", () => {
  beforeEach(() => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: mockUser, error: null });
    vi.mocked(checkUserRateLimit).mockReturnValue({
      result: { allowed: true, limit: 60, remaining: 59, resetAt: Date.now() + 60_000 },
      identifier: "user-1",
    });
  });

  const bodySchema = z.object({ name: z.string().min(1) });

  it("rejects an invalid body with 400 VALIDATION_ERROR and the offending path", async () => {
    const handler = createHandler({
      schema: bodySchema,
      handler: async () => NextResponse.json({ ok: true }),
    });
    const res = await handler(
      req("/api/v1/x", { method: "POST", body: JSON.stringify({ name: "" }) })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details.issues.some((i: { path: string }) => i.path === "name")).toBe(true);
  });

  it("passes the validated body to the handler", async () => {
    let received: unknown = null;
    const handler = createHandler({
      schema: bodySchema,
      handler: async (ctx) => {
        received = ctx.body;
        return NextResponse.json({ ok: true });
      },
    });
    await handler(req("/api/v1/x", { method: "POST", body: JSON.stringify({ name: "alpha" }) }));
    expect(received).toEqual({ name: "alpha" });
  });

  it("rejects an invalid query param with 400 VALIDATION_ERROR", async () => {
    const querySchema = z.object({ status: z.enum(["OPEN", "CLOSED"]) });
    const handler = createHandler({
      querySchema,
      handler: async () => NextResponse.json({ ok: true }),
    });
    const res = await handler(req("/api/v1/x?status=WAT"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("passes validated query params to the handler", async () => {
    const querySchema = z.object({ status: z.enum(["OPEN", "CLOSED"]) });
    let received: unknown = null;
    const handler = createHandler({
      querySchema,
      handler: async (ctx) => {
        received = ctx.query;
        return NextResponse.json({ ok: true });
      },
    });
    await handler(req("/api/v1/x?status=OPEN"));
    expect(received).toEqual({ status: "OPEN" });
  });
});

describe("createHandler — error handling", () => {
  beforeEach(() => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: mockUser, error: null });
    vi.mocked(checkUserRateLimit).mockReturnValue({
      result: { allowed: true, limit: 60, remaining: 59, resetAt: Date.now() + 60_000 },
      identifier: "user-1",
    });
  });

  it("renders a thrown BaseError via the unified envelope (not a generic 500)", async () => {
    const { UnsupportedSymbolError } = await import("../typed-errors");
    const handler = createHandler({
      handler: async () => {
        throw new UnsupportedSymbolError("FAKE/XYZ");
      },
    });
    const res = await handler(req("/api/v1/x"));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("UNSUPPORTED_SYMBOL");
  });

  it("maps an unexpected thrown error to 500 INTERNAL_ERROR", async () => {
    const handler = createHandler({
      handler: async () => {
        throw new Error("boom");
      },
    });
    const res = await handler(req("/api/v1/x"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("INTERNAL_ERROR");
  });
});

describe("createPublicHandler — no auth", () => {
  beforeEach(() => {
    // Clear call history carried over from the createHandler suites so the
    // "not called" assertion reflects only this suite's invocations.
    vi.mocked(getAuthenticatedUser).mockClear();
    vi.mocked(checkUserRateLimit).mockReturnValue({
      result: { allowed: true, limit: 60, remaining: 59, resetAt: Date.now() + 60_000 },
      identifier: "ip",
    });
  });

  it("runs the handler without a user and without calling getAuthenticatedUser", async () => {
    const handler = createPublicHandler({
      handler: async () => NextResponse.json({ ok: true }),
    });
    const res = await handler(req("/api/v1/public"));
    expect(res.status).toBe(200);
    expect(getAuthenticatedUser).not.toHaveBeenCalled();
  });
});