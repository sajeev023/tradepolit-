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

const updateStrategySchema = z.object({
  name: z.string().min(1, "Strategy name is required").optional(),
  description: z.string().optional(),
  rulesConfig: z.object({
    entry: z.object({
      indicatorA: z.enum(["EMA20", "EMA50", "PRICE"]),
      operator: z.enum(["CROSSES_ABOVE", "CROSSES_BELOW", "GREATER_THAN", "LESS_THAN"]),
      indicatorB: z.enum(["EMA20", "EMA50", "PRICE"]),
    }),
    exit: z.object({
      indicatorA: z.enum(["EMA20", "EMA50", "PRICE"]),
      operator: z.enum(["CROSSES_ABOVE", "CROSSES_BELOW", "GREATER_THAN", "LESS_THAN"]),
      indicatorB: z.enum(["EMA20", "EMA50", "PRICE"]),
    }),
  }).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const { id } = await params;
    const strategy = await prisma.strategy.findFirst({
      where: { id, userId: user.id },
    });

    if (!strategy) {
      return notFoundError("Strategy");
    }

    const json = await request.json();
    const validation = updateStrategySchema.safeParse(json);
    if (!validation.success) {
      return validationError(validation.error);
    }

    const updated = await prisma.strategy.update({
      where: { id },
      data: {
        ...validation.data,
        rulesConfig: validation.data.rulesConfig
          ? (validation.data.rulesConfig as any)
          : undefined,
      },
    });

    return successResponse(updated);
  } catch (error) {
    console.error("Update strategy API error:", error);
    return internalError("Failed to update strategy");
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
    const strategy = await prisma.strategy.findFirst({
      where: { id, userId: user.id },
    });

    if (!strategy) {
      return notFoundError("Strategy");
    }

    // Check if strategy has associated active trades or backtests
    const tradeCount = await prisma.trade.count({ where: { strategyId: id } });
    if (tradeCount > 0) {
      return validationError({
        issues: [{ path: ["id"], message: `Cannot delete strategy linked to ${tradeCount} trade logs. Archive it instead.` }],
      } as any);
    }

    await prisma.strategy.delete({
      where: { id },
    });

    return successResponse({ deleted: true });
  } catch (error) {
    console.error("Delete strategy API error:", error);
    return internalError("Failed to delete strategy");
  }
}
