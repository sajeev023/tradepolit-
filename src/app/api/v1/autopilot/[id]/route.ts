import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import { notFoundError, successResponse, unauthorizedError, validationError } from "@/lib/api-helpers";
import { dispatchCaughtError } from "@/lib/typed-errors";
import { presentSession } from "@/lib/autopilot/present";
import { applyAction, getSession, tickSession } from "@/lib/autopilot/service";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/v1/autopilot/:id — one session, brought up to date first. */
export async function GET(_request: NextRequest, ctx: Ctx) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const { id } = await ctx.params;
    const row = await getSession(user.id, id);
    if (!row) return notFoundError("Autopilot session");

    const fresh = await tickSession(row);
    return successResponse(presentSession(fresh.row, fresh.warning));
  } catch (err) {
    return dispatchCaughtError("Failed to load Autopilot session", err);
  }
}

const actionSchema = z.object({ action: z.enum(["pause", "resume", "stop"]) });

/**
 * PATCH /api/v1/autopilot/:id — pause, resume, or stop. Stopping closes every
 * open paper position at its last mark and ends the session for good.
 */
export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const parsed = actionSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);

    const { id } = await ctx.params;
    const row = await getSession(user.id, id);
    if (!row) return notFoundError("Autopilot session");

    // Catch up first so a stop closes positions at the freshest mark.
    const fresh = await tickSession(row);
    const updated = await applyAction(fresh.row, parsed.data.action);
    return successResponse(presentSession(updated, fresh.warning));
  } catch (err) {
    return dispatchCaughtError("Failed to update Autopilot session", err);
  }
}
