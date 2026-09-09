-- V4.1: Add contextSnapshot to Thesis for auditable THEN/NOW reconstruction.
-- This column is optional (NULL for legacy theses) and contains a Json blob
-- of market context, technical indicators, confidence result, and provenance
-- captured at the moment the decision was committed.
ALTER TABLE "theses" ADD COLUMN IF NOT EXISTS "contextSnapshot" JSONB NULL;
ALTER TABLE "theses" ADD COLUMN IF NOT EXISTS "confidenceScore" DOUBLE PRECISION NULL;
ALTER TABLE "theses" ADD COLUMN IF NOT EXISTS "priceAtCreation" DECIMAL(65,30) NULL;
