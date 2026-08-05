-- Sync production schema drift with current Prisma schema.
--
-- Background: The 20250721162700_yc_audit_schema_updates migration was
-- applied to a previous staging environment but production was forked
-- from an earlier state. Production was therefore missing the full
-- subscription block on `user_profiles` (only `plan`, `stripeCustomerId`,
-- `stripeSubscriptionId`, `subscriptionStatus`, `subscriptionExpiresAt`
-- were present — `stripePriceId` was missing, breaking the Stripe
-- webhook which writes it on every checkout.succeeded event).
--
-- Production was also missing the `provider` column on `News`, which
-- the cross-source news dedupe code now writes on every upsert.
--
-- This migration is additive only and uses IF NOT EXISTS so it is
-- safe to re-run and to deploy alongside any future reset.
--
-- Pre-flight checks before writing this:
--   - 0 duplicate non-null stripeCustomerId values in user_profiles
--     (verified before authoring the migration), so adding the unique
--     index will not collide.
--   - The existing 20250721162700 migration is the source of truth for
--     the rest of user_profiles and was already applied. We do not
--     re-create the table; we add only the columns and indexes the
--     Prisma schema declares that production is missing.

-- user_profiles: add stripePriceId (the column that triggered P2022)
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "stripePriceId" TEXT;

-- user_profiles: restore the UNIQUE index on stripeCustomerId that the
-- Prisma schema declares (@unique) but the live DB is missing. Indexed
-- as a partial index on NOT NULL only so historical NULL rows do not
-- collide with future non-null rows.
CREATE UNIQUE INDEX IF NOT EXISTS "user_profiles_stripeCustomerId_key"
  ON "user_profiles" ("stripeCustomerId")
  WHERE "stripeCustomerId" IS NOT NULL;

-- News: add provider (FINNHUB | NEWSAPI | DB) for cross-source provenance
ALTER TABLE "News" ADD COLUMN IF NOT EXISTS "provider" TEXT;

-- Backfill news.provider="DB" on legacy rows so the parseDbArticle
-- default is consistent for any pre-existing article. The classifier
-- already maps unknown provenance to "DB", so this is a no-op for the
-- runtime path but keeps the column honest.
UPDATE "News" SET "provider" = 'DB' WHERE "provider" IS NULL;
