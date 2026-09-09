import { getOHLCV } from "./market";
import { compileTechnicalContext } from "./indicators";
import { callFastestAIModel } from "./ai-providers";

const DEFAULT_SYMBOL = "BTC/USD";
const DEFAULT_TIMEFRAME = "4h";

/**
 * Prewarm the hot paths for the default chart.
 *
 * V2 design: prewarm warms CONNECTIONS and MARKET DATA — it must never
 * fabricate an analysis. The previous implementation wrote a synthetic
 * "cached_analysis" row (with invented MACD/risk claims like "Bullish
 * momentum expanding" / riskLevel "Low") under userId "system-prewarm":
 *   1. Fabricated narrative — violated the no-fake-data principle.
 *   2. Dead data — every cached_analysis reader filters by the real
 *      authenticated userId, so the row was never read.
 *
 * What this does now:
 *   - Fetches OHLCV for the default symbol → populates the shared
 *     L1/L2 market cache so first user requests are fast.
 *   - Compiles the technical context → exercises the indicator path.
 *   - Sends a tiny (16-token) prompt to the AI providers → opens
 *     TLS connections and provider health state ahead of user traffic.
 *   - Writes NOTHING that any user could ever read as analysis.
 */
export async function prewarmDefaultChart(): Promise<{ status: string; duration: number }> {
  console.log("[PREWARM] Starting default BTC/USD 4h connection warm-up...");
  const startTime = Date.now();

  try {
    // 1. Warm the market-data cache (L1 in-process + L2 Postgres).
    const candles = await getOHLCV(DEFAULT_SYMBOL, DEFAULT_TIMEFRAME, 100);
    if (!candles || candles.length === 0) {
      console.warn("[PREWARM] No candle data returned for pre-warm.");
      return { status: "failed_no_candles", duration: Date.now() - startTime };
    }

    // 2. Exercise the deterministic indicator path.
    const tech = compileTechnicalContext(DEFAULT_SYMBOL, DEFAULT_TIMEFRAME, candles);
    if (!Number.isFinite(tech.currentPrice) || tech.currentPrice <= 0) {
      console.warn("[PREWARM] Telemetry unusable after compile.");
      return { status: "failed_telemetry", duration: Date.now() - startTime };
    }

    // 3. Warm AI provider connections with a minimal, throwaway prompt.
    //    The response is discarded — it is never parsed, cached, or shown.
    try {
      await callFastestAIModel(
        [
          { role: "system", content: "Reply with the single word: ok" },
          { role: "user", content: "ok" },
        ],
        { temperature: 0, maxTokens: 16 }
      );
    } catch {
      // Provider warm-up failures are non-fatal — the race will retry
      // and fall back at request time. Health state is updated by the
      // provider layer regardless of this call's outcome.
    }

    const duration = Date.now() - startTime;
    console.log(`[PREWARM] Complete in ${duration}ms — market cache + AI connections warm`);
    return { status: "warmed", duration };
  } catch (error: unknown) {
    console.error("[PREWARM] Failed:", error instanceof Error ? error.message : error);
    return { status: "error", duration: Date.now() - startTime };
  }
}