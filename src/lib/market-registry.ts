/**
 * src/lib/market-registry.ts
 *
 * Single source of truth for all market symbols, their asset classes,
 * provider mappings, and mock baselines.
 *
 * WHY THIS EXISTS
 * ---------------
 * Previously, symbol lists, baseline prices, volatilities, and provider
 * ticker maps were hardcoded inline across six files (market.ts,
 * useBinanceStream.ts, news.ts, the chat route, the cron job, and the
 * TradingView chart). Adding a new symbol or asset class meant touching
 * all of them and risking divergence.
 *
 * Now they live here. Adding a new market means adding one entry to
 * SYMBOL_REGISTRY. Everything else reads from this file.
 *
 * ADDING A NEW SYMBOL
 * -------------------
 * 1. Add a SymbolMeta entry to SYMBOL_REGISTRY keyed by its display symbol
 *    (e.g. "RELIANCE" or "AAPL").
 * 2. If it has a Binance spot pair, set `binanceTicker`. If it streams
 *    over WebSocket, it is auto-enabled (see BINANCE_WS_SYMBOLS).
 * 3. If TwelveData covers it, set `twelvedataTicker`.
 * 4. Set a realistic `baselinePrice` and `volatility` so the simulated
 *    fallback stays plausible during outages.
 * 5. Run `npx tsc --noEmit` and `npm test`. That is it.
 *
 * ADDING A NEW ASSET CLASS
 * ------------------------
 * 1. Add the value to the `AssetClass` enum in `prisma/schema.prisma`.
 * 2. Add the matching string union in `src/lib/types.ts`.
 * 3. If the risk engine needs it, add a max-leverage entry in
 *    `risk-engine.ts`.
 * 4. Generate a migration: `npx prisma migrate dev --name add_<class>`.
 */

// ----------------------------------------------------------------------------
// Asset class coverage — the full 14-market vision
// ----------------------------------------------------------------------------

/**
 * Every asset class TradCopilot supports or plans to support.
 * Keep this in sync with:
 *   - prisma/schema.prisma  (the AssetClass enum)
 *   - src/lib/types.ts      (the AssetClass string union)
 */
export type AssetClass =
  | "CRYPTO"
  | "FOREX"
  | "COMMODITY"
  | "INDEX"
  | "INDIAN_MARKET"
  | "US_MARKET"
  | "EUROPEAN_MARKET"
  | "ASIAN_MARKET"
  | "AUSTRALIAN_MARKET"
  | "ETF"
  | "OPTIONS"
  | "FUTURES"
  | "BONDS"
  | "REIT"
  | "MUTUAL_FUND";

/**
 * Display exchange / data venue used for a symbol. Surfaced in the UI
 * ("Exchange: Binance") and in telemetry logs. Free-form string so new
 * markets do not require an enum change.
 */

// ----------------------------------------------------------------------------
// Per-symbol metadata
// ----------------------------------------------------------------------------

export interface SymbolMeta {
  /** Display symbol as shown in the UI and normalized by normalizeSymbol. */
  symbol: string;
  /** Asset class this symbol belongs to. */
  assetClass: AssetClass;
  /** Human-readable exchange / venue name for UI + telemetry. */
  exchange: string;
  /**
   * Baseline price used by the simulated-fallback random walk when every
   * upstream provider is unreachable. Should be a realistic recent price
   * so simulated data does not look absurd.
   */
  baselinePrice: number;
  /**
   * Approximate daily volatility (as a fraction, e.g. 0.02 = 2%).
   * Drives the step size of the simulated random walk.
   */
  volatility: number;
  /**
   * Binance Spot ticker (e.g. "BTCUSDT"). If set, the symbol is eligible
   * for Binance price/OHLCV/WS data. Undefined if Binance does not list it.
   */
  binanceTicker?: string;
  /**
   * TwelveData ticker (e.g. "NDX", "EUR/USD"). If set, the symbol is
   * eligible for TwelveData price/OHLCV. Undefined if TwelveData does not
   * cover it.
   */
  twelvedataTicker?: string;
}

/**
 * The canonical symbol universe. Keyed by display symbol for O(1) lookup.
 * Every symbol the app knows about must be listed here.
 */
