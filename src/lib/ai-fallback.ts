/**
 * ai-fallback.ts
 * Deterministic, chart-state-aware fallback responses for when all AI
 * reasoning providers are unavailable. These functions never call an LLM —
 * they synthesize a coherent response from the live telemetry the client
 * already has. This is the "4th tier" of the AI resilience chain after
 * Groq → NVIDIA → OpenAI fail.
 */
export { getInstantFallbackAnalysis } from "./fallback-analysis";

interface ChartStateForFallback {
  symbol?: string;
  currentPrice?: number;
  rsi?: number;
  rsiLabel?: string;
  macdValue?: number;
  macdSignal?: number;
  support?: number;
  resistance?: number;
  invalidationLevel?: number;
  bias?: string;
  setupQuality?: string;
  confidence?: string;
  trend?: string;
  volume?: number;
  timeframe?: string;
}

interface ChatFallbackInput {
  chartState?: ChartStateForFallback;
  // Reserved for future intent-aware fallbacks; currently unused.
  userMessage?: string;
  userName: string;
}

function fmt(n: number | undefined, digits = 2): string {
  if (n === undefined || n === null || isNaN(n)) return "N/A";
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function rsiNarrative(rsi?: number): string {
  if (rsi === undefined || isNaN(rsi)) return "RSI is unavailable right now.";
  if (rsi >= 80) return `RSI is ${rsi.toFixed(1)} — extremely overbought. Reversal risk is elevated; do not chase.`;
  if (rsi >= 70) return `RSI is ${rsi.toFixed(1)} — overbought. Momentum is strong but late; tighten stops on longs.`;
  if (rsi >= 60) return `RSI is ${rsi.toFixed(1)} — bullish momentum is intact but not extreme.`;
  if (rsi >= 45) return `RSI is ${rsi.toFixed(1)} — momentum is roughly balanced.`;
  if (rsi >= 30) return `RSI is ${rsi.toFixed(1)} — approaching oversold. Watch for a bounce.`;
  return `RSI is ${rsi.toFixed(1)} — oversold. A relief bounce is possible but not guaranteed.`;
}

function biasNarrative(bias?: string, trend?: string): string {
  if (!bias && !trend) return "No clean directional read on this timeframe.";
  const parts: string[] = [];
  if (trend) parts.push(`regime is ${trend.toLowerCase()}`);
  if (bias) parts.push(`bias is ${bias.toLowerCase()}`);
  return `Structure: ${parts.join(", ")}.`;
}

/**
 * Builds a deterministic conversational reply when the LLM race failed.
 * Uses the live telemetry the client already sent so the user still gets
 * a substantive, chart-aware answer — not a "try again" wall.
 */
export function buildChatFallbackFromChartState({ chartState, userName }: ChatFallbackInput): string {
  const prefix = "Not financial advice — for educational purposes.\n\n";

  if (!chartState || chartState.currentPrice === undefined) {
    return `${prefix}${userName}, I'm having brief trouble reaching my reasoning models right now. Your chart telemetry is still live on the page — try asking again in a moment and I'll give you the full breakdown.`;
  }

  const sym = chartState.symbol ?? "this asset";
  const tf = chartState.timeframe ?? "the current timeframe";
  const price = chartState.currentPrice;
  const support = chartState.support;
  const resistance = chartState.resistance;
  const invalidation = chartState.invalidationLevel;
  const rsi = chartState.rsi;
  const macdVal = chartState.macdValue;
  const macdSig = chartState.macdSignal;

  const lines: string[] = [];
  lines.push(`${userName}, my reasoning models are slow right now, but here's a disciplined read straight from your live telemetry on ${sym} (${tf}):`);
  lines.push("");
  lines.push(`Price: $${fmt(price)}.`);
  if (support !== undefined && resistance !== undefined) {
    lines.push(`Key levels — support $${fmt(support)}, resistance $${fmt(resistance)}.`);
  }
  if (invalidation !== undefined) {
    lines.push(`Structural invalidation: $${fmt(invalidation)}. Risk below this is real — size accordingly.`);
  }
  lines.push(rsiNarrative(rsi));
  if (macdVal !== undefined && macdSig !== undefined) {
    lines.push(`MACD ${macdVal.toFixed(4)} vs signal ${macdSig.toFixed(4)} — ${macdVal > macdSig ? "bullish (above signal)" : "bearish (below signal)"}.`);
  }
  lines.push(biasNarrative(chartState.bias, chartState.trend));
  if (chartState.setupQuality) {
    lines.push(`Setup grade from the detector: ${chartState.setupQuality}.`);
  }
  lines.push("");
  lines.push(`Disciplined move: do not initiate a new position solely on this summary. Wait for my full analysis in a moment — or, if price is at one of those levels, manage your existing risk first and ask me again when the models recover.`);
  lines.push("");
  lines.push(`I'll be back to full capacity shortly. If you need an immediate decision, your invalidation level is the only number that matters.`);

  return prefix + lines.join("\n");
}