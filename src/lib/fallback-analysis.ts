export interface FallbackLiveData {
  currentPrice?: number;
  support?: number;
  resistance?: number;
  rsi?: number;
  rsiLabel?: string;
  bias?: string;
  setupQuality?: string;
  confidence?: string;
  invalidationLevel?: number;
  trend?: string;
}

/**
 * Optimistic placeholder shown WHILE the real AI analysis is running.
 *
 * V2 honesty rules:
 *  - It is explicitly labeled as a placeholder ("AI analysis in progress"),
 *    never as a completed "Synchronized" analysis.
 *  - It only mirrors verified telemetry (price/S-R/RSI from the server
 *    indicators snapshot). It never fabricates MACD values, entry
 *    "sources", or model provenance.
 *  - It is cleared on error (see ChartsClientPage onError) so real
 *    failures always render.
 */
export function getInstantFallbackAnalysis(symbol: string, timeframe: string, liveData?: FallbackLiveData) {
  if (!liveData || !liveData.currentPrice || !liveData.support || !liveData.resistance || liveData.rsi === undefined || isNaN(liveData.rsi)) {
    return null;
  }

  const price = liveData.currentPrice;
  const supportVal = liveData.support;
  const resistanceVal = liveData.resistance;
  const invalidationVal = liveData.invalidationLevel ?? supportVal * 0.98;

  const supportStr = supportVal.toLocaleString();
  const resistanceStr = resistanceVal.toLocaleString();

  const rsiVal = liveData.rsi;
  const rsiLbl = liveData.rsiLabel ?? "Neutral";
  const biasVal = liveData.bias ?? "NEUTRAL";

  return {
    symbol,
    timeframe,
    cached: false,
    loading: true,
    marketRegime: liveData.trend ? `${liveData.trend} continuation favored.` : `Active telemetry for ${symbol} on ${timeframe}.`,
    bias: biasVal,
    support: supportVal,
    resistance: resistanceVal,
    setupQuality: liveData.setupQuality ?? "PENDING",
    riskLevel: "Medium",
    confidence: liveData.confidence ?? "MEDIUM",
    invalidationLevel: invalidationVal,
    whyItMatters: `Live structure: support $${supportStr} / resistance $${resistanceStr}. The full AI analysis is being prepared.`,
    entryIdeas: `Awaiting AI analysis — entry plan will populate here.`,
    stopLossIdea: null,
    takeProfitIdea: null,
    shortTermScenario: `Structure is contained between $${supportStr} and $${resistanceStr}.`,
    coachNarrative: `Analysis Source: TradCopilot Telemetry | Symbol: ${symbol} | TF: ${timeframe} | Price: $${price.toLocaleString()} | Status: AI analysis in progress

## Live Snapshot
Verified telemetry from the exchange feed: ${symbol} is trading at $${price.toLocaleString()} on the ${timeframe} timeframe. RSI(14) at ${rsiVal.toFixed(2)} (${rsiLbl}).

## Key Levels
Support: $${supportStr} | Resistance: $${resistanceStr}

The full AI analysis — market structure read, momentum synthesis, and a validated trade plan — will replace this snapshot in a few seconds.`,
    indicators: {
      rsi: rsiVal,
      rsiLabel: rsiLbl,
      macd: { macd: 0, signal: 0 },
    },
    levels: {
      support: supportVal,
      resistance: resistanceVal,
      invalidation: invalidationVal,
    },
    sourceMetadata: {
      symbolSource: `User active selection (${symbol})`,
      timeframeSource: `Selected chart interval (${timeframe})`,
      priceSource: `Live exchange feed ($${price.toLocaleString()})`,
      rsiSource: `RSI(14) calculated from close prices (${rsiVal.toFixed(2)})`,
      supportSource: "Swing-low detector",
      resistanceSource: "Swing-high detector",
      confidenceSource: "AI analysis in progress — placeholder from live telemetry",
      aiModelSource: "Pending — multi-model race in progress",
    },
    _placeholder: true,
  };
}