import { NextRequest } from "next/server";
import { prewarmDefaultChart } from "@/lib/prewarm";
import { successResponse, unauthorizedError } from "@/lib/api-helpers";
import { dispatchCaughtError } from "@/lib/typed-errors";
import { secureBearerMatch } from "@/lib/secure-compare";

export async function GET(request: NextRequest) {
  try {
    const adminSecret = process.env.ADMIN_SECRET;
    const authorization = request.headers.get("authorization");
    // Constant-time comparison: a plain `!==` short-circuits on the first
    // differing byte and is a timing side-channel for secret recovery.
    // secureBearerMatch also fails closed (returns false) when the secret is
    // unset, so the separate !adminSecret check is no longer needed.
    if (!secureBearerMatch(authorization, adminSecret)) {
      return unauthorizedError("Invalid or missing admin secret");
    }

    const result = await prewarmDefaultChart();
    return successResponse({
      message: "Default chart pre-warmed successfully",
      ...result,
    });
  } catch (error: any) {
    console.error("Prewarm endpoint error:", error);
    return dispatchCaughtError("Prewarm failed", error);
  }
}
