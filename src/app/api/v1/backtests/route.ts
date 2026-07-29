import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { runBacktestJob } from "@/lib/backtest-service";
import {
  successResponse,
  unauthorizedError,
  validationError,
  validationErrorFromIssues,
} from "@/lib/api-helpers";
import { dispatchCaughtError, rateLimitedError } from "@/lib/typed-errors";
import { checkUserRateLimit } from "@/lib/rate-limit";
import type { BacktestPendingResults } from "@/lib/types";

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

    // Rate limit backtest creation: 10 / min per user. Each backtest spawns a
    // background job that fetches OHLCV history — an unbounded loop starves the
    // data provider and the worker.
    const rl = checkUserRateLimit(user.id, request, "backtests", 10, 60_000);
    if (!rl.result.allowed) {
      return rateLimitedError(rl.result.resetAt - Date.now(), "Too many backtests. Please slow down.");
    }

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
      return validationErrorFromIssues([
        { path: ["strategyId"], message: "Strategy not found" },
      ]);
    }

    // Create Backtest entry with status PENDING
    const pendingResults: BacktestPendingResults = { metrics: { startBalance } };
    const backtest = await prisma.backtest.create({
      data: {
        userId: user.id,
        strategyId,
        instrument,
        timeframe,
        dateFrom: dateFrom ? new Date(dateFrom) : new Date(Date.now() - 365 * 24 * 3600 * 1000), // default 1 year
        dateTo: dateTo ? new Date(dateTo) : new Date(),
        resultsJson: pendingResults as unknown as Prisma.InputJsonValue,
      },
    });

    // Run async backtest job in background (do not block client request)
    runBacktestJob(backtest.id, startBalance).catch((err) => {
      console.error(`Background backtest ${backtest.id} failed:`, err);
    });

    return successResponse(backtest, 202); // 202 Accepted
  } catch (error) {
    console.error("Trigger backtest API error:", error);
    return dispatchCaughtError("Failed to trigger backtest run", error);
  }
}
