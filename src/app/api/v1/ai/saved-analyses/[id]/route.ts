import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { successResponse, unauthorizedError, notFoundError, errorResponse } from "@/lib/api-helpers";
import { isDemoUser } from "@/lib/demo-limits";
import { dispatchCaughtError } from "@/lib/typed-errors";

// DELETE /api/v1/ai/saved-analyses/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    // Demo users can't delete saved analyses
    if (isDemoUser(user.id, user.email)) {
      return errorResponse("FEATURE_LOCKED", "Saved Analyses require a free account.", 403, {
        cta: "Create Free Account",
        ctaLink: "/signup",
      });
    }

    const { id } = await params;

    const record = await prisma.savedAnalysis.findFirst({
      where: { id, userId: user.id },
    });

    if (!record) return notFoundError("Saved analysis not found");

    await prisma.savedAnalysis.delete({ where: { id } });

    return successResponse({ deleted: true });
  } catch (err) {
    console.error("Delete saved analysis error:", err);
    return dispatchCaughtError("Failed to delete saved analysis", err);
  }
}
