import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  successResponse,
  unauthorizedError,
  validationError,
  internalError,
} from "@/lib/api-helpers";

const createWatchlistSchema = z.object({
  name: z.string().min(1, "Watchlist name is required"),
  instruments: z.array(z.string()).default([]),
});

export async function GET(request: NextRequest) {
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
    return internalError("Failed to list watchlists");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

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
    return internalError("Failed to create watchlist");
  }
}
