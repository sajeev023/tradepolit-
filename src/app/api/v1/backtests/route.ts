import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { runBacktestJob } from "@/lib/backtest-service";
import {
  successResponse,
  unauthorizedError,
  validationError,
  internalError,
} from "@/lib/api-helpers";

const runBacktestSchema = z.object({
  strategyId: z.string().min(1, "Strategy ID is required"),
  instrument: z.string().min(1, "Asset symbol is required"),
  timeframe: z.string().min(1, "Timeframe is required").default("1d"),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  startBalance: z.number().positive("Starting balance must be positive").default(10000),
});

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const json = await request.json();
    const validation = runBacktestSchema.safeParse(json);
    if (!validation.success) {
      return validationError(validation.error);
    }

    const { strategyId, instrument, timeframe, dateFrom, dateTo, startBalance } = validation.data;

    // Verify strategy exists
    const strategy = await prisma.strategy.findFirst({
      where: { id: strategyId, userId: user.id },
    });

    if (!strategy) {
      return validationError({
        issues: [{ path: ["strategyId"], message: "Strategy not found" }],
      } as any);
    }

    // Create Backtest entry with status PENDING
    const backtest = await prisma.backtest.create({
      data: {
        userId: user.id,
        strategyId,
        instrument,
        timeframe,
        dateFrom: dateFrom ? new Date(dateFrom) : new Date(Date.now() - 365 * 24 * 3600 * 1000), // default 1 year
        dateTo: dateTo ? new Date(dateTo) : new Date(),
        resultsJson: { metrics: { startBalance } } as any,
      },
    });

    // Run async backtest job in background (do not block client request)
    runBacktestJob(backtest.id, startBalance).catch((err) => {
      console.error(`Background backtest ${backtest.id} failed:`, err);
    });

    return successResponse(backtest, 202); // 202 Accepted
  } catch (error) {
    console.error("Trigger backtest API error:", error);
    return internalError("Failed to trigger backtest run");
  }
}
