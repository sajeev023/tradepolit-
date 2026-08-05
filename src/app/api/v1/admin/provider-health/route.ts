import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { successResponse, unauthorizedError, forbiddenError } from "@/lib/api-helpers";
import { getExtendedProviderHealth } from "@/lib/ai-providers";
import { dispatchCaughtError } from "@/lib/typed-errors";

/**
 * GET /api/v1/admin/provider-health
 *
 * Returns the live health of every provider the app depends on:
 *   - AI race: groq.key1, groq.key2, nvidia, gemini, openai
 *   - Market data: twelvedata
 *   - News: finnhub, newsapi
 *
 * Admin-only. No API keys are ever included in the response — only
 * presence/absence and a 6-char prefix + length.
 */
export async function GET(_request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();
    if (user.role !== "ADMIN") return forbiddenError();

    return successResponse(getExtendedProviderHealth());
  } catch (err: any) {
    console.error("[ADMIN] provider-health check failed:", err);
    return dispatchCaughtError("Failed to check provider health", err);
  }
}
