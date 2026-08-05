import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { successResponse, unauthorizedError } from "@/lib/api-helpers";
import { dispatchCaughtError, rateLimitedError } from "@/lib/typed-errors";
import { checkUserRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    // Runs 3 DB `contains` queries per call — rate limit to prevent abuse.
    const rl = checkUserRateLimit(user.id, request, "search", 30, 60_000);
    if (!rl.result.allowed) {
      const retryAfterSec = Math.ceil((rl.result.resetAt - Date.now()) / 1000);
      return rateLimitedError(retryAfterSec * 1000, "Search rate limit exceeded. Please slow down.");
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    // Cap query length to prevent expensive LIKE scans.
    const cappedQuery = query.slice(0, 100);

    if (!query.trim()) {
      return successResponse({ trades: [], strategies: [], news: [], assets: [] });
    }

    const cleanQuery = query.trim().toLowerCase();

    // 1. Search user's trades
    const trades = await prisma.trade.findMany({
      where: {
        userId: user.id,
        OR: [
          { instrument: { contains: cleanQuery } },
          { notes: { contains: cleanQuery } },
          { lessonsLearned: { contains: cleanQuery } },
        ],
      },
      take: 5,
    });

    // 2. Search user's strategies
    const strategies = await prisma.strategy.findMany({
      where: {
        userId: user.id,
        OR: [
          { name: { contains: cleanQuery } },
          { description: { contains: cleanQuery } },
        ],
      },
      take: 5,
    });

    // 3. Search public news feed
    const news = await prisma.news.findMany({
      where: {
        OR: [
          { headline: { contains: cleanQuery } },
          { summary: { contains: cleanQuery } },
        ],
      },
      take: 5,
    });

    // 4. Search matching symbols
    const AVAILABLE_SYMBOLS = ["BTC/USD", "ETH/USD", "SOL/USD", "EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD", "NASDAQ", "S&P500"];
    const matchingSymbols = AVAILABLE_SYMBOLS.filter((symbol) =>
      symbol.toLowerCase().includes(cleanQuery)
    );

    return successResponse({
      trades,
      strategies,
      news,
      assets: matchingSymbols.map((sym) => ({ symbol: sym })),
    });
  } catch (error) {
    console.error("Global search API error:", error);
    return dispatchCaughtError("Failed to execute search queries", error);
  }
}
