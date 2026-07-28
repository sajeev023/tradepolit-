import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { successResponse, unauthorizedError } from "@/lib/api-helpers";
import { dispatchCaughtError } from "@/lib/typed-errors";

import { resolvePlan } from "@/lib/entitlements";

// GET /api/v1/performance/summary
export async function GET(_request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const userProfile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
      select: { plan: true, subscriptionStatus: true, subscriptionExpiresAt: true },
    });
    const plan = resolvePlan(
      user.id,
      user.email,
      userProfile?.plan,
      userProfile?.subscriptionStatus,
      userProfile?.subscriptionExpiresAt
    );
    if (plan !== "PRO") {
      return new Response(JSON.stringify({ error: { message: "Upgrade to Pro to access this feature" } }), { status: 403, headers: { "Content-Type": "application/json" } });
    }

    const userId = user.id;

    // Fetch closed trades (the only rows the metrics below consume) and the
    // open-position count in parallel. The prior implementation loaded EVERY
    // trade (open + closed) and then filtered in memory — for a user with many
    // open positions that pulled large rows (screenshots, notes) only to
    // discard them. Querying CLOSED rows directly and counting OPEN rows
    // avoids hydrating open rows entirely.
    const [closedTrades, openCount] = await Promise.all([
      prisma.trade.findMany({
        where: { userId, status: "CLOSED" },
        orderBy: { openedAt: "desc" },
      }),
      prisma.trade.count({ where: { userId, status: "OPEN" } }),
    ]);

    const totalTrades = closedTrades.length;
    const wins = closedTrades.filter((t: any) => Number(t.pnl || 0) > 0);
    const losses = closedTrades.filter((t: any) => Number(t.pnl || 0) < 0);
    const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;

    // Average R:R planned (average of strategy target R:R or leverage-implied) vs achieved
    const avgRRAchieved = totalTrades > 0
      ? closedTrades.reduce((acc: number, t: any) => acc + Number(t.rMultiple || 0), 0) / totalTrades
      : 0;
    
    // Find best performing symbol
    const symbolPnL: Record<string, number> = {};
    closedTrades.forEach((t: any) => {
      symbolPnL[t.instrument] = (symbolPnL[t.instrument] || 0) + Number(t.pnl || 0);
    });
    let bestSymbol = "N/A";
    let maxPnL = -Infinity;
    Object.entries(symbolPnL).forEach(([sym, pnl]) => {
      if (pnl > maxPnL) {
        maxPnL = pnl;
        bestSymbol = sym;
      }
    });

    // Best performing session (London, NY, Asia)
    const sessionPnL: Record<string, number> = { LONDON: 0, NY: 0, ASIA: 0 };
    closedTrades.forEach((t: any) => {
      const hour = new Date(t.openedAt).getUTCHours();
      if (hour >= 7 && hour < 15) sessionPnL.LONDON += Number(t.pnl || 0);
      else if (hour >= 13 && hour < 21) sessionPnL.NY += Number(t.pnl || 0);
      else sessionPnL.ASIA += Number(t.pnl || 0);
    });
    let bestSession = "N/A";
    let maxSessionPnL = -Infinity;
    Object.entries(sessionPnL).forEach(([sess, pnl]) => {
      if (pnl > maxSessionPnL && pnl > 0) {
        maxSessionPnL = pnl;
        bestSession = sess;
      }
    });

    // Behavioral insights for last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentEvents = await prisma.behavioralEvent.findMany({
      where: {
        userId,
        createdAt: { gte: sevenDaysAgo },
      },
    });

    const revengeCount = recentEvents.filter((e: any) => e.eventType === "revenge_trade").length;
    const overtradingCount = recentEvents.filter((e: any) => e.eventType === "overtrading").length;

    // Build simple behavioral insight text
    let behavioralInsight = "No anomalies detected this week. Excellent discipline.";
    if (revengeCount > 0 || overtradingCount > 0) {
      behavioralInsight = `This week: ${revengeCount} revenge trade${revengeCount !== 1 ? "s" : ""} flagged. ${overtradingCount} overtrading alert${overtradingCount !== 1 ? "s" : ""}.`;
    }

    // Cumulative P&L curve for AreaChart
    // Cumulative P&L builds up from oldest to newest
    let cumPnL = 0;
    const equityCurve = closedTrades
      .slice()
      .reverse()
      .map((t: any) => {
        cumPnL += Number(t.pnl || 0);
        return {
          date: new Date(t.openedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          pnl: cumPnL,
        };
      });

    return successResponse({
      metrics: {
        totalTrades,
        winRate,
        wins: wins.length,
        losses: losses.length,
        avgRRAchieved,
        bestSymbol,
        bestSession,
      },
      behavioralInsight,
      equityCurve,
      recentTrades: closedTrades.slice(0, 5).map((t: any) => ({
        id: t.id,
        instrument: t.instrument,
        direction: t.direction,
        pnl: Number(t.pnl || 0),
        openedAt: t.openedAt,
      })),
      openPositionsCount: openCount,
    });
  } catch (err) {
    console.error("Summary statistics error:", err);
    return dispatchCaughtError("Failed to fetch performance summary", err);
  }
}
