import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import { conflictError, errorResponse, successResponse, unauthorizedError, validationError } from "@/lib/api-helpers";
import { dispatchCaughtError } from "@/lib/typed-errors";
import { getEntitlementForUser } from "@/lib/entitlements";
import { assessGoal } from "@/lib/autopilot/goal";
import { presentSession } from "@/lib/autopilot/present";
import {
  AUTOPILOT_SYMBOLS,
  SessionLimitError,
  createSession,
  listSessions,
  tickSession,
} from "@/lib/autopilot/service";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Demo visitors get one paper session to try; real accounts get the full limit. */
const DEMO_MAX_SESSIONS = 1;

/**
 * GET /api/v1/autopilot — the user's paper sessions, each brought up to date
 * with every candle that closed since it last ran.
 */
export async function GET() {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const rows = await listSessions(user.id);
    const fresh = await Promise.all(
      rows.map(async (row) => {
        try {
          return await tickSession(row);
        } catch {
          return { row, warning: "Could not refresh this session just now." };
        }
      }),
    );
    return successResponse(fresh.map((f) => presentSession(f.row, f.warning)));
  } catch (err) {
    return dispatchCaughtError("Failed to load Autopilot sessions", err);
  }
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  startingBalance: z.number().finite(),
  targetBalance: z.number().finite(),
  horizonDays: z.number().int(),
  riskProfile: z.enum(["CONSERVATIVE", "BALANCED", "AGGRESSIVE"]),
  symbols: z
    .array(z.string())
    .min(1)
    .max(AUTOPILOT_SYMBOLS.length)
    .refine((list) => list.every((s) => AUTOPILOT_SYMBOLS.includes(s)), { message: "Unsupported symbol" }),
});

/** POST /api/v1/autopilot — start a paper session. Paper money only. */
export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const body = await request.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const input = parsed.data;

    const goal = assessGoal(input.startingBalance, input.targetBalance, input.horizonDays);
    if (goal.verdict === "INVALID") return errorResponse("VALIDATION_ERROR", goal.message, 400);

    const entitlement = getEntitlementForUser(user.id, user.email ?? undefined);
    const row = await createSession({
      userId: user.id,
      name: input.name ?? `Paper $${input.startingBalance.toLocaleString("en-US")} → $${input.targetBalance.toLocaleString("en-US")}`,
      startingBalance: input.startingBalance,
      targetBalance: input.targetBalance,
      horizonDays: input.horizonDays,
      riskProfile: input.riskProfile,
      symbols: input.symbols,
      maxSessions: entitlement.plan === "YC_DEMO" ? DEMO_MAX_SESSIONS : undefined,
    });
    return successResponse(presentSession(row), 201);
  } catch (err) {
    if (err instanceof SessionLimitError) return conflictError(err.message);
    return dispatchCaughtError("Failed to start Autopilot session", err);
  }
}
