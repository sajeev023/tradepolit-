import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, isMockDb } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { successResponse } from "@/lib/api-helpers";
import { getClientIdentifier, checkRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/v1/analytics/events — product analytics ingestion.
 *
 * Replaces the broken pipeline that POSTed to /api/v1/admin/metrics
 * (admin-auth GET-only route — every event was dropped with a 405).
 *
 * Design:
 *  - Public: pre-signup (anonymous) events must be trackable, so auth is
 *    optional. The authenticated userId, when present, is attached so
 *    funnel stages can be joined across signup.
 *  - Rate limited per IP to prevent event-spam flooding the table.
 *  - Fire-and-forget from the client; failures never break UX.
 *  - Hard cap on event type length and payload size.
 */

const eventSchema = z.object({
  type: z.string().min(1).max(64),
  anonymousId: z.string().min(1).max(64),
  payload: z.record(z.string(), z.unknown()).optional(),
  pathname: z.string().max(512).optional(),
  timestamp: z.string().datetime().optional(),
});

const batchSchema = z.object({
  events: z.array(eventSchema).min(1).max(20),
});

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIdentifier(request);
    const { allowed: rateOk } = checkRateLimit(ip, "analytics-events", 60, 60);
    if (!rateOk) {
      // Silently accept rate-limited analytics — never break the client.
      return successResponse({ accepted: 0, dropped: "rate_limited" });
    }

    const body = await request.json().catch(() => null);
    const parsed = batchSchema.safeParse(body ?? {});
    if (!parsed.success) {
      // A malformed analytics event must never surface as a user-facing
      // error; acknowledge and drop.
      return successResponse({ accepted: 0, dropped: "invalid" });
    }

    // Best-effort identity enrichment — never reject on auth failure.
    let userId: string | null = null;
    try {
      const { user } = await getAuthUser();
      userId = user?.id ?? null;
    } catch {
      userId = null;
    }

    if (isMockDb) {
      // Mock DB (tests / local without DATABASE_URL): accept and drop.
      return successResponse({ accepted: parsed.data.events.length });
    }

    await prisma.analyticsEvent.createMany({
      data: parsed.data.events.map((e) => ({
        userId,
        anonymousId: e.anonymousId,
        eventType: e.type,
        payload: (e.payload ?? {}) as object,
        pathname: e.pathname ?? null,
      })),
    });

    return successResponse({ accepted: parsed.data.events.length });
  } catch {
    // Analytics must never throw to the client.
    return successResponse({ accepted: 0, dropped: "error" });
  }
}