export const SYMBOL_REGISTRY: Record<string, SymbolMeta> = {
  // ── Crypto ────────────────────────────────────────────────────────────────
  "BTC/USD": {
    symbol: "BTC/USD",
    assetClass: "CRYPTO",
    exchange: "Binance",
    baselinePrice: 68250,
    volatility: 0.02,
    binanceTicker: "BTCUSDT",
  },
  "ETH/USD": {
    symbol: "ETH/USD",
    assetClass: "CRYPTO",
    exchange: "Binance",
    baselinePrice: 3480,
    volatility: 0.03,
    binanceTicker: "ETHUSDT",
  },
  "SOL/USD": {
    symbol: "SOL/USD",
    assetClass: "CRYPTO",
    exchange: "Binance",
    baselinePrice: 142.5,
    volatility: 0.05,
    binanceTicker: "SOLUSDT",
  },

  // ── Forex ─────────────────────────────────────────────────────────────────
  "EUR/USD": {
    symbol: "EUR/USD",
    assetClass: "FOREX",
    exchange: "FX",
    baselinePrice: 1.08,
    volatility: 0.003,
    binanceTicker: "EURUSDT",
    twelvedataTicker: "EUR/USD",
  },
  "GBP/USD": {
    symbol: "GBP/USD",
    assetClass: "FOREX",
    exchange: "FX",
    baselinePrice: 1.25,
    volatility: 0.004,
    binanceTicker: "GBPUSDT",
    twelvedataTicker: "GBP/USD",
  },
  "USD/JPY": {
    symbol: "USD/JPY",
    assetClass: "FOREX",
    exchange: "FX",
    baselinePrice: 155,
    volatility: 0.005,
    twelvedataTicker: "USD/JPY",
  },

  // ── Commodity ─────────────────────────────────────────────────────────────
  "XAU/USD": {
    symbol: "XAU/USD",
    assetClass: "COMMODITY",
    exchange: "OANDA",
    baselinePrice: 2300,
    volatility: 0.01,
    twelvedataTicker: "XAU/USD",
  },

  // ── Indices ───────────────────────────────────────────────────────────────
  NASDAQ: {
    symbol: "NASDAQ",
    assetClass: "INDEX",
    exchange: "NASDAQ",
    baselinePrice: 18000,
    volatility: 0.012,
    twelvedataTicker: "NDX",
  },
  "S&P500": {
    symbol: "S&P500",
    assetClass: "INDEX",
    exchange: "FOREXCOM",
    baselinePrice: 5000,
    volatility: 0.008,
    twelvedataTicker: "SPX",
  },

  // ── Future markets (placeholder entries — add tickers when integrated) ─────
  // Examples showing how new markets are added. Uncomment and fill in when
  // upstream providers are configured:
  //
  // "RELIANCE": {
  //   symbol: "RELIANCE",
  //   assetClass: "INDIAN_MARKET",
  //   exchange: "NSE",
  //   baselinePrice: 2950,
  //   volatility: 0.018,
  //   twelvedataTicker: "RELIANCE.NS",
  // },
  // "AAPL": {
  //   symbol: "AAPL",
  //   assetClass: "US_MARKET",
  //   exchange: "NASDAQ",
  //   baselinePrice: 195,
  //   volatility: 0.015,
  //   twelvedataTicker: "AAPL",
  // },
};

// ----------------------------------------------------------------------------
// Derived accessors — the API every other module uses
// ----------------------------------------------------------------------------

/** All display symbols in the registry. */
export const SYMBOLS: string[] = Object.keys(SYMBOL_REGISTRY);

/** Symbols grouped by asset class (computed once, lazily cached). */
let _byClass: Record<AssetClass, string[]> | null = null;

function groupByClass(): Record<AssetClass, string[]> {
  if (_byClass) return _byClass;
  const acc = {} as Record<AssetClass, string[]>;
  for (const meta of Object.values(SYMBOL_REGISTRY)) {
    (acc[meta.assetClass] ??= []).push(meta.symbol);
  }
  _byClass = acc;
  return acc;
}

/** Crypto symbols — replaces CRYPTO_SYMBOLS everywhere. */
export const CRYPTO_SYMBOLS: string[] = groupByClass().CRYPTO ?? [];

/** Forex symbols — replaces FOREX_SYMBOLS everywhere. */
export const FOREX_SYMBOLS: string[] = groupByClass().FOREX ?? [];

/** Index symbols — replaces INDEX_SYMBOLS everywhere. */
export const INDEX_SYMBOLS: string[] = groupByClass().INDEX ?? [];

/** Commodity symbols — replaces inline XAU/USD checks everywhere. */
export const COMMODITY_SYMBOLS: string[] = groupByClass().COMMODITY ?? [];

