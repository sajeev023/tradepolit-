import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  successResponse,
  unauthorizedError,
  notFoundError,
  validationError,
  errorResponse,
} from "@/lib/api-helpers";
import { isDemoUser, getDemoFeatureLockedError } from "@/lib/demo-limits";
import { dispatchCaughtError } from "@/lib/typed-errors";

function demoWatchlistLocked() {
  const e = getDemoFeatureLockedError("watchlistEdit");
  return errorResponse(e.error, e.message, 403, { cta: e.cta, ctaLink: e.ctaLink });
}

const updateWatchlistSchema = z.object({
  name: z.string().trim().min(1, "Watchlist name is required").max(40, "Name must be 40 characters or fewer").optional(),
  instruments: z.array(z.string()).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    // Demo users can't edit watchlists (per entitlements).
    if (isDemoUser(user.id, user.email ?? undefined)) {
      return demoWatchlistLocked();
    }

    const { id } = await params;
    const watchlist = await prisma.watchlist.findFirst({
      where: { id, userId: user.id },
    });

    if (!watchlist) {
      return notFoundError("Watchlist");
    }

    const json = await request.json();
    const validation = updateWatchlistSchema.safeParse(json);
    if (!validation.success) {
      return validationError(validation.error);
    }

    // Build the update payload field-by-field so each value keeps its precise
    // type. Spreading `validation.data` widened `instruments` to the union
    // `string[] | WatchlistUpdateinstrumentsInput`, which then broke the dedupe
    // `new Set(...)` below.
    const updateData: Prisma.WatchlistUpdateInput = {};
    if (validation.data.name !== undefined) {
      updateData.name = validation.data.name;
    }
    if (validation.data.instruments !== undefined) {
      updateData.instruments = [...new Set(validation.data.instruments)];
    }

    const updated = await prisma.watchlist.update({
      where: { id },
      data: updateData,
    });

    return successResponse(updated);
  } catch (error) {
    console.error("Update watchlist API error:", error);
    return dispatchCaughtError("Failed to update watchlist", error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    // Demo users can't edit watchlists (per entitlements).
    if (isDemoUser(user.id, user.email ?? undefined)) {
      return demoWatchlistLocked();
    }

    const { id } = await params;
    const watchlist = await prisma.watchlist.findFirst({
      where: { id, userId: user.id },
    });

    if (!watchlist) {
      return notFoundError("Watchlist");
    }

    await prisma.watchlist.delete({
      where: { id },
    });

    return successResponse({ deleted: true });
  } catch (error) {
    console.error("Delete watchlist API error:", error);
    return dispatchCaughtError("Failed to delete watchlist", error);
  }
}
