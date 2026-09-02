import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { successResponse, validationError, unauthorizedError } from "@/lib/api-helpers";
import { dispatchCaughtError } from "@/lib/typed-errors";
import { createThesis, evaluateOpenTheses } from "@/lib/thesis-service";
import { isRegisteredSymbol } from "@/lib/market";
import { getEntitlementForUser } from "@/lib/entitlements";
import { analyticsServer } from "@/lib/analytics-server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET /api/v1/theses — list the user's theses (open first, then resolved).
 * Query: ?status=OPEN|HIT|INVALIDATED|EXPIRED|ALL (default ALL)
 *
 * Runs a lightweight evaluation pass first (same-user, ≤50 theses) so a
 * returning user always sees fresh statuses without waiting for cron.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status") ?? "ALL";

    // Best-effort on-load evaluation — failures don't block the list.
    try {
      await evaluateOpenTheses(user.id);
    } catch {
      /* cron covers this */
    }

    const theses = await prisma.thesis.findMany({
      where: statusFilter === "ALL" ? { userId: user.id } : { userId: user.id, status: statusFilter as never },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: { outcome: true },
      take: 100,
    });

    return successResponse(theses);
  } catch (err) {
    return dispatchCaughtError("Failed to fetch theses", err);
  }
}

const createThesisSchema = z.object({
  symbol: z.string().min(1).refine(isRegisteredSymbol, { message: "Unsupported symbol" }),
  timeframe: z.enum(["1m", "5m", "15m", "1h", "4h", "1d", "1W"]),
  analysis: z.object({
    bias: z.string().min(1),
    setupQuality: z.string().optional(),
    confidence: z.string().optional(),
    entryIdeas: z.string().optional(),
    stopLossIdea: z.string().optional(),
    takeProfitIdea: z.string().optional(),
    whyItMatters: z.string().optional(),
    support: z.union([z.number(), z.string()]).optional(),
    resistance: z.union([z.number(), z.string()]).optional(),
    invalidationLevel: z.union([z.number(), z.string()]).optional(),
  }),
  telemetry: z.object({
    currentPrice: z.number().positive(),
    support: z.number().positive(),
    resistance: z.number().positive(),
    invalidationLevel: z.number().positive().optional(),
    rsi: z.number().optional(),
    macdValue: z.number().optional(),
    macdSignal: z.number().optional(),
    macdHistogram: z.number().optional(),
    trend: z.string().optional(),
    bias: z.string().optional(),
    atr: z.number().optional(),
  }),
  aiSummary: z.string().min(1).max(4000),
  evidenceFor: z.array(z.string().max(300)).max(10).optional(),
  evidenceAgainst: z.array(z.string().max(300)).max(10).optional(),
  invalidationConditions: z.string().max(500).optional(),
  sourceAnalysisId: z.string().max(64).optional(),
});

/**
 * POST /api/v1/theses — save a thesis from a completed analysis.
 * The numbers ALWAYS pass through the trade-logic engine server-side;
 * client-supplied numbers are advisory only.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const body = await request.json().catch(() => null);
    const parsed = createThesisSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const input = parsed.data;

    // Entitlement: thesis creation is available to all authenticated
    // (non-demo) users — it is the retention loop, not a paywalled toy.
    const entitlement = getEntitlementForUser(user.id, user.email ?? undefined);
    if (entitlement.plan === "YC_DEMO") {
      return successResponse({ demoLocked: true, message: "Create a free account to save theses." });
    }

    const thesis = await createThesis({
      userId: user.id,
      symbol: input.symbol,
      timeframe: input.timeframe,
      analysis: input.analysis,
      telemetry: {
        symbol: input.symbol,
        timeframe: input.timeframe,
        ...input.telemetry,
        macdValue: input.telemetry.macdValue ?? 0,
        macdSignal: input.telemetry.macdSignal ?? 0,
        macdHistogram: input.telemetry.macdHistogram ?? 0,
        trend: input.telemetry.trend ?? "SIDEWAYS",
        bias: input.telemetry.bias ?? input.analysis.bias,
      } as never,
      aiSummary: input.aiSummary,
      evidenceFor: input.evidenceFor,
      evidenceAgainst: input.evidenceAgainst,
      invalidationConditions: input.invalidationConditions,
      sourceAnalysisId: input.sourceAnalysisId,
    });

    await analyticsServer.track(user.id, "thesis_created", { symbol: input.symbol, timeframe: input.timeframe });

    return successResponse(thesis, 201);
  } catch (err: any) {
    if (err?.status === 422) {
      return dispatchCaughtError("Trade plan failed validation", err);
    }
    return dispatchCaughtError("Failed to create thesis", err);
  }
}