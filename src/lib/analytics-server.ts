/**
 * src/lib/analytics-server.ts
 *
 * Server-side analytics — writes AnalyticsEvent rows directly (the
 * client path goes through POST /api/v1/analytics/events).
 *
 * Used by routes for events the client can't (or shouldn't) emit
 * itself: successful analysis completion, thesis creation, upgrades,
 * and AI/provider failures (observability + funnel in one store).
 */

import { prisma, isMockDb } from "./prisma";
import { getAuthUser } from "./auth";

class ServerAnalytics {
  private anonymousIdCounter = 0;

  /** Track a server-side event for a user. Never throws. */
  async track(userId: string | null, eventType: string, payload: Record<string, unknown> = {}, pathname?: string) {
    try {
      if (isMockDb) return;
      await prisma.analyticsEvent.create({
        data: {
          userId,
          anonymousId: userId ?? `server-${process.pid}-${this.anonymousIdCounter++}`,
          eventType,
          payload: payload as object,
          pathname: pathname ?? null,
        },
      });
    } catch {
      // Analytics must never break a request.
    }
  }

  /** Convenience: resolve the authenticated user, then track. */
  async trackForUser(eventType: string, payload: Record<string, unknown> = {}) {
    try {
      const { user } = await getAuthUser();
      await this.track(user?.id ?? null, eventType, payload);
    } catch {
      await this.track(null, eventType, payload);
    }
  }
}

export const analyticsServer = new ServerAnalytics();
export default analyticsServer;