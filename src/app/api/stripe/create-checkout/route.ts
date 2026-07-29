import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { notFoundError } from "@/lib/api-helpers";
import { StripeError } from "@/lib/typed-errors";
import { createHandler } from "@/lib/route-handler";

// POST /api/stripe/create-checkout
// Creates a Stripe Checkout Session for the PRO Plan ($7.49/month).
// Errors flow through the typed ApiError envelope (StripeError → 502 with
// error.code "STRIPE_ERROR") so the client can branch on the code instead of
// string-matching a message. Success returns the raw `{ url }` body that the
// tv.js-style redirect consumer expects.
export const dynamic = "force-dynamic";

export const POST = createHandler({
  // Per-user rate limit: 5 / min. Checkout session creation hits the Stripe
  // API (slow, quota'd). Repeated clicks from a stuck UI must not flood Stripe.
  rateLimit: { prefix: "stripe-checkout", max: 5, windowMs: 60_000 },
  async handler({ user }) {
    // Fetch user profile from DB to check for an existing Stripe Customer ID.
    const profile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
    });
    if (!profile) return notFoundError("Profile");

    let customerId = profile.stripeCustomerId;

    // Create a Stripe customer if one doesn't exist yet.
    if (!customerId) {
      try {
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          metadata: { userId: user.id },
        });
        customerId = customer.id;
        await prisma.userProfile.update({
          where: { userId: user.id },
          data: { stripeCustomerId: customerId },
        });
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code;
        console.error("Create stripe customer failed:", err);
        throw new StripeError("Failed to create billing customer", code);
      }
    }

    const priceId = process.env.STRIPE_PRICE_ID || "price_mock_pro_tier";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId.startsWith("price_") ? priceId : undefined,
            price_data: !priceId.startsWith("price_") ? {
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
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      console.error("Create stripe checkout session failed:", err);
      throw new StripeError("Failed to initiate checkout", code);
    }
  },
});