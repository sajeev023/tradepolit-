import { NextRequest } from "next/server";
import { getMarketPulse } from "@/lib/market-pulse";
import { successResponse, internalError } from "@/lib/api-helpers";

export async function GET(_request: NextRequest) {
  try {
    const pulse = await getMarketPulse();
    return successResponse(pulse);
  } catch (error) {
    console.error("Market pulse API route error:", error);
    return internalError("Failed to fetch market pulse data");
  }
}
