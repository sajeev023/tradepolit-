-- Autopilot: paper-trading sessions (simulated account, real market candles).
-- Expand-only; no existing table is altered.

CREATE TABLE "autopilot_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startingBalance" DOUBLE PRECISION NOT NULL,
    "targetBalance" DOUBLE PRECISION NOT NULL,
    "config" JSONB NOT NULL,
    "state" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "autopilot_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "autopilot_sessions_userId_createdAt_idx" ON "autopilot_sessions"("userId", "createdAt");

ALTER TABLE "autopilot_sessions" ADD CONSTRAINT "autopilot_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
