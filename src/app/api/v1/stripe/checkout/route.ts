import { NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { successResponse, unauthorizedError, internalError } from "@/lib/api-helpers";

// POST /api/v1/stripe/checkout
// Creates a Stripe Checkout Session for the PRO Plan ($7.49/month)
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    // Fetch user from DB to check for Stripe Customer ID
    let dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      return unauthorizedError();
    }

    let customerId = dbUser.stripeCustomerId;

    // Create a Stripe customer if not exists
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      dbUser = await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const priceId = process.env.STRIPE_PRICE_ID_PRO || "price_mock_pro_tier";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "TradePilot Pro Membership",
              description: "Unlimited AI analyses, full behavioral insights, and automated reports.",
            },
            unit_amount: 749, // $7.49
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${appUrl}/settings?payment=success`,
      cancel_url: `${appUrl}/settings?payment=cancelled`,
      metadata: { userId: user.id },
    });

    return successResponse({ url: session.url });
  } catch (err) {
    console.error("Create stripe checkout session failed:", err);
    return internalError("Failed to initiate checkout session");
  }
}
