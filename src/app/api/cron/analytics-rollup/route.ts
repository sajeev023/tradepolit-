import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, unauthorizedError } from "@/lib/api-helpers";
import { dispatchCaughtError } from "@/lib/typed-errors";
import { secureBearerMatch } from "@/lib/secure-compare";

export const maxDuration = 60;

/**
 * GET /api/cron/analytics-rollup — retention for the analytics table.
 *
 * Two jobs, idempotent:
 *  1. ROLLUP: aggregate each completed UTC day (older than today) into
 *     analytics_daily (one row per event type: count, distinct users,
 *     summed totals). Safe to re-run — upsert on (day, eventType).
 *  2. PRUNE: delete raw analytics_events older than 90 days. The rollup
 *     for those days already exists, so funnel history is preserved;
 *     only the raw event payloads are dropped.
 *
 * Without this, analytics_events is unbounded and becomes the largest
 * table in the database as usage grows.
 */
const RETENTION_DAYS = 90;

export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authorization = request.headers.get("authorization");
    if (!secureBearerMatch(authorization, cronSecret)) {
      return unauthorizedError("Invalid or missing CRON_SECRET");
    }

    // ── 1. Rollup: completed UTC days that have no rollup row yet ─────
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    // Earliest raw event (bounded — table is indexed on createdAt).
    const earliest = await prisma.analyticsEvent.findFirst({
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
    let rolledUpDays = 0;
    if (earliest) {
      const firstDay = new Date(earliest.createdAt);
      firstDay.setUTCHours(0, 0, 0, 0);
      for (let day = new Date(firstDay); day < todayStart; day = new Date(day.getTime() + 24 * 3600 * 1000)) {
        const dayStart = new Date(day);
        const dayEnd = new Date(day);
        dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

        const events = await prisma.analyticsEvent.findMany({
          where: { createdAt: { gte: dayStart, lt: dayEnd } },
          select: { eventType: true, userId: true, anonymousId: true, payload: true },
        });

        if (events.length > 0) {
          // Group by type in-process — one day of events is small.
          const byType = new Map<string, { count: number; users: Set<string>; totals: Record<string, number> }>();
          for (const e of events as unknown as { eventType: string; userId: string | null; anonymousId: string; payload: unknown }[]) {
            const entry = byType.get(e.eventType) ?? { count: 0, users: new Set<string>(), totals: {} as Record<string, number> };
            entry.count += 1;
            if (e.userId) entry.users.add(e.userId);
            else if (e.anonymousId) entry.users.add(`anon:${e.anonymousId}`);
            // Sum numeric payload fields (e.g. ai_call tokens/latency).
            if (e.payload && typeof e.payload === "object") {
              for (const [k, v] of Object.entries(e.payload as Record<string, unknown>)) {
                if (typeof v === "number" && Number.isFinite(v)) {
                  entry.totals[k] = (entry.totals[k] ?? 0) + v;
                }
              }
            }
            byType.set(e.eventType, entry);
          }

          for (const [eventType, agg] of byType) {
            await prisma.analyticsDaily.upsert({
              where: { day_eventType: { day: dayStart, eventType } },
              update: { eventCount: agg.count, distinctUsers: agg.users.size, totalsJson: agg.totals as never },
              create: { day: dayStart, eventType, eventCount: agg.count, distinctUsers: agg.users.size, totalsJson: agg.totals as never },
            });
          }
        } else {
          // Mark empty days too, so the loop doesn't rescan them forever.
          await prisma.analyticsDaily.upsert({
            where: { day_eventType: { day: dayStart, eventType: "__day_complete" } },
            update: { eventCount: 0 },
            create: { day: dayStart, eventType: "__day_complete", eventCount: 0 },
          });
        }
        rolledUpDays += 1;
        // Loop advancement lives in the for-expression (UTC-day step).
      }
    }

    // ── 2. Prune raw events past the retention window ─────────────────
    const cutoff = new Date(todayStart);
    cutoff.setUTCDate(cutoff.getUTCDate() - RETENTION_DAYS);
    const pruned = await prisma.analyticsEvent.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    return successResponse({
      rolledUpDays,
      prunedEvents: pruned.count,
      retentionDays: RETENTION_DAYS,
    });
  } catch (err) {
    return dispatchCaughtError("Analytics rollup cron failed", err);
  }
}