import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { successResponse, unauthorizedError } from "@/lib/api-helpers";
import { dispatchCaughtError, rateLimitedError } from "@/lib/typed-errors";
import { checkUserRateLimit } from "@/lib/rate-limit";
import { SUPPORTED_SYMBOLS, getSymbolsForMarket, type MarketRegion } from "@/lib/supported-symbols";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    // Rate limit global search: 30 / min per user. A single request fans out to
    // four parallel Prisma queries plus an in-memory symbol scan; an unbounded
    // loop floods the DB connection pool.
    const rl = checkUserRateLimit(user.id, request, "search", 30, 60_000);
    if (!rl.result.allowed) {
      return rateLimitedError(rl.result.resetAt - Date.now(), "Too many searches. Please slow down.");
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const market = searchParams.get("market") as MarketRegion | null;

    if (!query.trim()) {
      return successResponse({ trades: [], strategies: [], news: [], assets: [] });
    }

    const cleanQuery = query.trim().toLowerCase();

    // 1. Search user's trades
    const trades = await prisma.trade.findMany({
      where: {
        userId: user.id,
        OR: [
          { instrument: { contains: cleanQuery, mode: "insensitive" as const } },
          { notes: { contains: cleanQuery, mode: "insensitive" as const } },
          { lessonsLearned: { contains: cleanQuery, mode: "insensitive" as const } },
        ],
      },
      take: 5,
    });

    // 2. Search user's strategies
    const strategies = await prisma.strategy.findMany({
      where: {
        userId: user.id,
        OR: [
          { name: { contains: cleanQuery, mode: "insensitive" as const } },
          { description: { contains: cleanQuery, mode: "insensitive" as const } },
        ],
      },
      take: 5,
    });

    // 3. Search public news feed
    const news = await prisma.news.findMany({
      where: {
        OR: [
          { headline: { contains: cleanQuery, mode: "insensitive" as const } },
          { summary: { contains: cleanQuery, mode: "insensitive" as const } },
        ],
      },
      take: 5,
    });

    // 4. Search matching symbols filtered by preferred market if provided
    const pool = market ? getSymbolsForMarket(market) : SUPPORTED_SYMBOLS;
    const matchingSymbols = pool
      .filter((s) =>
        s.symbol.toLowerCase().includes(cleanQuery) ||
        s.displayName.toLowerCase().includes(cleanQuery)
      )
      .slice(0, 10)
      .map((s) => ({ symbol: s.symbol, displayName: s.displayName, assetClass: s.assetClass, region: s.region }));

    return successResponse({
      trades,
      strategies,
      news,
      assets: matchingSymbols,
    });
  } catch (error) {
    console.error("Global search API error:", error);
    return dispatchCaughtError("Failed to execute search queries", error);
  }
}
