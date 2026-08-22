import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { checkUserRateLimit } from "@/lib/rate-limit";
import { rateLimitedError } from "@/lib/typed-errors";
import { getSiteUrl } from "@/lib/site-url";

// POST /api/stripe/portal
// Redirects a logged-in user to their Stripe Billing Portal
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    // Per-user rate limit: 5 / min — same reasoning as checkout.
    const rl = checkUserRateLimit(user.id, request, "stripe-portal", 5, 60_000);
    if (!rl.result.allowed) {
      return rateLimitedError((rl.result.resetAt - Date.now()), "Too many portal requests. Please slow down.");
    }

    const profile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
    });

    if (!profile || !profile.stripeCustomerId) {
      return NextResponse.json({ error: { message: "Billing account not found. Subscribe first." } }, { status: 400 });
    }

    const appUrl = getSiteUrl();

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripeCustomerId,
      return_url: `${appUrl}/settings`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err: any) {
    console.error("Create stripe portal session failed:", err);
    return NextResponse.json({ error: { message: err.message || "Failed to initiate billing portal" } }, { status: 500 });
  }
}
