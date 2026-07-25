import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { successResponse, unauthorizedError } from "@/lib/api-helpers";
import { handleNvidiaError } from "@/lib/nvidia-ai";
import { callFastestAIModel } from "@/lib/ai-providers";
import { dispatchCaughtError } from "@/lib/typed-errors";

import { resolvePlan } from "@/lib/entitlements";

// POST /api/v1/ai/weekly-report
export async function POST(_request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const userProfile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
      select: { plan: true, subscriptionStatus: true },
    });
    const plan = resolvePlan(user.id, user.email, userProfile?.plan, userProfile?.subscriptionStatus);
    if (plan !== "PRO") {
      return new Response(JSON.stringify({ error: { message: "Upgrade to Pro to access this feature" } }), { status: 403, headers: { "Content-Type": "application/json" } });
    }

    const userId = user.id;

    // Gather last 7 days of data
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [trades, events, journals] = await Promise.all([
      prisma.trade.findMany({
        where: {
          userId,
          openedAt: { gte: sevenDaysAgo },
          status: "CLOSED",
        },
        orderBy: { openedAt: "asc" },
      }),
      prisma.behavioralEvent.findMany({
        where: {
          userId,
          createdAt: { gte: sevenDaysAgo },
        },
      }),
      prisma.journalEntry.findMany({
        where: {
          userId,
          createdAt: { gte: sevenDaysAgo },
        },
      }),
    ]);

    // Build statistics summaries for prompt context
    const total = trades.length;
    const wins = trades.filter((t: any) => Number(t.pnl || 0) > 0);
    const losses = trades.filter((t: any) => Number(t.pnl || 0) < 0);
    const totalPnL = trades.reduce((acc: number, t: any) => acc + Number(t.pnl || 0), 0);
    const winRate = total > 0 ? (wins.length / total) * 100 : 0;

    const systemPrompt = `You are TradCopilot AI Copilot, a professional day-trading analyst. 
Generate a comprehensive, structured weekly performance report based on the trader's activity over the past 7 days.
Make it insightful, direct, and trader-oriented.

The report MUST contain these five exact sections, cleanly formatted in markdown:
1. Performance Summary (Total closed trades, net P&L, win rate %, wins vs losses)
2. Strengths (Insights on profitable trades or high discipline sessions)
3. Areas for Improvement (Mistakes tagged in trades, risk parameter breaches)
4. Behavioral Insights (Analysis of overtrading or revenge trading events)
5. Recommendations for Next Week (3 tactical actionable rules to apply)`;

    const prompt = `Here is the data for the past 7 days:
CLOSED TRADES COUNT: ${total}
NET WEEKLY P&L: $${totalPnL.toFixed(2)}
WIN RATE: ${winRate.toFixed(1)}%
WINS: ${wins.length} | LOSSES: ${losses.length}

BEHAVIORAL EVENTS LOGGED:
${events.map((e: any) => `- [${e.eventType}] ${e.description} (${e.instrument || "general"})`).join("\n") || "No behavioral violations logged."}

JOURNAL MOODS/ENTRIES:
${journals.map((j: any) => `- Mood: ${j.mood || "N/A"} | Lesson: ${j.lessonsLearned || "None recorded"}`).join("\n") || "No journal logs this week."}

Provide a concise, impact-oriented 1-page report detailing patterns and tactical adjustments.`;

    const raceResult = await callFastestAIModel([
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ], {
      temperature: 0.2,
      maxTokens: 2000,
    });

    const reportText = (raceResult.content || "").trim();

    return successResponse({ report: reportText });
  } catch (err: any) {
    console.error("Weekly report generation failed:", err);
    const errDetails = handleNvidiaError(err);
    if (errDetails?.message) {
      return dispatchCaughtError(errDetails.message, err);
    }
    return dispatchCaughtError("Failed to generate weekly report", err);
  }
}
