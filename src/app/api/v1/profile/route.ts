import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { successResponse, unauthorizedError, validationError } from "@/lib/api-helpers";
import { dispatchCaughtError } from "@/lib/typed-errors";
import { getCurrentUsage } from "@/lib/limit-checker";

export async function GET(_request: NextRequest) {
  const apiStart = performance.now();
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const dbStart = performance.now();
    const [profile, userRow] = await Promise.all([
      prisma.userProfile.findUniqueOrThrow({ where: { userId: user.id } }),
      prisma.user.findUnique({
        where: { id: user.id },
        select: { lastUsageReset: true },
      }),
    ]);
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
      subscriptionStatus: usage.isPro ? "PRO_ACTIVE" : profile.subscriptionStatus,
      subscriptionExpiresAt: profile.subscriptionExpiresAt,
      dailyAnalysisCount: usage.analysesUsed,
      dailyAlertCount: usage.alertsUsed,
      dailyAnalysisRemaining: usage.analysesRemaining,
      dailyAlertRemaining: usage.alertsRemaining,
      analysisLimit: usage.limit,
      alertLimit: usage.alertLimit,
      isDemo: usage.isDemo,
      // Daily reset timestamp lives on the User row (UserProfile has no
      // lastAnalysisReset field); the previous `profile.lastAnalysisReset`
      // was always undefined and silently serialized as null.
      lastAnalysisReset: userRow?.lastUsageReset ?? null,
    }, 200, headers);
  } catch (err: any) {
    console.error("Get profile API error:", err);
    return dispatchCaughtError("Failed to fetch profile", err);
  }
}

const updateProfileSchema = z.object({
  lastSymbol: z.string().max(64).optional(),
  lastTimeframe: z.string().max(16).optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return validationError({ issues: [{ message: "Invalid JSON body" }] } as any);
    }

    const validation = updateProfileSchema.safeParse(body);
    if (!validation.success) {
      return validationError(validation.error);
    }

    const { lastSymbol, lastTimeframe } = validation.data;

    const profile = await prisma.userProfile.update({
      where: { userId: user.id },
      data: {
        ...(lastSymbol !== undefined ? { lastSymbol } : {}),
        ...(lastTimeframe !== undefined ? { lastTimeframe } : {}),
      },
    });

    return successResponse(profile);
  } catch (err: any) {
    console.error("Update profile API error:", err);
    return dispatchCaughtError("Failed to update profile", err);
  }
}