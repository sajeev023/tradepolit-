import { NextRequest } from "next/server";
import { z } from "zod";
import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { getMaxLeverage } from "@/lib/risk-engine";
import {
  successResponse,
  unauthorizedError,
  notFoundError,
  validationError,
} from "@/lib/api-helpers";
import { dispatchCaughtError } from "@/lib/typed-errors";

const updateTradeSchema = z.object({
  instrument: z.string().min(1).optional(),
  assetClass: z.enum(["CRYPTO", "FOREX", "COMMODITY", "INDEX", "STOCK"]).optional(),
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
    return dispatchCaughtError("Failed to fetch trade", error);
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

    const json = await request.json();
    const validation = updateTradeSchema.safeParse(json);
    if (!validation.success) {
      return validationError(validation.error);
    }

    const data = validation.data;

    // Read, recompute, and update inside a single transaction. The prior
    // implementation read the trade, recomputed PnL/R-multiple, then issued a
    // separate, non-transactional update — two concurrent PATCHes (e.g. closing
    // a trade from two clients) could race on the read-then-write and clobber
    // each other's PnL. Performing the ownership check, recompute, and update
    // within prisma.$transaction makes the close-update atomic and serializes
    // concurrent edits at the row level.
    let notFound = false;
    const updatedTrade = await prisma.$transaction(async (tx) => {
      // Verify ownership inside the transaction.
      const existingTrade = await tx.trade.findFirst({
        where: { id, userId: user.id },
      });
      if (!existingTrade) {
        notFound = true;
        return null;
      }

      // Build update payload
      const updateData: any = {};

      // Cap leverage to the per-asset maximum defined by the risk engine.
      if (data.leverage !== undefined) {
        const instrument = data.instrument ?? existingTrade.instrument;
        data.leverage = getMaxLeverage(instrument, data.leverage);
      }

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

      // Recalculate pnl and rMultiple using decimal.js for precision. The risk
      // engine uses Decimal; computing PnL/R-multiple in IEEE-754 floats here
      // produced cent-level rounding errors on large sizes and on the JPY-quote
      // conversion, which then polluted the performance dashboard aggregates.
      if (finalExitPrice !== null) {
        const mult = finalDirection === "LONG" ? 1 : -1;
        let computedPnl = new Decimal(finalExitPrice)
          .minus(finalEntryPrice)
          .times(mult)
          .times(finalSize)
          .times(finalLeverage);

        const instrumentNorm = (data.instrument ?? existingTrade.instrument)
          .toUpperCase()
          .replace("-", "")
          .replace("/", "");
        if (instrumentNorm === "USDJPY") {
          // Convert JPY-denominated profit to USD by dividing by the exit price.
          computedPnl = computedPnl.dividedBy(finalExitPrice);
        }

        updateData.pnl = computedPnl.toNumber();

        if (finalStopLoss !== null) {
          const risk =
            finalDirection === "LONG"
              ? new Decimal(finalEntryPrice).minus(finalStopLoss)
              : new Decimal(finalStopLoss).minus(finalEntryPrice);

          if (risk.greaterThan(0)) {
            const reward =
              finalDirection === "LONG"
                ? new Decimal(finalExitPrice).minus(finalEntryPrice)
                : new Decimal(finalEntryPrice).minus(finalExitPrice);
            updateData.rMultiple = reward.dividedBy(risk).toNumber();
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

      return tx.trade.update({ where: { id }, data: updateData });
    });

    if (notFound || !updatedTrade) {
      return notFoundError("Trade");
    }

    return successResponse(updatedTrade);
  } catch (error) {
    console.error("Update trade API error:", error);
    return dispatchCaughtError("Failed to update trade", error);
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
    return dispatchCaughtError("Failed to delete trade", error);
  }
}
