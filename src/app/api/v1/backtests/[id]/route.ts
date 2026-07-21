import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  successResponse,
  unauthorizedError,
  notFoundError,
  internalError,
} from "@/lib/api-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const { id } = await params;

    const backtest = await prisma.backtest.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        strategy: true,
      },
    });

    if (!backtest) {
      return notFoundError("Backtest job");
    }

    return successResponse(backtest);
  } catch (error) {
    console.error("Get backtest details API error:", error);
    return internalError("Failed to fetch backtest details");
  }
}
