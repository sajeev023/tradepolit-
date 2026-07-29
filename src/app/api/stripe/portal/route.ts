import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-helpers";
import { StripeError } from "@/lib/typed-errors";
import { createHandler } from "@/lib/route-handler";

// POST /api/stripe/portal
// Redirects a logged-in user to their Stripe Billing Portal. Errors flow
// through the typed ApiError envelope (StripeError → 502); success returns
// the raw `{ url }` body the redirect consumer expects.
export const dynamic = "force-dynamic";

export const POST = createHandler({
  // Per-user rate limit: 5 / min — same reasoning as checkout.
  rateLimit: { prefix: "stripe-portal", max: 5, windowMs: 60_000 },
  async handler({ user }) {
    const profile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
    });

    if (!profile || !profile.stripeCustomerId) {
      return errorResponse(
        "CONFLICT",
        "Billing account not found. Subscribe first.",
        400
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    try {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: profile.stripeCustomerId,
        return_url: `${appUrl}/settings`,
      });
      return NextResponse.json({ url: portalSession.url });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      console.error("Create stripe portal session failed:", err);
      throw new StripeError("Failed to initiate billing portal", code);
    }
  },
});