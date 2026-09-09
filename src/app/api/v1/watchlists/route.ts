import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  successResponse,
  unauthorizedError,
  validationError,
  errorResponse,
} from "@/lib/api-helpers";
import { isDemoUser, getDemoFeatureLockedError } from "@/lib/demo-limits";
import { dispatchCaughtError } from "@/lib/typed-errors";

function demoWatchlistLocked() {
  const e = getDemoFeatureLockedError("watchlistEdit");
  return errorResponse(e.error, e.message, 403, { cta: e.cta, ctaLink: e.ctaLink });
}

const createWatchlistSchema = z.object({
  name: z.string().min(1, "Watchlist name is required"),
  instruments: z.array(z.string()).default([]),
});

export async function GET(_request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const watchlists = await prisma.watchlist.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(watchlists);
  } catch (error) {
    console.error("List watchlists API error:", error);
    return dispatchCaughtError("Failed to list watchlists", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    // Demo users can't edit watchlists (per entitlements).
    if (isDemoUser(user.id, user.email ?? undefined)) {
      return demoWatchlistLocked();
    }

    const json = await request.json();
    const validation = createWatchlistSchema.safeParse(json);
    if (!validation.success) {
      return validationError(validation.error);
    }

    const { name, instruments } = validation.data;
    const deduped = [...new Set(instruments)];

    const watchlist = await prisma.watchlist.create({
      data: {
        userId: user.id,
        name,
        instruments: deduped,
      },
    });

    return successResponse(watchlist, 201);
  } catch (error) {
    console.error("Create watchlist API error:", error);
    return dispatchCaughtError("Failed to create watchlist", error);
  }
}
