import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { successResponse, validationError, unauthorizedError, notFoundError } from "@/lib/api-helpers";
import { dispatchCaughtError } from "@/lib/typed-errors";
import { analyticsServer } from "@/lib/analytics-server";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/share — create a public, read-only share link for a thesis.
 *
 * Privacy rules (hard):
 *  - The snapshot contains ONLY the analysis itself: symbol, timeframe,
 *    bias, levels, plan, summary, regime. Never the user's email, name,
 *    journal, trades, or behavioral data.
 *  - The link token is unguessable (256-bit random).
 *  - Sharing is one-way: a thesis can have one live share link.
 */

const createShareSchema = z.object({
  thesisId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const body = await request.json().catch(() => null);
    const parsed = createShareSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const thesis = await prisma.thesis.findFirst({
      where: { id: parsed.data.thesisId, userId: user.id },
      include: { outcome: true },
    });
    if (!thesis) return notFoundError("Thesis");

    const existing = await prisma.sharedAnalysis.findUnique({
      where: { thesisId: thesis.id },
    });
    if (existing) {
      return successResponse({ shareToken: existing.shareToken, url: `/s/${existing.shareToken}` });
    }

    // Frozen snapshot — analysis only, zero PII.
    const snapshot = {
      symbol: thesis.symbol,
      timeframe: thesis.timeframe,
      bias: thesis.bias,
      confidence: thesis.confidence,
      setupType: thesis.setupType,
      entryZone: thesis.entryZone,
      stopLoss: thesis.stopLoss,
      invalidation: thesis.invalidation,
      target: thesis.target,
      riskReward: thesis.riskReward,
      regimeAtCreation: thesis.regimeAtCreation,
      invalidationConditions: thesis.invalidationConditions,
      aiSummary: thesis.aiSummary,
      status: thesis.status,
      outcome: thesis.outcome
        ? { result: thesis.outcome.result, followedPlan: thesis.outcome.followedPlan }
        : null,
      createdAt: thesis.createdAt,
      resolvedAt: thesis.resolvedAt,
    };

    const shareToken = randomBytes(24).toString("base64url");
    const shared = await prisma.sharedAnalysis.create({
      data: {
        shareToken,
        thesisId: thesis.id,
        symbol: thesis.symbol,
        timeframe: thesis.timeframe,
        bias: thesis.bias,
        confidence: thesis.confidence,
        snapshot: snapshot as never,
      },
    });

    await analyticsServer.track(user.id, "analysis_shared", { symbol: thesis.symbol });
    return successResponse({ shareToken: shared.shareToken, url: `/s/${shared.shareToken}` }, 201);
  } catch (err) {
    return dispatchCaughtError("Failed to create share link", err);
  }
}