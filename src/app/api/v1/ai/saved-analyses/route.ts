import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { successResponse, unauthorizedError, validationError, errorResponse } from "@/lib/api-helpers";
import { isDemoUser, getDemoFeatureLockedError } from "@/lib/demo-limits";
import { getEntitlementForUser } from "@/lib/entitlements";
import { dispatchCaughtError } from "@/lib/typed-errors";

function demoLockedResponse() {
  const e = getDemoFeatureLockedError("savedAnalyses");
  return errorResponse(e.error, e.message, 403, { cta: e.cta, ctaLink: e.ctaLink });
}

async function requireCanSaveAnalyses(userId: string, email?: string) {
  if (isDemoUser(userId, email)) return demoLockedResponse();
  const ent = getEntitlementForUser(userId, email);
  if (!ent.canSaveAnalyses) return demoLockedResponse();
  return null;
}

const saveSchema = z.object({
  symbol: z.string().min(1),
  timeframe: z.string().min(1),
  bias: z.string().min(1),
  confidence: z.string().min(1),
  support: z.string(),
  resistance: z.string(),
  aiSummary: z.string().min(1),
});

// GET /api/v1/ai/saved-analyses — list user's saved analyses
export async function GET(_request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    // Demo users can't access saved analyses; FREE and PRO can (per entitlements.ts).
    const locked = await requireCanSaveAnalyses(user.id, user.email ?? undefined);
    if (locked) return locked;

    const analyses = await prisma.savedAnalysis.findMany({
      where: { userId: user.id },
      orderBy: { savedAt: "desc" },
      take: 100,
    });

    return successResponse(analyses);
  } catch (err) {
    console.error("List saved analyses error:", err);
    return dispatchCaughtError("Failed to list saved analyses", err);
  }
}

// POST /api/v1/ai/saved-analyses — bookmark an analysis
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    // Demo users can't save analyses; FREE and PRO can (per entitlements.ts).
    const locked = await requireCanSaveAnalyses(user.id, user.email ?? undefined);
    if (locked) return locked;

    const json = await request.json().catch(() => ({}));
    const validation = saveSchema.safeParse(json);
    if (!validation.success) return validationError(validation.error);

    const saved = await prisma.savedAnalysis.create({
      data: {
        userId: user.id,
        ...validation.data,
      },
    });

    return successResponse(saved, 201);
  } catch (err) {
    console.error("Save analysis error:", err);
    return dispatchCaughtError("Failed to save analysis", err);
  }
}
