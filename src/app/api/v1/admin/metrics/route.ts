import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, requireAdmin } from "@/lib/auth";
import { successResponse, unauthorizedError } from "@/lib/api-helpers";
import { dispatchCaughtError } from "@/lib/typed-errors";

export async function GET(_request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    // Enforce Admin Role — single source of truth via requireAdmin (M-1).
    const isDemo = user.email?.endsWith("@tradcopilot.local") === true;
    const adminCheck = await requireAdmin(user.id, isDemo);
    if (!adminCheck.ok) return adminCheck.response;

    // Compute real metrics from the database. No fabricated data.
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalUsers, recentSignups] = await Promise.all([
      prisma.user.count(),
      prisma.user.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // Build a real 7-day signup trend from actual signup timestamps.
    const dayBuckets: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setHours(0, 0, 0, 0);
      dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const count = recentSignups.filter((u: { createdAt: Date }) => {
        const t = new Date(u.createdAt).getTime();
        return t >= dayStart.getTime() && t < dayEnd.getTime();
      }).length;
      dayBuckets.push({
        date: dayStart.toLocaleDateString("en-US", { weekday: "short" }),
        count,
      });
    }

    return successResponse({
      totalUsers,
      signupTrend: dayBuckets,
    });
  } catch (error) {
    console.error("Admin metrics API error:", error);
    return dispatchCaughtError("Failed to fetch admin stats metrics", error);
  }
}