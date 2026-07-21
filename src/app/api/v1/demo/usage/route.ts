import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getCurrentUsage } from "@/lib/limit-checker";
import { getEntitlementForUser, getSessionExpiry, isSessionExpired } from "@/lib/entitlements";
import { successResponse, unauthorizedError } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const entitlement = getEntitlementForUser(user.id, user.email);
    if (entitlement.plan !== "YC_DEMO") {
      return successResponse({ analysesUsed: 0, alertsUsed: 0, isDemo: false });
    }

    const usage = await getCurrentUsage(user.id, user.email);
    const sessionStart = new Date(user.createdAt || Date.now());
    const expired = isSessionExpired(sessionStart, entitlement);
    const expiry = getSessionExpiry(sessionStart, entitlement);

    return successResponse({
      analysesUsed: usage.analysesUsed,
      alertsUsed: usage.alertsUsed,
      analysesRemaining: usage.analysesRemaining,
      alertsRemaining: usage.alertsRemaining,
      sessionExpiry: expiry.toISOString(),
      sessionExpired: expired,
      isDemo: true,
      limit: usage.limit,
      alertLimit: usage.alertLimit,
    });
  } catch (error) {
    console.error("Demo usage API error:", error);
    return successResponse({ analysesUsed: 0, alertsUsed: 0, isDemo: false });
  }
}
