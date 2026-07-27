import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { successResponse, unauthorizedError } from "@/lib/api-helpers";
import { dispatchCaughtError } from "@/lib/typed-errors";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

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
