/**
 * src/lib/timeframes.ts
 *
 * Canonical timeframe definitions and per-provider interval mappings.
 *
 * Previously the timeframe→interval translation was duplicated as four
 * separate if/else chains in market.ts (Twelve Data, Binance, Coinbase, and
 * the simulated step-size). Adding a timeframe meant editing four places and
 * hoping they stayed consistent. Now each provider's mapping lives here once,
 * behind a typed accessor, with case-variant normalization so callers can pass
 * either `"1h"` or `"1H"`.
 */

export type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d" | "1W";

export const TIMEFRAMES: readonly Timeframe[] = ["1m", "5m", "15m", "1h", "4h", "1d", "1W"];

/**
 * Normalize a timeframe string to the canonical union member. Accepts the
 * case variants that appear across the codebase (`1H`, `4H`, `1D`, `1w`).
 * Returns null for anything that isn't a recognized timeframe so callers can
 * fall back to their own default rather than silently mistyping.
 */
export function normalizeTimeframe(tf: string): Timeframe | null {
  if (!tf) return null;
  const t = tf.trim();
  if (t === "1W" || t === "1w") return "1W";
  const lower = t.toLowerCase();
  return (TIMEFRAMES as readonly string[]).includes(lower) ? (lower as Timeframe) : null;
}

/** Wall-clock duration of one candle for a timeframe, in milliseconds. */
export const TIMEFRAME_DURATION_MS: Record<Timeframe, number> = {
  "1m": 60 * 1000,
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "4h": 4 * 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
  "1W": 7 * 24 * 60 * 60 * 1000,
};

export function timeframeDurationMs(tf: string): number {
  return TIMEFRAME_DURATION_MS[normalizeTimeframe(tf) ?? "1h"];
}

// ─── Twelve Data ─────────────────────────────────────────────────────────────
const TD_INTERVALS: Record<Timeframe, string> = {
  "1m": "1min", "5m": "5min", "15m": "15min", "1h": "1h", "4h": "4h", "1d": "1day", "1W": "1week",
};

export function tdIntervalFor(tf: string): string {
  return TD_INTERVALS[normalizeTimeframe(tf) ?? "1h"];
}

// ─── Binance ─────────────────────────────────────────────────────────────────
const BINANCE_INTERVALS: Record<Timeframe, string> = {
  "1m": "1m", "5m": "5m", "15m": "15m", "1h": "1h", "4h": "4h", "1d": "1d", "1W": "1w",
};

export function binanceIntervalFor(tf: string): string {
  return BINANCE_INTERVALS[normalizeTimeframe(tf) ?? "1h"];
}

// ─── Coinbase ────────────────────────────────────────────────────────────────
// Coinbase exposes granularity in seconds and only supports a fixed set; the
// 4h and 1W timeframes are synthesized by fetching 1h / 1d candles and
// downsampling (factor > 1).
const COINBASE_GRANULARITY: Record<Timeframe, number> = {
  "1m": 60, "5m": 300, "15m": 900, "1h": 3600, "4h": 3600, "1d": 86400, "1W": 86400,
};

const COINBASE_FACTOR: Record<Timeframe, number> = {
  "1m": 1, "5m": 1, "15m": 1, "1h": 1, "4h": 4, "1d": 1, "1W": 7,
};

export function coinbaseCandleSpecFor(tf: string): { granularity: number; factor: number } {
  const n = normalizeTimeframe(tf) ?? "1h";
  return { granularity: COINBASE_GRANULARITY[n], factor: COINBASE_FACTOR[n] };
}

// ─── Cache TTL ────────────────────────────────────────────────────────────────
/** Per-timeframe cache TTL (seconds) for OHLCV — tighter for short TFs. */
const OHLCV_TTL: Record<Timeframe, number> = {
  "1m": 5, "5m": 10, "15m": 20, "1h": 30, "4h": 45, "1d": 120, "1W": 60,
};

export function ohlcvCacheTtlFor(tf: string): number {
  return OHLCV_TTL[normalizeTimeframe(tf) ?? "1h"];
}

// ─── TradingView ──────────────────────────────────────────────────────────────
// tv.js embed interval strings. Previously duplicated as a local TIMEFRAME_MAP
// in TradingViewChart.tsx — now centralized here so adding a timeframe updates
// every provider at once.
const TRADINGVIEW_INTERVALS: Record<Timeframe, string> = {
  "1m": "1", "5m": "5", "15m": "15", "1h": "60", "4h": "240", "1d": "D", "1W": "W",
};

export function tradingViewIntervalFor(tf: string): string {
  return TRADINGVIEW_INTERVALS[normalizeTimeframe(tf) ?? "1h"];
}