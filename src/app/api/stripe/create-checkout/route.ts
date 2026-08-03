import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { checkUserRateLimit } from "@/lib/rate-limit";
import { rateLimitedError } from "@/lib/typed-errors";

// POST /api/stripe/create-checkout
// Creates a Stripe Checkout Session for the PRO Plan ($7.49/month)
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    // Per-user rate limit: 5 / min. Checkout session creation hits the
    // Stripe API (slow, quota'd). Repeated clicks from a stuck UI should
    // not flood Stripe.
    const rl = checkUserRateLimit(user.id, request, "stripe-checkout", 5, 60_000);
    if (!rl.result.allowed) {
      return rateLimitedError((rl.result.resetAt - Date.now()), "Too many checkout attempts. Please slow down.");
    }

    // Fetch user profile from DB to check for Stripe Customer ID
    let profile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return NextResponse.json({ error: { message: "Profile not found" } }, { status: 404 });
    }

    let customerId = profile.stripeCustomerId;

    // Create a Stripe customer if not exists
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      profile = await prisma.userProfile.update({
        where: { userId: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const priceId = process.env.STRIPE_PRICE_ID || "price_mock_pro_tier";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Production must use a real, pre-created Stripe Price (STRIPE_PRICE_ID
    // starting with "price_"). The ad-hoc price_data fallback below creates a
    // throwaway $7.49 product on every checkout — fine for dev/demo, but in
    // production it would silently bill through an unmanaged, untracked
    // product (no dashboard control, no coupon/upgrade reconciliation, revenue
    // not tied to the canonical plan). Fail loud instead of mis-billing.
    // NOTE: the dev default "price_mock_pro_tier" also starts with "price_",
    // so it must be excluded explicitly or the guard would let the mock
    // fallback through in production.
    const hasRealPrice = priceId.startsWith("price_") && priceId !== "price_mock_pro_tier";
    if (process.env.NODE_ENV === "production" && !hasRealPrice) {
      console.error("[STRIPE] Production checkout rejected: STRIPE_PRICE_ID is missing or not a real Stripe price id.");
      return NextResponse.json(
        { error: { message: "Checkout is temporarily unavailable. Please try again later." } },
        { status: 503 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: hasRealPrice ? priceId : undefined,
          price_data: !hasRealPrice ? {
            currency: "usd",
            product_data: {
              name: "TradCopilot Pro Membership",
              description: "Unlimited AI analyses, full behavioral insights, and automated reports.",
            },
            unit_amount: 749, // $7.49
            recurring: { interval: "month" },
          } : undefined,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${appUrl}/dashboard?upgrade=success`,
      cancel_url: `${appUrl}/pricing?upgrade=cancelled`,
      metadata: { userId: user.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Create stripe checkout session failed:", err);
    // Never surface the raw Stripe error to the client — it can contain
    // account/identifier details. Log the full error server-side only.
    return NextResponse.json({ error: { message: "Failed to initiate checkout" } }, { status: 500 });
  }
}
