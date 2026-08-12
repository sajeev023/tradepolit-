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

    // BUG FIX: the previous default "price_mock_pro_tier" started with "price_",
    // so `startsWith("price_")` was true and Stripe received a bogus price ID —
    // checkout creation threw and the user saw a generic 500. Resolve a real
    // price ID first; only fall back to inline price_data when none is set.
    const configuredPriceId = (process.env.STRIPE_PRICE_ID || "").trim();
    const isRealPriceId = /^price_[A-Za-z0-9]{10,}$/.test(configuredPriceId);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (!isRealPriceId) {
      console.warn(
        "[create-checkout] STRIPE_PRICE_ID is unset or not a real Stripe price ID — " +
        "falling back to inline price_data ($7.49/mo). Set STRIPE_PRICE_ID in production " +
        "to use a pre-configured Stripe Price."
      );
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: isRealPriceId ? configuredPriceId : undefined,
          price_data: !isRealPriceId ? {
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
    return NextResponse.json({ error: { message: err.message || "Failed to initiate checkout" } }, { status: 500 });
  }
}
