import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, requireAdmin } from "@/lib/auth";
import { successResponse, unauthorizedError } from "@/lib/api-helpers";
import { dispatchCaughtError } from "@/lib/typed-errors";

/**
 * GET /api/v1/admin/metrics — product + funnel metrics for the admin panel.
 *
 * V2: extends the signup-only metrics with the actual activation and
 * retention funnel, computed from the (now working) analytics pipeline:
 *   activation      — signups whose first_ai_analysis is within 24h of signup
 *   analysis volume — analyses per day (last 7d)
 *   retention inputs — D1/D7 return events
 *   thesis loop     — theses created vs outcomes logged
 *
 * All numbers are computed from real DB rows. No fabricated data.
 */

interface DayBucket {
  date: string;
  count: number;
}

function buildDayBuckets(dates: Date[], days = 7): DayBucket[] {
  const now = new Date();
  const buckets: DayBucket[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    dayStart.setDate(dayStart.getDate() - i);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const count = dates.filter((d) => {
      const t = new Date(d).getTime();
      return t >= dayStart.getTime() && t < dayEnd.getTime();
    }).length;
    buckets.push({
      date: dayStart.toLocaleDateString("en-US", { weekday: "short" }),
      count,
    });
  }
  return buckets;
}

export async function GET(_request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const isDemo = user.email?.endsWith("@tradcopilot.local") === true;
    const adminCheck = await requireAdmin(user.id, isDemo);
    if (!adminCheck.ok) return adminCheck.response;

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      recentSignups,
      signupRows,
      firstAnalysisEvents,
      analysisEvents7d,
      thesisCount,
      outcomeCount,
      journalCount7d,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      // Signups in the last 24h (for activation-rate denominator).
      prisma.user.findMany({
        where: { createdAt: { gte: dayAgo } },
        select: { id: true },
      }),
      prisma.analyticsEvent.findMany({
        where: { eventType: "first_ai_analysis" },
        select: { userId: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
      prisma.analyticsEvent.findMany({
        where: { eventType: "analysis_completed", createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true },
      }),
      prisma.thesis.count(),
      prisma.thesisOutcome.count(),
      prisma.journalEntry.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    ]);

    // Activation: distinct users with a first_ai_analysis event (all time).
    const activatedUserIds = new Set(
      firstAnalysisEvents.map((e: { userId: string | null }) => e.userId).filter(Boolean) as string[]
    );

    // Users who signed up within the last 24h AND have a first analysis.
    const dayAgoIds = new Set(signupRows.map((u: { id: string }) => u.id));
    const activatedToday = [...activatedUserIds].filter((id) => dayAgoIds.has(id)).length;
    const activationRate = signupRows.length > 0 ? activatedToday / signupRows.length : null;

    // D7 retention proxy: users who signed up 7+ days ago and have any
    // event in the last 7 days. (Refined cohort analysis comes with more data.)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const usersOlderThan7d = await prisma.user.count({ where: { createdAt: { lt: weekAgo } } });
    const recentActiveUserIds = new Set(
      (
        await prisma.analyticsEvent.findMany({
          where: { createdAt: { gte: sevenDaysAgo }, userId: { not: null } },
          select: { userId: true },
          distinct: ["userId"],
          take: 2000,
        })
      )
        .map((e: { userId: string | null }) => e.userId)
        .filter(Boolean) as string[]
    );

    return successResponse({
      totalUsers,
      signupTrend: buildDayBuckets(recentSignups.map((u: { createdAt: Date }) => u.createdAt)),
      activation: {
        activatedUsers: activatedUserIds.size,
        signupsLast24h: signupRows.length,
        activatedWithin24h: activatedToday,
        activationRateLast24h: activationRate,
      },
      engagement: {
        analysesLast7d: analysisEvents7d.length,
        analysesPerDay: buildDayBuckets(analysisEvents7d.map((e: { createdAt: Date }) => e.createdAt)),
        activeUsersLast7d: recentActiveUserIds.size,
        usersOlderThan7d,
      },
      thesisLoop: {
        thesesTotal: thesisCount,
        outcomesLogged: outcomeCount,
        journalEntriesLast7d: journalCount7d,
      },
    });
  } catch (error) {
    console.error("Admin metrics API error:", error);
    return dispatchCaughtError("Failed to fetch admin stats metrics", error);
  }
}