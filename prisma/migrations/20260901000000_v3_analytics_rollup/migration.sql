-- V3: analytics retention — daily per-event-type rollups.
-- The raw analytics_events table is unbounded; at scale it becomes the
-- largest table in the DB. The retention cron aggregates each completed
-- UTC day into one row per event type, then prunes raw rows older than
-- 90 days. Expand-only; no existing table is altered.

CREATE TABLE "analytics_daily" (
    "id" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventCount" INTEGER NOT NULL DEFAULT 0,
    "distinctUsers" INTEGER NOT NULL DEFAULT 0,
    "totalsJson" JSONB,

    CONSTRAINT "analytics_daily_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "analytics_daily_day_eventType_key" ON "analytics_daily"("day", "eventType");
CREATE INDEX "analytics_daily_eventType_day_idx" ON "analytics_daily"("eventType", "day");