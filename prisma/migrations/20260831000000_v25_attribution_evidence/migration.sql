-- V2.5 "Close the Loop, Honestly" — additive expand-only migration.

-- Attribution enum: the labeled-decision dataset core.
-- Separates DECISION quality from OUTCOME luck:
--   GOOD_DECISION_BAD_OUTCOME  = variance (sound process, unlucky result)
--   BAD_DECISION_GOOD_OUTCOME  = luck (wrong process, paid anyway)
--   ...plus the error taxonomy: execution, risk, regime shift,
--   information, behavioral, data quality.
CREATE TYPE "AttributionLabel" AS ENUM (
  'GOOD_DECISION_GOOD_OUTCOME',
  'GOOD_DECISION_BAD_OUTCOME',
  'BAD_DECISION_GOOD_OUTCOME',
  'BAD_DECISION_BAD_OUTCOME',
  'EXECUTION_ERROR',
  'RISK_MANAGEMENT_ERROR',
  'REGIME_SHIFT',
  'INFORMATION_FAILURE',
  'BEHAVIORAL_ERROR',
  'DATA_QUALITY_ISSUE'
);

-- User: digest throttle stamp (the thesis-resolution email cron
-- reads this to send at most once per user per 20 hours).
ALTER TABLE "User" ADD COLUMN "lastDigestSentAt" TIMESTAMP(3);

-- Thesis: regime at resolution — lets the attribution engine compare
-- the market state at creation vs resolution (regime-shift detection).
ALTER TABLE "theses" ADD COLUMN "regimeAtResolution" TEXT;

-- ThesisOutcome: attribution fields.
ALTER TABLE "thesis_outcomes" ADD COLUMN "attribution" "AttributionLabel";
ALTER TABLE "thesis_outcomes" ADD COLUMN "attributionSource" TEXT;
ALTER TABLE "thesis_outcomes" ADD COLUMN "attributionReasoning" TEXT;
CREATE INDEX "thesis_outcomes_userId_attribution_idx" ON "thesis_outcomes"("userId", "attribution");