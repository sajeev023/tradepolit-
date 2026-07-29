/**
 * src/lib/schemas.ts
 *
 * Shared Zod schemas for untrusted input that previously flowed through as
 * `z.any()` — the type-safety black hole where a corrupt or malicious client
 * payload reached the AI prompt or the persistence layer unvalidated. Only
 * schema-validated data is persisted to ConversationMemory.content or sent to
 * the model; unknown keys are stripped (Zod default) so the prompt and cache
 * see exactly the typed shape, never arbitrary client-injected fields.
 */

import { z } from "zod";

/**
 * Provenance metadata attached to every analysis. Mirrors the `SourceMetadata`
 * interface in src/lib/indicators.ts — string source labels for each derived
 * value. Replaces `z.any()` on the analyze-chart telemetry schema.
 */
export const sourceMetadataSchema = z.object({
  rsiSource: z.string(),
  supportSource: z.string(),
  resistanceSource: z.string(),
  entrySource: z.string(),
  stopLossSource: z.string(),
  takeProfitSource: z.string(),
  confidenceSource: z.string(),
  aiModelSource: z.string(),
  symbolSource: z.string(),
  timeframeSource: z.string(),
  priceSource: z.string(),
});

/**
 * The chart-state/analysis object the client posts to the AI chat endpoint
 * and that is cached in ConversationMemory. Every field is optional because
 * the client may send a partial; unknown keys are stripped so only validated,
 * typed data reaches the model prompt. Replaces `z.any()` at
 * ai/chat/route.ts:chartState.
 */
export const chartStateSchema = z.object({
  symbol: z.string().optional(),
  timeframe: z.string().optional(),
  currentPrice: z.number().optional(),
  volume: z.number().optional(),
  atr: z.number().optional(),
  trend: z.string().optional(),
  rsi: z.number().optional(),
  rsiLabel: z.string().optional(),
  rsiSentiment: z.string().optional(),
  macdValue: z.number().optional(),
  macdSignal: z.number().optional(),
  macdHistogram: z.number().optional(),
  support: z.number().optional(),
  resistance: z.number().optional(),
  invalidationLevel: z.number().optional(),
  bias: z.string().optional(),
  setupQuality: z.string().optional(),
  riskLevel: z.string().optional(),
  confidence: z.string().optional(),
  marketRegime: z.string().optional(),
  whyItMatters: z.string().optional(),
  entryIdeas: z.string().optional(),
  stopLossIdea: z.string().optional(),
  takeProfitIdea: z.string().optional(),
  shortTermScenario: z.string().optional(),
  coachNarrative: z.string().optional(),
  sourceMetadata: sourceMetadataSchema.optional(),
  indicators: z.record(z.string(), z.unknown()).optional(),
  levels: z.record(z.string(), z.unknown()).optional(),
});

export type ChartState = z.infer<typeof chartStateSchema>;
export type SourceMetadata = z.infer<typeof sourceMetadataSchema>;