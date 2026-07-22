import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getCurrentUsage } from "@/lib/limit-checker";
import { successResponse, unauthorizedError } from "@/lib/api-helpers";
import { dispatchCaughtError } from "@/lib/typed-errors";

export async function GET(_request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const usage = await getCurrentUsage(user.id, user.email);

    return successResponse(usage);
  } catch (err) {
    console.error("Usage API error:", err);
    return dispatchCaughtError("Failed to fetch usage data", err);
  }
}
