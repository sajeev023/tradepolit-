import { NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { successResponse, unauthorizedError, internalError } from "@/lib/api-helpers";

// POST /api/v1/stripe/portal
// Redirects a logged-in user to their Stripe Billing Portal
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser || !dbUser.stripeCustomerId) {
      return internalError("No active billing account exists. Please subscribe first.");
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: dbUser.stripeCustomerId,
      return_url: `${appUrl}/settings`,
    });

    return successResponse({ url: portalSession.url });
  } catch (err) {
    console.error("Create stripe portal session failed:", err);
    return internalError("Failed to initiate billing portal");
  }
}
