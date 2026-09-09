import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, unauthorizedError } from "@/lib/api-helpers";
import { dispatchCaughtError } from "@/lib/typed-errors";
import { secureBearerMatch } from "@/lib/secure-compare";
import { sendResolutionDigest, isEmailConfigured } from "@/lib/email";

export const maxDuration = 60;

/**
 * GET /api/cron/thesis-digest — the retention pull mechanism.
 *
 * For every user with resolved-but-unreviewed theses, send ONE digest
 * email (throttled to once per 20 hours via User.lastDigestSentAt).
 * Runs after evaluate-theses in the cron schedule (resolutions first,
 * then notifications about them).
 *
 * Hard no-op when RESEND_API_KEY is unset — email is an enhancement
 * layer, never a dependency. In-app notifications (created by the
 * evaluation cron) remain the always-on channel.
 */
export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authorization = request.headers.get("authorization");
    if (!secureBearerMatch(authorization, cronSecret)) {
      return unauthorizedError("Invalid or missing CRON_SECRET");
    }

    if (!isEmailConfigured()) {
      return successResponse({ sent: 0, skipped: "email_not_configured" });
    }

    // Users with resolved-unreviewed theses, oldest resolution first.
    const usersToSend = await prisma.thesis.findMany({
      where: { status: { in: ["HIT", "INVALIDATED", "EXPIRED"] }, outcome: null },
      select: {
        userId: true,
        symbol: true,
        timeframe: true,
        bias: true,
        status: true,
        resolvedPrice: true,
        user: { select: { email: true, displayName: true, lastDigestSentAt: true, isActive: true } },
      },
      orderBy: { resolvedAt: "asc" },
      take: 1000,
    });

    // Group by user.
    const byUser = new Map<
      string,
      {
        email: string;
        displayName: string | null;
        lastDigestSentAt: Date | null;
        theses: { symbol: string; timeframe: string; bias: string; status: "HIT" | "INVALIDATED" | "EXPIRED"; resolvedPrice: number | null }[];
      }
    >();
    for (const t of usersToSend as unknown as {
      userId: string;
      symbol: string;
      timeframe: string;
      bias: string;
      status: "HIT" | "INVALIDATED" | "EXPIRED";
      resolvedPrice: unknown;
      user: { email: string; displayName: string | null; lastDigestSentAt: Date | null; isActive: boolean };
    }[]) {
      if (!t.user?.isActive || !t.user?.email) continue;
      const entry = byUser.get(t.userId) ?? {
        email: t.user.email,
        displayName: t.user.displayName,
        lastDigestSentAt: t.user.lastDigestSentAt,
        theses: [],
      };
      entry.theses.push({
        symbol: t.symbol,
        timeframe: t.timeframe,
        bias: t.bias,
        status: t.status,
        resolvedPrice:
          t.resolvedPrice === null || t.resolvedPrice === undefined ? null : Number(t.resolvedPrice),
      });
      byUser.set(t.userId, entry);
    }

    const twentyHours = 20 * 60 * 60 * 1000;
    let sent = 0;
    let throttled = 0;
    for (const [userId, u] of byUser) {
      // Throttle: at most one digest per user per 20 hours.
      if (u.lastDigestSentAt && Date.now() - new Date(u.lastDigestSentAt).getTime() < twentyHours) {
        throttled++;
        continue;
      }
      const ok = await sendResolutionDigest(u.email, u.displayName, u.theses.slice(0, 8));
      if (ok) {
        sent++;
        // Stamp the throttle window (best-effort; a failed stamp just
        // risks an earlier resend, never a spam loop).
        await prisma.user
          .update({ where: { id: userId }, data: { lastDigestSentAt: new Date() } })
          .catch(() => {});
      }
    }

    return successResponse({ users: byUser.size, sent, throttled });
  } catch (err) {
    return dispatchCaughtError("Thesis digest cron failed", err);
  }
}