// ── Provider symbol maps (derived, not duplicated) ───────────────────────────

/**
 * App symbol → Binance Spot ticker.
 * Replaces the inline BINANCE_SYMBOL_MAP in useBinanceStream.ts and the
 * manual `.replace("/USD", "USDT")` in market.ts.
 */
export const BINANCE_SYMBOL_MAP: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const [sym, meta] of Object.entries(SYMBOL_REGISTRY)) {
    if (meta.binanceTicker) m[sym] = meta.binanceTicker;
  }
  return m;
})();

/**
 * App symbol → TwelveData ticker.
 * Replaces TWELVEDATA_SYMBOL_MAP in market.ts.
 */
export const TWELVEDATA_SYMBOL_MAP: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const [sym, meta] of Object.entries(SYMBOL_REGISTRY)) {
    if (meta.twelvedataTicker) m[sym] = meta.twelvedataTicker;
  }
  return m;
})();

/** Symbols that stream over Binance WebSocket (subset of Binance Spot pairs). */
export const BINANCE_WS_SYMBOLS: string[] = [
  "BTC/USD",
  "ETH/USD",
  "SOL/USD",
  "EUR/USD",
  "GBP/USD",
];

// ── Baseline / volatility lookup (replaces BASELINE_PRICES / VOLATILITIES) ───

/** Baseline price per symbol — used by the simulated fallback walk. */
export const BASELINE_PRICES: Record<string, number> = (() => {
  const m: Record<string, number> = {};
  for (const [sym, meta] of Object.entries(SYMBOL_REGISTRY)) {
    m[sym] = meta.baselinePrice;
  }
  return m;
})();

/** Daily volatility per symbol — used by the simulated fallback walk. */
export const VOLATILITIES: Record<string, number> = (() => {
  const m: Record<string, number> = {};
  for (const [sym, meta] of Object.entries(SYMBOL_REGISTRY)) {
    m[sym] = meta.volatility;
  }
  return m;
})();

// ── Classification helpers (replaces inline array / string checks) ───────────

/** Returns true if the symbol is a crypto asset. */
export function isCrypto(symbol: string): boolean {
  return SYMBOL_REGISTRY[symbol]?.assetClass === "CRYPTO";
}

/** Returns true if the symbol is a forex pair. */
export function isForex(symbol: string): boolean {
  return SYMBOL_REGISTRY[symbol]?.assetClass === "FOREX";
}

/** Returns true if the symbol is an index. */
export function isIndex(symbol: string): boolean {
  return SYMBOL_REGISTRY[symbol]?.assetClass === "INDEX";
}

/** Returns true if the symbol is a commodity (e.g. XAU/USD). */
export function isCommodity(symbol: string): boolean {
  return SYMBOL_REGISTRY[symbol]?.assetClass === "COMMODITY";
}

/** Returns true if Binance has a spot pair for this symbol. */
export function isBinanceSupported(symbol: string): boolean {
  return symbol in BINANCE_SYMBOL_MAP;
}

/** Returns true if TwelveData covers this symbol. */
export function isTwelvedataSupported(symbol: string): boolean {
  return symbol in TWELVEDATA_SYMBOL_MAP;
}

/** Returns true if the symbol streams over Binance WebSocket. */
export function isBinanceWsSupported(symbol: string): boolean {
  return BINANCE_WS_SYMBOLS.includes(symbol);
}

// ── Provider dispatch helpers (the logic that was inline in market.ts) ───────

/**
 * Should this symbol try TwelveData first?
 * Mirrors the old `wantsTwelveData` logic: indices, XAU, and forex pairs
 * when the TwelveData key is configured.
 */
export function wantsTwelveData(
  symbol: string,
  keyValid: boolean
): boolean {
  if (isIndex(symbol) || isCommodity(symbol)) return true;
  if (isForex(symbol) && keyValid) return true;
  return false;
}

/**
 * Should this symbol try Binance?
 * Mirrors the old `wantsBinance` logic: crypto always, plus EUR/GBP.
 */
export function wantsBinance(symbol: string): boolean {
  if (isCrypto(symbol)) return true;
  return ["EUR/USD", "GBP/USD"].includes(symbol);
}

/**
 * Resolve the display exchange name for a symbol.
 * Replaces the inline getExchangeForSymbol() in the chat route.
 */
export function getExchangeName(symbol: string): string {
  return SYMBOL_REGISTRY[symbol]?.exchange ?? "BINANCE";
}
