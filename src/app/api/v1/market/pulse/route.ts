import { NextRequest } from "next/server";
import { getMarketPulse } from "@/lib/market-pulse";
import { successResponse } from "@/lib/api-helpers";
import { dispatchCaughtError, rateLimitedError } from "@/lib/typed-errors";
import { checkIpRateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    // Public endpoint — rate limit by IP to prevent abuse / DoS.
    const rl = checkIpRateLimit(request, "market-pulse", 30, 60_000);
    if (!rl.allowed) {
      const retryAfterSec = Math.ceil((rl.resetAt - Date.now()) / 1000);
      return rateLimitedError(retryAfterSec * 1000, "Rate limit exceeded. Please slow down.");
    }
    const pulse = await getMarketPulse();
    return successResponse(pulse);
  } catch (error) {
    console.error("Market pulse API route error:", error);
    return dispatchCaughtError("Failed to fetch market pulse data", error);
  }
}
