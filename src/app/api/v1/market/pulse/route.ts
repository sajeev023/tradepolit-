import { NextRequest } from "next/server";
import { getMarketPulse } from "@/lib/market-pulse";
import { successResponse } from "@/lib/api-helpers";
import { dispatchCaughtError } from "@/lib/typed-errors";

export async function GET(_request: NextRequest) {
  try {
    const pulse = await getMarketPulse();
    return successResponse(pulse);
  } catch (error) {
    console.error("Market pulse API route error:", error);
    return dispatchCaughtError("Failed to fetch market pulse data", error);
  }
}
