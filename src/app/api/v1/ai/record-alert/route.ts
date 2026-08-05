import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { checkUsageLimit, recordUsage } from "@/lib/limit-checker";
import { successResponse, unauthorizedError } from "@/lib/api-helpers";
import { dispatchCaughtError } from "@/lib/typed-errors";

// POST /api/v1/ai/record-alert
// Checks if the user is within their daily alert quota, then atomically
// increments the counter. Uses the same atomic conditional-increment path as
// alert creation so concurrent AI-generated alerts cannot exceed the quota.
export async function POST(_request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const limitCheck = await checkUsageLimit(user.id, "alerts", user.email);
    if (!limitCheck.allowed) {
      return successResponse({ allowed: false, remaining: 0 });
    }

    // Atomic conditional increment. Under a concurrent race the limit may be
    // hit between the check above and here; recordUsage returns false in that
    // case and we must NOT report the alert as allowed.
    const recorded = await recordUsage(user.id, "alerts", user.email);
    if (!recorded) {
      return successResponse({ allowed: false, remaining: 0 });
    }

    return successResponse({ allowed: true, remaining: limitCheck.remaining });
  } catch (err) {
    console.error("Record alert error:", err);
    return dispatchCaughtError("Failed to verify and record alert usage", err);
  }
}