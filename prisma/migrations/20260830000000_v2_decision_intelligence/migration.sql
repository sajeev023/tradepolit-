-- V2 decision-intelligence layer: additive expand-only migration.
-- Adds the Thesis → Outcome → Insight retention loop, the analytics
-- event pipeline (fixes the dropped-events bug), and shareable
-- analysis snapshots. No existing table is altered or dropped.

-- Enumerations ----------------------------------------------------------

CREATE TYPE "ThesisStatus" AS ENUM ('OPEN', 'HIT', 'INVALIDATED', 'EXPIRED');
CREATE TYPE "ThesisOutcomeResult" AS ENUM ('WIN', 'LOSS', 'BREAKEVEN', 'NO_TRADE');
CREATE TYPE "InsightType" AS ENUM ('WIN_RATE_BY_SETUP', 'WIN_RATE_BY_SESSION', 'WIN_RATE_BY_EMOTION', 'MISTAKE_PATTERN', 'RISK_BEHAVIOR');

-- Thesis ----------------------------------------------------------------

CREATE TABLE "theses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "assetClass" "AssetClass" NOT NULL DEFAULT 'CRYPTO',
    "bias" "Direction" NOT NULL,
    "setupType" TEXT,
    "confidence" TEXT NOT NULL,
    "entryZone" DECIMAL(65,30) NOT NULL,
    "stopLoss" DECIMAL(65,30) NOT NULL,
    "invalidation" DECIMAL(65,30) NOT NULL,
    "target" DECIMAL(65,30) NOT NULL,
    "riskReward" DECIMAL(65,30) NOT NULL,
    "regimeAtCreation" TEXT,
    "evidenceFor" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "evidenceAgainst" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "invalidationConditions" TEXT,
    "aiSummary" TEXT NOT NULL,
    "sourceAnalysisId" TEXT,
    "savedAnalysisId" TEXT,
    "status" "ThesisStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedAt" TIMESTAMP(3),
    "resolvedPrice" DECIMAL(65,30),
    "checkedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "theses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "theses_userId_status_idx" ON "theses"("userId", "status");
CREATE INDEX "theses_userId_createdAt_idx" ON "theses"("userId", "createdAt");
CREATE INDEX "theses_status_symbol_idx" ON "theses"("status", "symbol");

-- Foreign key is added separately so a missing users row fails loudly
-- rather than blocking the table creation.
ALTER TABLE "theses" ADD CONSTRAINT "theses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ThesisOutcome ----------------------------------------------------------

CREATE TABLE "thesis_outcomes" (
    "id" TEXT NOT NULL,
    "thesisId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "result" "ThesisOutcomeResult" NOT NULL,
    "tookTrade" BOOLEAN NOT NULL DEFAULT false,
    "rMultiple" DECIMAL(65,30),
    "pnl" DECIMAL(65,30),
    "followedPlan" BOOLEAN,
    "whatILearned" TEXT,
    "linkedTradeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thesis_outcomes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "thesis_outcomes_thesisId_key" ON "thesis_outcomes"("thesisId");
CREATE INDEX "thesis_outcomes_userId_idx" ON "thesis_outcomes"("userId");

ALTER TABLE "thesis_outcomes" ADD CONSTRAINT "thesis_outcomes_thesisId_fkey" FOREIGN KEY ("thesisId") REFERENCES "theses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "thesis_outcomes" ADD CONSTRAINT "thesis_outcomes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- UserInsight -------------------------------------------------------------

CREATE TABLE "user_insights" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "insightType" "InsightType" NOT NULL,
    "payload" JSONB NOT NULL,
    "sampleSize" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),

    CONSTRAINT "user_insights_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_insights_userId_insightType_key" ON "user_insights"("userId", "insightType");

ALTER TABLE "user_insights" ADD CONSTRAINT "user_insights_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AnalyticsEvent -----------------------------------------------------------
-- Fixes the funnel-measurement bug: the client POSTed events to an
-- endpoint with no POST handler; every event was dropped with a 405.

CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "anonymousId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB,
    "pathname" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "analytics_events_eventType_createdAt_idx" ON "analytics_events"("eventType", "createdAt");
CREATE INDEX "analytics_events_anonymousId_createdAt_idx" ON "analytics_events"("anonymousId", "createdAt");
CREATE INDEX "analytics_events_userId_createdAt_idx" ON "analytics_events"("userId", "createdAt");

-- SharedAnalysis -----------------------------------------------------------

CREATE TABLE "shared_analyses" (
    "id" TEXT NOT NULL,
    "shareToken" TEXT NOT NULL,
    "thesisId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "bias" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "shared_analyses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "shared_analyses_shareToken_key" ON "shared_analyses"("shareToken");
CREATE UNIQUE INDEX "shared_analyses_thesisId_key" ON "shared_analyses"("thesisId");

ALTER TABLE "shared_analyses" ADD CONSTRAINT "shared_analyses_thesisId_fkey" FOREIGN KEY ("thesisId") REFERENCES "theses"("id") ON DELETE CASCADE ON UPDATE CASCADE;