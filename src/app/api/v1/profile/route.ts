import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { successResponse, unauthorizedError, serverTimingHeader } from "@/lib/api-helpers";
import { dispatchCaughtError } from "@/lib/typed-errors";
import { getCurrentUsage } from "@/lib/limit-checker";

export async function GET(_request: NextRequest) {
  const apiStart = performance.now();
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const dbStart = performance.now();
    const profile = await prisma.userProfile.findUniqueOrThrow({
      where: { userId: user.id },
    });
    const dbDuration = performance.now() - dbStart;

    const usage = await getCurrentUsage(user.id, user.email);

    const apiDuration = performance.now() - apiStart;
    // Server-Timing is emitted only in non-production (see serverTimingHeader).
    const headers = serverTimingHeader(
      { name: "db", durMs: dbDuration, desc: "Prisma queries" },
      { name: "api", durMs: apiDuration, desc: "API Execution" },
    );

    return successResponse({
      id: profile.id,
      userId: profile.userId,
      accountSize: Number(profile.accountSize),
      maxRiskPercent: Number(profile.maxRiskPercent),
      preferredRR: Number(profile.preferredRR),
      maxDrawdown: Number(profile.maxDrawdown),
      lastSymbol: profile.lastSymbol,
      lastTimeframe: profile.lastTimeframe,
      plan: usage.plan,
      // NOTE: stripeCustomerId/stripeSubscriptionId are intentionally omitted
      // from the client response — they are sensitive payment references that
      // can be abused in Stripe-powered flows (M-4 fix).
      subscriptionStatus: usage.isPro ? "PRO_ACTIVE" : profile.subscriptionStatus,
      subscriptionExpiresAt: profile.subscriptionExpiresAt,
      dailyAnalysisCount: usage.analysesUsed,
      dailyAlertCount: usage.alertsUsed,
      dailyAnalysisRemaining: usage.analysesRemaining,
      dailyAlertRemaining: usage.alertsRemaining,
      analysisLimit: usage.limit,
      alertLimit: usage.alertLimit,
      isDemo: usage.isDemo,
      lastAnalysisReset: profile.lastAnalysisReset,
    }, 200, headers);
  } catch (err: any) {
    console.error("Get profile API error:", err);
    return dispatchCaughtError("Failed to fetch profile", err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const body = await request.json();
    const { lastSymbol, lastTimeframe } = body;

    const profile = await prisma.userProfile.update({
      where: { userId: user.id },
      data: {
        ...(lastSymbol ? { lastSymbol } : {}),
        ...(lastTimeframe ? { lastTimeframe } : {}),
      },
    });

    return successResponse(profile);
  } catch (err: any) {
    console.error("Update profile API error:", err);
    return dispatchCaughtError("Failed to update profile", err);
  }
}
