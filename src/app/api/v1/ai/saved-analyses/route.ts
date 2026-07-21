import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { successResponse, unauthorizedError, validationError, internalError, errorResponse } from "@/lib/api-helpers";
import { isDemoUser } from "@/lib/demo-limits";

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

    // Demo users can't access saved analyses
    if (isDemoUser(user.id, user.email)) {
      return errorResponse("FEATURE_LOCKED", "Saved Analyses require a free account.", 403, {
        cta: "Create Free Account",
        ctaLink: "/signup",
      });
    }

    const userProfile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
      select: { plan: true },
    });
    if (userProfile?.plan !== "PRO") {
      return new Response(JSON.stringify({ error: { message: "Upgrade to Pro to access this feature" } }), { status: 403, headers: { "Content-Type": "application/json" } });
    }

    const analyses = await prisma.savedAnalysis.findMany({
      where: { userId: user.id },
      orderBy: { savedAt: "desc" },
      take: 100,
    });

    return successResponse(analyses);
  } catch (err) {
    console.error("List saved analyses error:", err);
    return internalError("Failed to list saved analyses");
  }
}

// POST /api/v1/ai/saved-analyses — bookmark an analysis
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    // Demo users can't save analyses
    if (isDemoUser(user.id, user.email)) {
      return errorResponse("FEATURE_LOCKED", "Saved Analyses require a free account.", 403, {
        cta: "Create Free Account",
        ctaLink: "/signup",
      });
    }

    const userProfile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
      select: { plan: true },
    });
    if (userProfile?.plan !== "PRO") {
      return new Response(JSON.stringify({ error: { message: "Upgrade to Pro to access this feature" } }), { status: 403, headers: { "Content-Type": "application/json" } });
    }

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
    return internalError("Failed to save analysis");
  }
}
