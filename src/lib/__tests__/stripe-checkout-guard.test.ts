import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Verifies the Stripe checkout production guard: in production the endpoint
// must refuse to create a checkout session when STRIPE_PRICE_ID is missing or
// not a real Stripe price id, instead of silently creating an ad-hoc
// throwaway product. In dev the ad-hoc price_data fallback is preserved.

vi.mock("@/lib/auth", () => ({
  getAuthenticatedUser: vi.fn(async () => ({ user: { id: "u1", email: "a@b.com" }, error: null })),
}));
vi.mock("@/lib/rate-limit", () => ({
  checkUserRateLimit: vi.fn(() => ({
    result: { allowed: true, limit: 5, remaining: 4, resetAt: Date.now() + 60_000 },
    identifier: "u1",
  })),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    userProfile: {
      findUnique: vi.fn(async () => ({ userId: "u1", stripeCustomerId: "cus_existing" })),
      update: vi.fn(async () => ({ userId: "u1", stripeCustomerId: "cus_existing" })),
    },
  },
}));
vi.mock("@/lib/stripe", () => ({
  stripe: {
    customers: { create: vi.fn(async () => ({ id: "cus_new" })) },
    checkout: {
      sessions: {
        create: vi.fn(async () => ({ url: "https://checkout.stripe.com/session_123" })),
      },
    },
  },
}));

import { POST } from "@/app/api/stripe/create-checkout/route";
import { stripe } from "@/lib/stripe";

const req = () => new NextRequest("http://localhost/api/stripe/create-checkout", { method: "POST" });

describe("Stripe checkout production guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("returns 503 in production when STRIPE_PRICE_ID is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STRIPE_PRICE_ID", "");
    const res = await POST(req());
    expect(res.status).toBe(503);
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("returns 503 in production when STRIPE_PRICE_ID is the mock fallback", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STRIPE_PRICE_ID", "price_mock_pro_tier");
    const res = await POST(req());
    expect(res.status).toBe(503);
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("proceeds in production when STRIPE_PRICE_ID is a real price id", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STRIPE_PRICE_ID", "price_real_prod_123");
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(stripe.checkout.sessions.create).toHaveBeenCalledTimes(1);
    const body = await res.json();
    expect(body.url).toBe("https://checkout.stripe.com/session_123");
  });

  it("preserves the ad-hoc price_data fallback in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("STRIPE_PRICE_ID", "");
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(stripe.checkout.sessions.create).toHaveBeenCalledTimes(1);
    // line_items[0].price should be undefined (ad-hoc product) in dev.
    const callArgs = vi.mocked(stripe.checkout.sessions.create).mock.calls[0][0] as any;
    expect(callArgs.line_items[0].price).toBeUndefined();
    expect(callArgs.line_items[0].price_data).toBeDefined();
  });

  it("does not leak the raw Stripe error to the client on failure", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STRIPE_PRICE_ID", "price_real_prod_123");
    vi.mocked(stripe.checkout.sessions.create).mockRejectedValueOnce(new Error("Sensitive internal detail: account acct_123"));
    const res = await POST(req());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.message).toBe("Failed to initiate checkout");
    expect(body.error.message).not.toContain("acct_123");
  });
});