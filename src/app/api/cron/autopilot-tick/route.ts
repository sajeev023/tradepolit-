import { NextRequest } from "next/server";
import { successResponse, unauthorizedError } from "@/lib/api-helpers";
import { dispatchCaughtError } from "@/lib/typed-errors";
import { secureBearerMatch } from "@/lib/secure-compare";
import { tickAllActive } from "@/lib/autopilot/service";

export const maxDuration = 60;

/**
 * GET /api/cron/autopilot-tick — catch every live paper session up with the
 * candles that closed since it last ran, so stops, targets and guardrails are
 * applied even when the user is away. Replay is deterministic and idempotent.
 *
 * Auth: Bearer CRON_SECRET (constant-time compared), same as the other crons.
 */
export async function GET(request: NextRequest) {
  try {
    if (!secureBearerMatch(request.headers.get("authorization"), process.env.CRON_SECRET)) {
      return unauthorizedError("Invalid or missing CRON_SECRET");
    }
    return successResponse(await tickAllActive());
  } catch (err) {
    return dispatchCaughtError("Autopilot tick cron failed", err);
  }
}
