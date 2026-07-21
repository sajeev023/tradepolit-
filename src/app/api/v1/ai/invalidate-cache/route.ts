import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { successResponse, unauthorizedError, validationError } from "@/lib/api-helpers";
import { z } from "zod";

const invalidateSchema = z.object({
  symbol: z.string().min(1),
  timeframe: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const json = await request.json();
    const validation = invalidateSchema.safeParse(json);
    if (!validation.success) return validationError(validation.error);

    const { symbol, timeframe } = validation.data;

    await prisma.conversationMemory.deleteMany({
      where: {
        userId: user.id,
        role: "cached_analysis",
        chatId: `${symbol}-${timeframe}`,
      },
    });

    console.log(`[INVALIDATE CACHE] Invalidated cache for ${symbol} ${timeframe}`);
    return successResponse({ invalidated: true, symbol, timeframe });
  } catch (err: any) {
    console.error("Cache invalidation error:", err?.message);
    return successResponse({ invalidated: false, error: "Failed to invalidate cache" });
  }
}
