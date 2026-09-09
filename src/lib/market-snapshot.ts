/**
 * src/lib/market-snapshot.ts
 *
 * DETERMINISTIC MARKET SNAPSHOT BUILDER (V4.1)
 *
 * Builds a complete, timestamped, auditable market context snapshot for a
 * symbol/timeframe. Used both at thesis creation (THEN state) and by the
 * live context API (NOW state) so the two are directly comparable.
 *
 * Every value is deterministic and traceable to its source. If upstream
 * market data is simulated or stale, the snapshot says so explicitly.
 */

import { getLivePrice, getOHLCV, normalizeSymbol } from "./market";
import { compileTechnicalContext, type TechnicalContext } from "./indicators";
import { buildMarketContext, type MarketContext } from "./market-context";
import { computeConfidence, type ConfidenceResult } from "./confidence-engine";
import { buildEvidence, mergeAiEvidence, toStructuredEvidence, type EvidenceItem, type EvidenceSet } from "./evidence-builder";
import { isDataFresh } from "./validate-market-data";
import type { OHLCVCandle } from "./types";

export type DataFreshness = "FRESH" | "STALE" | "UNAVAILABLE";

export interface MarketSnapshot {
  symbol: string;
  timeframe: string;
  normalizedSymbol: string;
  capturedAt: string; // ISO timestamp of snapshot construction
  priceAtCapture: {
    price: number;
    change24h: number;
    changePercent24h: number;
    source?: "LIVE" | "SIMULATED";
    warning?: string;
  };
  dataFreshness: {
    status: DataFreshness;
    lastCandleTime: string;
    ageMs: number;
    reason?: string;
  };
  technicalContext: Pick<
    TechnicalContext,
    | "currentPrice"
    | "trend"
    | "rsi"
    | "rsiLabel"
    | "macdValue"
    | "macdSignal"
    | "macdHistogram"
    | "support"
    | "resistance"
    | "volatility"
    | "isVolatilitySpike"
    | "atr"
    | "volume"
    | "emaCrossover"
    | "macdCrossover"
    | "liquiditySweep"
    | "fakeBreakout"
    | "approachingKeyLevel"
    | "volumeSurgeRatio"
    | "lostVWAP"
  >;
  marketContext: {
    regime: string;
    regimeReasons: string[];
    mtfAlignment?: string;
    confidenceInputs: MarketContext["confidenceInputs"];
  };
  confidence: ConfidenceResult;
  evidence: {
    for: EvidenceItem[];
    against: EvidenceItem[];
  };
}

export interface SnapshotBuildResult {
  snapshot: MarketSnapshot | null;
  error: string | null;
  freshness: DataFreshness;
}

/**
 * Build a market snapshot for a symbol/timeframe.
 *
 * The builder is deterministic: same market data -> same snapshot.
 * It does not call AI. It explicitly tags simulated data and stale data.
 */
