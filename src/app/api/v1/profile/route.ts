import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { successResponse, unauthorizedError, internalError } from "@/lib/api-helpers";
import { getCurrentUsage } from "@/lib/limit-checker";

export async function GET(request: NextRequest) {
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
    const headers = {
      "Server-Timing": `db;dur=${dbDuration.toFixed(2)};desc="Prisma queries", api;dur=${apiDuration.toFixed(2)};desc="API Execution"`,
    };

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
      stripeCustomerId: profile.stripeCustomerId,
      stripeSubscriptionId: profile.stripeSubscriptionId,
      subscriptionStatus: profile.subscriptionStatus,
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
    return internalError("Failed to fetch profile");
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
    return internalError("Failed to update profile");
  }
}
