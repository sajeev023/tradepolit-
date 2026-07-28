-- Add the STOCK asset class to support the Global Markets equity universe
-- (US / India / Japan / UAE / UK / Europe) routed through Twelve Data.
-- Additive only: existing CRYPTO/FOREX/COMMODITY/INDEX rows are unaffected.
ALTER TYPE "AssetClass" ADD VALUE IF NOT EXISTS 'STOCK';

-- Missing indexes flagged by the data-layer audit. All CREATE IF NOT EXISTS
-- so the migration is safe to re-run and to deploy alongside any reset.

-- ConversationMemory: the AI memory layer queries by (role, chatId) (the
-- market-overview "cached_analysis" lookup) and by (userId, role, chatId).
-- Without these, both reads seq-scan the table as it grows per user.
CREATE INDEX IF NOT EXISTS "conversation_memory_role_chatId_idx"
  ON "conversation_memory" ("role", "chatId");

CREATE INDEX IF NOT EXISTS "conversation_memory_userId_role_chatId_idx"
  ON "conversation_memory" ("userId", "role", "chatId");

-- BehavioralEvent: the behavioral analytics reads page through a user's
-- events ordered by createdAt. The existing (userId, eventType) index
-- doesn't help the chronological scan.
CREATE INDEX IF NOT EXISTS "behavioral_events_userId_createdAt_idx"
  ON "behavioral_events" ("userId", "createdAt");