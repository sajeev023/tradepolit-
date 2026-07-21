import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

// POST /api/stripe/portal
// Redirects a logged-in user to their Stripe Billing Portal
export async function POST(_request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) {
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const profile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
    });

    if (!profile || !profile.stripeCustomerId) {
      return NextResponse.json({ error: { message: "Billing account not found. Subscribe first." } }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

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
