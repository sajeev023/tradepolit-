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

const updateTradeSchema = z.object({
  instrument: z.string().min(1).optional(),
  assetClass: z.enum(["CRYPTO", "FOREX", "COMMODITY", "INDEX"]).optional(),
  direction: z.enum(["LONG", "SHORT"]).optional(),
  entryPrice: z.number().positive().optional(),
  exitPrice: z.number().positive().nullable().optional(),
  size: z.number().positive().optional(),
  leverage: z.number().positive().optional(),
  stopLoss: z.number().positive().nullable().optional(),
  takeProfit: z.number().positive().nullable().optional(),
  status: z.enum(["OPEN", "CLOSED"]).optional(),
  openedAt: z.string().transform((val) => new Date(val)).optional(),
  closedAt: z.string().transform((val) => new Date(val)).nullable().optional(),
  strategyId: z.string().uuid().nullable().optional(),
  emotionTag: z
    .enum([
      "CONFIDENT",
      "FEARFUL",
      "GREEDY",
      "REVENGE",
      "FOMO",
      "DISCIPLINED",
      "NEUTRAL",
    ])
    .nullable()
    .optional(),
  mistakeTags: z.array(z.string()).optional(),
  lessonsLearned: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  screenshots: z.array(z.string()).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const { id } = await params;

    const trade = await prisma.trade.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        strategy: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!trade) {
      return notFoundError("Trade");
    }

    return successResponse(trade);
  } catch (error) {
    console.error("Get trade API error:", error);
    return internalError("Failed to fetch trade");
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const { id } = await params;

    // Verify ownership
    const existingTrade = await prisma.trade.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingTrade) {
      return notFoundError("Trade");
    }

    const json = await request.json();
    const validation = updateTradeSchema.safeParse(json);
    if (!validation.success) {
      return validationError(validation.error);
    }

    const data = validation.data;

    // Build update payload
    const updateData: any = {};

    // Copy primitive fields
    if (data.instrument !== undefined) updateData.instrument = data.instrument;
    if (data.assetClass !== undefined) updateData.assetClass = data.assetClass;
    if (data.direction !== undefined) updateData.direction = data.direction;
    if (data.openedAt !== undefined) updateData.openedAt = data.openedAt;
    if (data.strategyId !== undefined) updateData.strategyId = data.strategyId;
    if (data.emotionTag !== undefined) updateData.emotionTag = data.emotionTag;
    if (data.mistakeTags !== undefined) updateData.mistakeTags = data.mistakeTags;
    if (data.lessonsLearned !== undefined) updateData.lessonsLearned = data.lessonsLearned;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.screenshots !== undefined) updateData.screenshots = data.screenshots;

    // Map Decimal fields
    if (data.entryPrice !== undefined) updateData.entryPrice = data.entryPrice;
    if (data.size !== undefined) updateData.size = data.size;
    if (data.leverage !== undefined) updateData.leverage = data.leverage;

    // Map nullable Decimal fields
    if (data.exitPrice !== undefined) {
      updateData.exitPrice = data.exitPrice;
    }
    if (data.stopLoss !== undefined) {
      updateData.stopLoss = data.stopLoss;
    }
    if (data.takeProfit !== undefined) {
      updateData.takeProfit = data.takeProfit;
    }
    if (data.closedAt !== undefined) updateData.closedAt = data.closedAt;

    // Status management
    if (data.status !== undefined) {
      updateData.status = data.status;
    } else if (data.exitPrice !== undefined) {
      updateData.status = data.exitPrice ? "CLOSED" : "OPEN";
    }

    // Merge old & new values for recalculating formulas
    const finalDirection = data.direction ?? existingTrade.direction;
    const finalEntryPrice = data.entryPrice ?? Number(existingTrade.entryPrice);
    const finalExitPrice = data.exitPrice !== undefined 
      ? (data.exitPrice ?? null)
      : (existingTrade.exitPrice ? Number(existingTrade.exitPrice) : null);
    const finalSize = data.size ?? Number(existingTrade.size);
    const finalLeverage = data.leverage ?? Number(existingTrade.leverage);
    const finalStopLoss = data.stopLoss !== undefined
      ? (data.stopLoss ?? null)
      : (existingTrade.stopLoss ? Number(existingTrade.stopLoss) : null);

    // Recalculate pnl and rMultiple
    if (finalExitPrice !== null) {
      const mult = finalDirection === "LONG" ? 1 : -1;
      let computedPnl = mult * (finalExitPrice - finalEntryPrice) * finalSize * finalLeverage;
      
      const isJpyQuote = (data.instrument ?? existingTrade.instrument).toUpperCase().replace("-", "").replace("/", "") === "USDJPY";
      if (isJpyQuote) {
        computedPnl = computedPnl / finalExitPrice;
      }
      
      updateData.pnl = computedPnl;

      if (finalStopLoss !== null) {
        const risk = finalDirection === "LONG"
          ? finalEntryPrice - finalStopLoss
          : finalStopLoss - finalEntryPrice;

        if (risk > 0) {
          const reward = finalDirection === "LONG"
            ? finalExitPrice - finalEntryPrice
            : finalEntryPrice - finalExitPrice;
          updateData.rMultiple = reward / risk;
        } else {
          updateData.rMultiple = null;
        }
      } else {
        updateData.rMultiple = null;
      }
    } else {
      updateData.pnl = null;
      updateData.rMultiple = null;
      updateData.status = "OPEN";
      updateData.closedAt = null;
    }

    const updatedTrade = await prisma.trade.update({
      where: { id },
      data: updateData,
    });

    return successResponse(updatedTrade);
  } catch (error) {
    console.error("Update trade API error:", error);
    return internalError("Failed to update trade");
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

    // Verify ownership
    const existingTrade = await prisma.trade.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingTrade) {
      return notFoundError("Trade");
    }

    await prisma.trade.delete({
      where: { id },
    });

    return successResponse({ deleted: true });
  } catch (error) {
    console.error("Delete trade API error:", error);
    return internalError("Failed to delete trade");
  }
}