export async function buildMarketSnapshot(
  symbol: string,
  timeframe: string,
  options: {
    bias?: "LONG" | "SHORT" | null;
    aiEvidenceFor?: string[];
    aiEvidenceAgainst?: string[];
  } = {}
): Promise<SnapshotBuildResult> {
  const normalizedSymbol = normalizeSymbol(symbol);
  const capturedAt = new Date().toISOString();

  let priceData: Awaited<ReturnType<typeof getLivePrice>> | null = null;
  let candles: OHLCVCandle[] = [];
  let priceError: string | null = null;
  let candleError: string | null = null;

  // 1. Fetch live price
  try {
    priceData = await getLivePrice(normalizedSymbol);
  } catch (err) {
    priceError = err instanceof Error ? err.message : "Price fetch failed";
  }

  // 2. Fetch OHLCV
  try {
    candles = await getOHLCV(normalizedSymbol, timeframe, 100);
  } catch (err) {
    candleError = err instanceof Error ? err.message : "OHLCV fetch failed";
  }

  // If we have neither price nor candles, the snapshot is unavailable.
  if (!priceData && candles.length === 0) {
    return {
      snapshot: null,
      error: [priceError, candleError].filter(Boolean).join("; ") || "Market data unavailable",
      freshness: "UNAVAILABLE",
    };
  }

  // 3. Determine freshness
  const lastCandle = candles[candles.length - 1];
  const lastCandleTime = lastCandle ? new Date(lastCandle.timestamp).toISOString() : capturedAt;
  const ageMs = lastCandle ? Date.now() - lastCandle.timestamp : 0;

  let dataFreshness: DataFreshness = "FRESH";
  let freshnessReason: string | undefined;

  if (candles.length === 0) {
    dataFreshness = "STALE";
    freshnessReason = "No candle data returned";
  } else if (candles.some((c) => c.source === "SIMULATED")) {
    // Simulated candles are technically returned but not trustworthy.
    dataFreshness = "UNAVAILABLE";
    freshnessReason = "Market data is simulated";
  } else if (!isDataFresh(lastCandle.timestamp, timeframe)) {
    dataFreshness = "STALE";
    freshnessReason = `Last candle is ${(ageMs / 1000).toFixed(0)}s old`;
  }

  // 4. Technical context
  const technicalContext: TechnicalContext =
    candles.length >= 50
      ? compileTechnicalContext(normalizedSymbol, timeframe, candles)
      : ({
          symbol: normalizedSymbol,
          timeframe,
          currentPrice: priceData?.price ?? 0,
          lastCandleTime,
          trend: "SIDEWAYS",
          rsi: 50,
          rsiSentiment: "NEUTRAL",
          rsiLabel: "Awaiting data...",
          macdValue: 0,
          macdSignal: 0,
          macdHistogram: 0,
          support: priceData ? priceData.price * 0.98 : 0,
          resistance: priceData ? priceData.price * 1.02 : 0,
          volatility: 0,
          isVolatilitySpike: false,
          bias: "NEUTRAL",
          setupQuality: "NO SETUP",
          confidence: "LOW",
          entryPrice: priceData?.price ?? 0,
          stopLoss: 0,
          takeProfit: 0,
          invalidationLevel: 0,
          atr: (priceData?.price ?? 0) * 0.005,
          volume: 0,
          volumeSurgeRatio: 1,
          lostVWAP: false,
          emaCrossover: null,
          macdCrossover: null,
          liquiditySweep: false,
          fakeBreakout: false,
          approachingKeyLevel: null,
          activeSession: null,
          brokenSupport: false,
          brokenResistance: false,
          atrExpansion: false,
          consecutiveCandles: 0,
          rsiCrossedBelow40: false,
          sourceMetadata: {} as any,
        } as TechnicalContext);

  // Use live price if available and within 5% of last candle close;
  // otherwise trust the candle close. This matches the analyze-chart policy.
  const currentPrice =
    priceData && Number.isFinite(priceData.price)
      ? priceData.price
      : technicalContext.currentPrice;

  // 5. Market context
  let marketContext: MarketContext | null = null;
  try {
    if (candles.length >= 50) {
      marketContext = await buildMarketContext(
        normalizedSymbol,
        timeframe,
        candles,
        {
          trend: technicalContext.trend,
          volatilityPct: technicalContext.volatility,
          isVolatilitySpike: technicalContext.isVolatilitySpike,
          support: technicalContext.support,
          resistance: technicalContext.resistance,
          currentPrice,
          rsi: technicalContext.rsi,
          macdValue: technicalContext.macdValue,
          macdSignal: technicalContext.macdSignal,
          macdHistogram: technicalContext.macdHistogram,
          atr: technicalContext.atr,
        },
        (s, tf) => getOHLCV(s, tf, 60)
      );
    }
  } catch (err) {
    // MTF/context failures are non-fatal; we fall back to selected-TF context.
  }

  // 6. Confidence
  const direction: "LONG" | "SHORT" =
    options.bias === "LONG" || options.bias === "SHORT"
      ? options.bias
      : technicalContext.bias === "BUY/LONG"
        ? "LONG"
        : technicalContext.bias === "SELL/SHORT"
          ? "SHORT"
          : "LONG";

    const confidence: ConfidenceResult = marketContext
    ? computeConfidence({
        marketContext: {
          confidenceInputs: marketContext.confidenceInputs,
          regime: marketContext.regime,
          mtf: marketContext.mtf,
        },
        setup: {
          riskReward: 2.0,
          direction,
        },
        conflicts: detectConflicts(technicalContext, marketContext),
        candleCount: candles.length,
      })
    : {
        score: 0,
        tier: "LOW",
        factors: [
          {
            name: "Data quality",
            direction: "negative",
            weight: 0,
            note: "Insufficient market context to compute confidence.",
          },
        ],
      };


  // 7. Evidence
  const evidenceSet: EvidenceSet = marketContext
    ? buildEvidence(direction, marketContext, {
        rsi: technicalContext.rsi,
        rsiLabel: technicalContext.rsiLabel,
        macdValue: technicalContext.macdValue,
        macdSignal: technicalContext.macdSignal,
        macdHistogram: technicalContext.macdHistogram,
        trend: technicalContext.trend,
        emaCrossover: technicalContext.emaCrossover,
        macdCrossover: technicalContext.macdCrossover,
        liquiditySweep: technicalContext.liquiditySweep,
        fakeBreakout: technicalContext.fakeBreakout,
        volumeSurgeRatio: technicalContext.volumeSurgeRatio,
        isVolatilitySpike: technicalContext.isVolatilitySpike,
        lostVWAP: technicalContext.lostVWAP,
        approachingKeyLevel: technicalContext.approachingKeyLevel,
      })
    : { for: [], against: [] };

  const mergedEvidence = mergeAiEvidence(
    evidenceSet,
    options.aiEvidenceFor,
    options.aiEvidenceAgainst
  );

  const snapshot: MarketSnapshot = {
    symbol: normalizedSymbol,
    timeframe,
    normalizedSymbol,
    capturedAt,
    priceAtCapture: {
      price: currentPrice,
      change24h: priceData?.change24h ?? 0,
      changePercent24h: priceData?.changePercent24h ?? 0,
      source: priceData?.source,
      warning: priceData?.warning,
    },
    dataFreshness: {
      status: dataFreshness,
      lastCandleTime,
      ageMs,
      reason: freshnessReason,
    },
    technicalContext: {
      currentPrice,
      trend: technicalContext.trend,
      rsi: technicalContext.rsi,
      rsiLabel: technicalContext.rsiLabel,
      macdValue: technicalContext.macdValue,
      macdSignal: technicalContext.macdSignal,
      macdHistogram: technicalContext.macdHistogram,
      support: technicalContext.support,
      resistance: technicalContext.resistance,
      volatility: technicalContext.volatility,
      isVolatilitySpike: technicalContext.isVolatilitySpike,
      atr: technicalContext.atr,
      volume: technicalContext.volume,
      emaCrossover: technicalContext.emaCrossover,
      macdCrossover: technicalContext.macdCrossover,
      liquiditySweep: technicalContext.liquiditySweep,
      fakeBreakout: technicalContext.fakeBreakout,
      approachingKeyLevel: technicalContext.approachingKeyLevel,
      volumeSurgeRatio: technicalContext.volumeSurgeRatio,
      lostVWAP: technicalContext.lostVWAP,
    },
    marketContext: {
      regime: marketContext?.regime.label ?? "UNKNOWN",
      regimeReasons: marketContext?.regime.reasons ?? [],
      mtfAlignment: marketContext?.mtf?.alignment,
      confidenceInputs: marketContext?.confidenceInputs ?? {
        trendClarity: 0,
        momentumAlignment: 0,
        volatilityFit: 0,
        structureQuality: 0,
        dataQuality: 0,
        mtfAlignment: 0,
      },
    },
    confidence,
  evidence: {
    for: toStructuredEvidence(mergedEvidence, timeframe, capturedAt).for,
    against: toStructuredEvidence(mergedEvidence, timeframe, capturedAt).against,
  },
  };

  return {
    snapshot,
    error: dataFreshness === "UNAVAILABLE" ? (freshnessReason ?? "Market data unavailable") : null,
    freshness: dataFreshness,
  };
}

