import { NextRequest } from "next/server";
import { getAuthenticatedUser, requireAdmin } from "@/lib/auth";
import { successResponse, unauthorizedError } from "@/lib/api-helpers";
import { getProviderHealth } from "@/lib/ai-providers";
import { dispatchCaughtError } from "@/lib/typed-errors";

export async function GET(_request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    // Enforce Admin Role — single source of truth via requireAdmin (M-1).
    const isDemo = user.email?.endsWith("@tradcopilot.local") === true;
    const adminCheck = await requireAdmin(user.id, isDemo);
    if (!adminCheck.ok) return adminCheck.response;

    const health = getProviderHealth();
    return successResponse(health);
  } catch (err: any) {
    console.error("AI health check failed:", err);
    return dispatchCaughtError("Failed to check AI health status", err);
  }
}
