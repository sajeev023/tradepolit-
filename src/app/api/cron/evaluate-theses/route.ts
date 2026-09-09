import { NextRequest } from "next/server";
import { successResponse, unauthorizedError } from "@/lib/api-helpers";
import { dispatchCaughtError } from "@/lib/typed-errors";
import { secureBearerMatch } from "@/lib/secure-compare";
import { evaluateAllOpenThesesBatched } from "@/lib/thesis-service";

export const maxDuration = 60;

/**
 * GET /api/cron/evaluate-theses — resolve open theses across all users.
 *
 * Auth: Bearer CRON_SECRET (constant-time compared), same convention as
 * evaluate-alerts. Vercel Cron runs this every 5 minutes; users also get
 * an on-load evaluation pass when they open the theses page.
 *
 * V3: BATCHED evaluation. One market-data pass per distinct
 * (symbol, timeframe) pair shared across ALL users — upstream cost is
 * bound by market cardinality, not user count. Replaces the per-user
 * loop that re-fetched the same candles per user and capped at 500
 * users. Ceiling lifted ~30x at unchanged provider cost.
 */
export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authorization = request.headers.get("authorization");
    if (!secureBearerMatch(authorization, cronSecret)) {
      return unauthorizedError("Invalid or missing CRON_SECRET");
    }

    const result = await evaluateAllOpenThesesBatched();
    return successResponse(result);
  } catch (err) {
    return dispatchCaughtError("Thesis evaluation cron failed", err);
  }
}