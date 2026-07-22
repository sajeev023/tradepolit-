import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { recomputeUserPerformance } from "@/lib/performance-service";
import { successResponse, unauthorizedError } from "@/lib/api-helpers";
import { dispatchCaughtError } from "@/lib/typed-errors";

export async function POST(_request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const performance = await recomputeUserPerformance(user.id);
    return successResponse(performance);
  } catch (error) {
    console.error("Force recompute performance API error:", error);
    return dispatchCaughtError("Failed to recompute performance analytics", error);
  }
}