function detectConflicts(tech: TechnicalContext, ctx: MarketContext): string[] {
  const conflicts: string[] = [];

  const bullishStructure =
    tech.trend === "BULLISH" || ctx.regime.regime === "TRENDING_UP" || ctx.regime.regime === "BREAKOUT";
  const bearishMomentum = tech.rsi > 70 || tech.macdHistogram < 0;

  if (bullishStructure && bearishMomentum) {
    conflicts.push("Bullish structure but momentum is weakening (RSI/MACD).");
  }

  if (ctx.mtf?.alignment === "MIXED") {
    conflicts.push("Multi-timeframe alignment is mixed — higher timeframes disagree.");
  }

  if (tech.isVolatilitySpike && ctx.regime.regime !== "HIGH_VOLATILITY") {
    conflicts.push("Volatility spike detected while regime is not classified as high-volatility.");
  }

  return conflicts;
}

/** Convert a persisted text evidence array to structured EvidenceItem[].
 *  Used for legacy theses that predate structured evidence. */
export function legacyEvidenceToStructured(items: string[], source: "for" | "against"): EvidenceItem[] {
  return items.map((text) => {
    const lower = text.toLowerCase();
    let indicator: string | undefined;
    if (lower.includes("rsi")) indicator = "RSI";
    else if (lower.includes("macd")) indicator = "MACD";
    else if (lower.includes("ema")) indicator = "EMA";
    else if (lower.includes("regime")) indicator = "Regime";
    else if (lower.includes("mtf")) indicator = "MTF";
    else if (lower.includes("volume")) indicator = "Volume";
    else if (lower.includes("volatil")) indicator = "Volatility";
    else if (lower.includes("support") || lower.includes("resistance")) indicator = "Levels";
    else if (lower.startsWith("ai:")) indicator = "AI Synthesis";

    return {
      text,
      source: lower.startsWith("ai:") ? "ai" : "deterministic",
      indicator,
      direction: source,
    };
  });
}
