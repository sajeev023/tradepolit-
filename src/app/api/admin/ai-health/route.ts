import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { successResponse, unauthorizedError, forbiddenError, internalError } from "@/lib/api-helpers";
import { getProviderHealth } from "@/lib/ai-providers";

export async function GET(_request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    // Enforce Admin Role
    if (user.role !== "ADMIN") {
      return forbiddenError();
    }

    const health = getProviderHealth();
    return successResponse(health);
  } catch (err: any) {
    console.error("AI health check failed:", err);
    return internalError(err?.message || "Failed to check AI health status");
  }
}
