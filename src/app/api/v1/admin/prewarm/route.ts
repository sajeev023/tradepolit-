import { NextRequest } from "next/server";
import { prewarmDefaultChart } from "@/lib/prewarm";
import { successResponse, internalError } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const result = await prewarmDefaultChart();
    return successResponse({
      message: "Default chart pre-warmed successfully",
      ...result,
    });
  } catch (error: any) {
    console.error("Prewarm endpoint error:", error);
    return internalError(`Prewarm failed: ${error?.message || error}`);
  }
}
