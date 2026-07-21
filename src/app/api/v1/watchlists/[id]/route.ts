import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  successResponse,
  unauthorizedError,
  notFoundError,
  validationError,
  internalError,
} from "@/lib/api-helpers";

const updateWatchlistSchema = z.object({
  name: z.string().min(1).optional(),
  instruments: z.array(z.string()).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

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

    const updateData: any = { ...validation.data };
    if (updateData.instruments) {
      updateData.instruments = [...new Set(updateData.instruments)];
    }

    const updated = await prisma.watchlist.update({
      where: { id },
      data: updateData,
    });

    return successResponse(updated);
  } catch (error) {
    console.error("Update watchlist API error:", error);
    return internalError("Failed to update watchlist");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

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
    return internalError("Failed to delete watchlist");
  }
}
