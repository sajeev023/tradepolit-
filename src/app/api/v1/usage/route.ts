import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getCurrentUsage } from "@/lib/limit-checker";
import { successResponse, unauthorizedError, internalError } from "@/lib/api-helpers";

export async function GET(_request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const usage = await getCurrentUsage(user.id, user.email);

    return successResponse(usage);
  } catch (err) {
    console.error("Usage API error:", err);
    return internalError("Failed to fetch usage data");
  }
}
