import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { checkAlertLimit, incrementAlertCount } from "@/lib/usage-limits";
import { successResponse, unauthorizedError, internalError } from "@/lib/api-helpers";

// POST /api/v1/ai/record-alert
// Checks if alert count is within bounds, increments it, and returns status.
export async function POST(_request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const allowed = await checkAlertLimit(user.id);
    if (!allowed) {
      return successResponse({ allowed: false, remaining: 0 });
    }

    // Increment count
    await incrementAlertCount(user.id);

    return successResponse({ allowed: true });
  } catch (err) {
    console.error("Record alert error:", err);
    return internalError("Failed to verify and record alert usage");
  }
}
