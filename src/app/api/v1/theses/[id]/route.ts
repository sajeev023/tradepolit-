import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { successResponse, validationError, unauthorizedError, notFoundError } from "@/lib/api-helpers";
import { dispatchCaughtError } from "@/lib/typed-errors";
import { logThesisOutcome } from "@/lib/thesis-service";
import { proposeAttribution } from "@/lib/attribution-engine";
import { analyticsServer } from "@/lib/analytics-server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const { id } = await ctx.params;
    const existing = await prisma.thesis.findFirst({ where: { id, userId: user.id } });
    if (!existing) return notFoundError("Thesis");

    await prisma.thesis.delete({ where: { id } });
    return successResponse({ deleted: true });
  } catch (err) {
    return dispatchCaughtError("Failed to delete thesis", err);
  }
}

const outcomeSchema = z.object({
  outcome: z.object({
    result: z.enum(["WIN", "LOSS", "BREAKEVEN", "NO_TRADE"]),
    tookTrade: z.boolean(),
    rMultiple: z.number().finite().optional(),
    pnl: z.number().finite().optional(),
    followedPlan: z.boolean().optional(),
    whatILearned: z.string().max(2000).optional(),
    linkedTradeId: z.string().max(64).optional(),
    // V2.5 attribution: the label the user selected in the review UI
    // (from the engine's proposal, with override allowed).
    attribution: z
      .enum([
        "GOOD_DECISION_GOOD_OUTCOME",
        "GOOD_DECISION_BAD_OUTCOME",
        "BAD_DECISION_GOOD_OUTCOME",
        "BAD_DECISION_BAD_OUTCOME",
        "EXECUTION_ERROR",
        "RISK_MANAGEMENT_ERROR",
        "REGIME_SHIFT",
        "INFORMATION_FAILURE",
        "BEHAVIORAL_ERROR",
        "DATA_QUALITY_ISSUE",
      ])
      .optional(),
    attributionReasoning: z.string().max(500).optional(),
  }),
});

/** PATCH /api/v1/theses/[id] — log the outcome for a resolved thesis.
 *  V2.5: attribution is attached — the engine proposes, the user's
 *  selection is authoritative, and the deterministic proposal is kept
 *  in the reasoning when the user accepts it unchanged. */
export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const { id } = await ctx.params;
    const body = await request.json().catch(() => null);
    const parsed = outcomeSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    // Fetch the thesis for the deterministic attribution proposal
    // (evidence, regimes, status) — must belong to the user.
    const thesis = await prisma.thesis.findFirst({
      where: { id, userId: user.id },
      include: { outcome: true },
    });
    if (!thesis) return notFoundError("Thesis");

    const engineProposal = proposeAttribution({
      thesisStatus: thesis.status as "HIT" | "INVALIDATED" | "EXPIRED",
      bias: thesis.bias as "LONG" | "SHORT",
      regimeAtCreation: thesis.regimeAtCreation,
      regimeAtResolution: thesis.regimeAtResolution,
      evidenceFor: thesis.evidenceFor ?? [],
      evidenceAgainst: thesis.evidenceAgainst ?? [],
      tookTrade: parsed.data.outcome.tookTrade,
      result: parsed.data.outcome.result,
      followedPlan: parsed.data.outcome.followedPlan ?? null,
    });

    const userLabel = parsed.data.outcome.attribution;
    const finalLabel = userLabel ?? engineProposal.label;
    const userAcceptedEngine = userLabel === engineProposal.label;

    const outcome = await logThesisOutcome({
      userId: user.id,
      thesisId: id,
      ...parsed.data.outcome,
      attribution: finalLabel,
      attributionSource: userLabel ? (userAcceptedEngine ? "engine" : "user") : "engine",
      attributionReasoning:
        parsed.data.outcome.attributionReasoning ??
        (userAcceptedEngine || !userLabel ? engineProposal.reasoning : undefined),
    });

    // Analytics: the labeled-decision dataset counter.
    void analyticsServer.track(user.id, "thesis_outcome_logged", {
      result: parsed.data.outcome.result,
      attribution: finalLabel,
      engineProposed: engineProposal.label,
      userOverrode: !!userLabel && !userAcceptedEngine,
    });

    return successResponse({ ...outcome, engineProposal }, 201);
  } catch (err: any) {
    return dispatchCaughtError("Failed to log thesis outcome", err);
  }
}

/** GET /api/v1/theses/[id]?proposal=1 — pre-fetch the engine's
 *  attribution proposal so the review modal can show it before the
 *  user logs the outcome. */
export async function GET(request: NextRequest, ctx: Ctx) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const { id } = await ctx.params;
    const thesis = await prisma.thesis.findFirst({
      where: { id, userId: user.id },
      include: { outcome: true },
    });
    if (!thesis) return notFoundError("Thesis");

    const { searchParams } = new URL(request.url);

    // V4.1: optionally attach the live market context diff to the response.
    // This lets the Decision Record render an honest THEN vs NOW without
    // making a second round-trip to the market context API.
    if (searchParams.get("context") === "1") {
      const { buildMarketSnapshot } = await import("@/lib/market-snapshot");
      const nowContext = await buildMarketSnapshot(thesis.symbol, thesis.timeframe);
      return successResponse({ thesis, nowContext });
    }

    if (searchParams.get("proposal") !== "1") {
      return successResponse(thesis);
    }

    const proposal = proposeAttribution({
      thesisStatus: thesis.status as "HIT" | "INVALIDATED" | "EXPIRED",
      bias: thesis.bias as "LONG" | "SHORT",
      regimeAtCreation: thesis.regimeAtCreation,
      regimeAtResolution: thesis.regimeAtResolution,
      evidenceFor: thesis.evidenceFor ?? [],
      evidenceAgainst: thesis.evidenceAgainst ?? [],
      // At proposal-prefetch time the user hasn't answered yet — assume
      // observed (non-traded) framing; PATCH recomputes with real answers.
      tookTrade: false,
    });
    return successResponse({ thesis, proposal });
  } catch (err) {
    return dispatchCaughtError("Failed to fetch thesis", err);
  }
}