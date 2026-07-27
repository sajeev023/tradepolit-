/**
 * src/lib/supported-symbols.ts
 *
 * Single source of truth for the tradable instrument universe across
 * TradCopilot. Replaces the 6+ disjoint hardcoded symbol lists that
 * previously lived in market.ts, search/route.ts, market-overview/route.ts,
 * the watchlist page, the charts page, and market-pulse.
 *
 * Global Markets scope: Crypto, Forex, Commodities, Indices, and equities
 * across US / India / Japan / UAE / UK / Europe. Equity/region resolution is
 * routed through Twelve Data via `exchange`/`micCode` (Twelve Data requires
 * the exchange to disambiguate non-US listings, e.g. 7203 → TSE, SHEL → LSE).
 *
 * Adding a symbol here automatically makes it available to the market data
 * provider chain, search, watchlist, charts, and AI market-overview — no
 * other file needs to be edited for the symbol to be served.
 */

export type AssetClass = "CRYPTO" | "FOREX" | "COMMODITY" | "INDEX" | "STOCK";
export type Region = "GLOBAL" | "US" | "IN" | "JP" | "AE" | "UK" | "EU";
export type Provider = "twelvedata" | "binance" | "coinbase";

export interface SupportedSymbol {
  /** Canonical display symbol (what users see and what's stored). */
  symbol: string;
  /** Human-readable label for menus. */
  displayName: string;
  assetClass: AssetClass;
  region: Region;
  /** Ordered provider chain — the first to return a price wins. */
  providers: Provider[];
  /**
   * Symbol to send to Twelve Data. Defaults to `symbol` if omitted. Differs
   * for indices (NASDAQ→NDX, S&P500→SPX) and LSE tickers (SHEL.L→SHEL).
   */
  twelvedataSymbol?: string;
  /** Twelve Data `exchange` param for non-US / ambiguous listings. */
  exchange?: string;
  /** Optional MIC code (alternative to `exchange`). */
  micCode?: string;
  /** Symbol on Binance (defaults to symbol with "/USD"→"USDT"). */
  binanceSymbol?: string;
  /** Symbol on Coinbase (defaults to symbol with "/"→"-"). */
  coinbaseSymbol?: string;
  /** Baseline price for the labelled-simulated fallback. */
  baselinePrice: number;
  /** Daily volatility used by the smooth-walk simulated fallback. */
  volatility: number;
}

// ─── Crypto ──────────────────────────────────────────────────────────────
const CRYPTO: SupportedSymbol[] = [
  { symbol: "BTC/USD", displayName: "Bitcoin", assetClass: "CRYPTO", region: "GLOBAL", providers: ["binance", "coinbase"], baselinePrice: 68250, volatility: 0.02 },
  { symbol: "ETH/USD", displayName: "Ethereum", assetClass: "CRYPTO", region: "GLOBAL", providers: ["binance", "coinbase"], baselinePrice: 3480, volatility: 0.03 },
  { symbol: "SOL/USD", displayName: "Solana", assetClass: "CRYPTO", region: "GLOBAL", providers: ["binance", "coinbase"], baselinePrice: 142.5, volatility: 0.05 },
];

// ─── Forex ────────────────────────────────────────────────────────────────
const FOREX: SupportedSymbol[] = [
  // EUR/USD & GBP/USD try Twelve Data first (when keyed), then Binance; the
  // legacy chain kept Binance as a high-frequency fallback for these two.
  { symbol: "EUR/USD", displayName: "Euro / US Dollar", assetClass: "FOREX", region: "GLOBAL", providers: ["twelvedata", "binance", "coinbase"], baselinePrice: 1.08, volatility: 0.003 },
  { symbol: "GBP/USD", displayName: "British Pound / US Dollar", assetClass: "FOREX", region: "GLOBAL", providers: ["twelvedata", "binance", "coinbase"], baselinePrice: 1.25, volatility: 0.004 },
  { symbol: "USD/JPY", displayName: "US Dollar / Japanese Yen", assetClass: "FOREX", region: "GLOBAL", providers: ["twelvedata"], baselinePrice: 155.0, volatility: 0.005 },
];

// ─── Commodities ──────────────────────────────────────────────────────────
const COMMODITY: SupportedSymbol[] = [
  { symbol: "XAU/USD", displayName: "Gold / US Dollar", assetClass: "COMMODITY", region: "GLOBAL", providers: ["twelvedata"], twelvedataSymbol: "XAU/USD", baselinePrice: 2300, volatility: 0.01 },
];

// ─── Indices ─────────────────────────────────────────────────────────────
const INDEX: SupportedSymbol[] = [
  { symbol: "NASDAQ", displayName: "Nasdaq 100", assetClass: "INDEX", region: "US", providers: ["twelvedata"], twelvedataSymbol: "NDX", baselinePrice: 18000, volatility: 0.012 },
  { symbol: "S&P500", displayName: "S&P 500", assetClass: "INDEX", region: "US", providers: ["twelvedata"], twelvedataSymbol: "SPX", baselinePrice: 5000, volatility: 0.008 },
  { symbol: "DJI", displayName: "Dow Jones Industrial Avg", assetClass: "INDEX", region: "US", providers: ["twelvedata"], twelvedataSymbol: "DJI", baselinePrice: 39000, volatility: 0.01 },
  { symbol: "NIKKEI", displayName: "Nikkei 225", assetClass: "INDEX", region: "JP", providers: ["twelvedata"], twelvedataSymbol: "NI225", exchange: "TSE", baselinePrice: 38000, volatility: 0.011 },
  { symbol: "FTSE", displayName: "FTSE 100", assetClass: "INDEX", region: "UK", providers: ["twelvedata"], twelvedataSymbol: "FTSE", exchange: "LSE", baselinePrice: 8000, volatility: 0.009 },
  { symbol: "DAX", displayName: "DAX 40", assetClass: "INDEX", region: "EU", providers: ["twelvedata"], twelvedataSymbol: "DAX", exchange: "XETR", baselinePrice: 18000, volatility: 0.01 },
];

// ─── US Stocks ────────────────────────────────────────────────────────────
const US_STOCKS: SupportedSymbol[] = [
  { symbol: "AAPL", displayName: "Apple Inc.", assetClass: "STOCK", region: "US", providers: ["twelvedata"], exchange: "NASDAQ", baselinePrice: 190, volatility: 0.015 },
  { symbol: "MSFT", displayName: "Microsoft Corp.", assetClass: "STOCK", region: "US", providers: ["twelvedata"], exchange: "NASDAQ", baselinePrice: 420, volatility: 0.013 },
  { symbol: "NVDA", displayName: "NVIDIA Corp.", assetClass: "STOCK", region: "US", providers: ["twelvedata"], exchange: "NASDAQ", baselinePrice: 120, volatility: 0.03 },
  { symbol: "TSLA", displayName: "Tesla Inc.", assetClass: "STOCK", region: "US", providers: ["twelvedata"], exchange: "NASDAQ", baselinePrice: 250, volatility: 0.028 },
  { symbol: "AMZN", displayName: "Amazon.com Inc.", assetClass: "STOCK", region: "US", providers: ["twelvedata"], exchange: "NASDAQ", baselinePrice: 185, volatility: 0.018 },
];

// ─── Indian Stocks (NSE) ─────────────────────────────────────────────────
const IN_STOCKS: SupportedSymbol[] = [
  { symbol: "RELIANCE", displayName: "Reliance Industries", assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 2900, volatility: 0.018 },
  { symbol: "TCS", displayName: "Tata Consultancy Services", assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 3900, volatility: 0.014 },
  { symbol: "INFY", displayName: "Infosys Ltd.", assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 1600, volatility: 0.016 },
  { symbol: "HDFCBANK", displayName: "HDFC Bank Ltd.", assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 1500, volatility: 0.015 },
];

// ─── Japanese Stocks (TSE) ───────────────────────────────────────────────
const JP_STOCKS: SupportedSymbol[] = [
  { symbol: "7203", displayName: "Toyota Motor Corp.", assetClass: "STOCK", region: "JP", providers: ["twelvedata"], exchange: "TSE", baselinePrice: 2800, volatility: 0.015 },
  { symbol: "6758", displayName: "Sony Group Corp.", assetClass: "STOCK", region: "JP", providers: ["twelvedata"], exchange: "TSE", baselinePrice: 13000, volatility: 0.017 },
  { symbol: "9984", displayName: "SoftBank Group", assetClass: "STOCK", region: "JP", providers: ["twelvedata"], exchange: "TSE", baselinePrice: 9000, volatility: 0.022 },
];

// ─── UAE Stocks (DFM / ADX) ──────────────────────────────────────────────
const AE_STOCKS: SupportedSymbol[] = [
  { symbol: "EMAAR", displayName: "Emaar Properties (DFM)", assetClass: "STOCK", region: "AE", providers: ["twelvedata"], exchange: "DFM", baselinePrice: 9.5, volatility: 0.015 },
  { symbol: "AIRARABIA", displayName: "Air Arabia (ADX)", assetClass: "STOCK", region: "AE", providers: ["twelvedata"], exchange: "ADX", baselinePrice: 1.6, volatility: 0.016 },
];

// ─── UK Stocks (LSE) ─────────────────────────────────────────────────────
const UK_STOCKS: SupportedSymbol[] = [
  { symbol: "SHEL.L", displayName: "Shell plc", assetClass: "STOCK", region: "UK", providers: ["twelvedata"], twelvedataSymbol: "SHEL", exchange: "LSE", baselinePrice: 4700, volatility: 0.014 },
  { symbol: "HSBA.L", displayName: "HSBC Holdings", assetClass: "STOCK", region: "UK", providers: ["twelvedata"], twelvedataSymbol: "HSBA", exchange: "LSE", baselinePrice: 700, volatility: 0.013 },
  { symbol: "AZN.L", displayName: "AstraZeneca plc", assetClass: "STOCK", region: "UK", providers: ["twelvedata"], twelvedataSymbol: "AZN", exchange: "LSE", baselinePrice: 12000, volatility: 0.015 },
  { symbol: "BP.L", displayName: "BP plc", assetClass: "STOCK", region: "UK", providers: ["twelvedata"], twelvedataSymbol: "BP", exchange: "LSE", baselinePrice: 480, volatility: 0.014 },
];

// ─── European Stocks (XETR / Euronext) ───────────────────────────────────
const EU_STOCKS: SupportedSymbol[] = [
  { symbol: "SAP", displayName: "SAP SE (XETR)", assetClass: "STOCK", region: "EU", providers: ["twelvedata"], exchange: "XETR", baselinePrice: 170, volatility: 0.014 },
  { symbol: "AIR", displayName: "Airbus SE (Euronext)", assetClass: "STOCK", region: "EU", providers: ["twelvedata"], exchange: "Euronext", baselinePrice: 140, volatility: 0.015 },
  { symbol: "ASML", displayName: "ASML Holding (Euronext)", assetClass: "STOCK", region: "EU", providers: ["twelvedata"], exchange: "Euronext", baselinePrice: 900, volatility: 0.02 },
];

export const SUPPORTED_SYMBOLS: SupportedSymbol[] = [
  ...CRYPTO,
  ...FOREX,
  ...COMMODITY,
  ...INDEX,
  ...US_STOCKS,
  ...IN_STOCKS,
  ...JP_STOCKS,
  ...AE_STOCKS,
  ...UK_STOCKS,
  ...EU_STOCKS,
];

export const SUPPORTED_SYMBOL_MAP: Record<string, SupportedSymbol> = Object.fromEntries(
  SUPPORTED_SYMBOLS.map((s) => [s.symbol, s])
);

// Backwards-compatible string lists (previous market.ts exported these
// names implicitly via local consts; importers use these helpers now).
export const CRYPTO_SYMBOLS = CRYPTO.map((s) => s.symbol);
export const FOREX_SYMBOLS = FOREX.map((s) => s.symbol);
export const INDEX_SYMBOLS = INDEX.map((s) => s.symbol);
export const STOCK_SYMBOLS = SUPPORTED_SYMBOLS.filter((s) => s.assetClass === "STOCK").map((s) => s.symbol);
export const COMMODITY_SYMBOLS = COMMODITY.map((s) => s.symbol);
export const ALL_SYMBOLS = SUPPORTED_SYMBOLS.map((s) => s.symbol);

export const BASELINE_PRICES: Record<string, number> = Object.fromEntries(
  SUPPORTED_SYMBOLS.map((s) => [s.symbol, s.baselinePrice])
);

export const VOLATILITIES: Record<string, number> = Object.fromEntries(
  SUPPORTED_SYMBOLS.map((s) => [s.symbol, s.volatility])
);

export function isSupportedSymbol(symbol: string): boolean {
  return Object.prototype.hasOwnProperty.call(SUPPORTED_SYMBOL_MAP, symbol);
}

export function getSupportedSymbol(symbol: string): SupportedSymbol | undefined {
  return SUPPORTED_SYMBOL_MAP[symbol];
}

export function isCryptoSymbol(symbol: string): boolean {
  return CRYPTO_SYMBOLS.includes(symbol);
}
export function isForexSymbol(symbol: string): boolean {
  return FOREX_SYMBOLS.includes(symbol);
}
export function isIndexSymbol(symbol: string): boolean {
  return INDEX_SYMBOLS.includes(symbol);
}
export function isStockSymbol(symbol: string): boolean {
  return STOCK_SYMBOLS.includes(symbol);
}

/** Symbols to send to Twelve Data (resolves display→ticker, e.g. NASDAQ→NDX). */
export function twelvedataSymbolFor(symbol: string): string {
  return SUPPORTED_SYMBOL_MAP[symbol]?.twelvedataSymbol ?? symbol;
}

/** Exchange param to append to Twelve Data requests for non-US listings. */
export function twelvedataExchangeFor(symbol: string): string | undefined {
  return SUPPORTED_SYMBOL_MAP[symbol]?.exchange;
}

/** Ordered provider chain for a symbol (empty if unsupported). */
export function providersFor(symbol: string): Provider[] {
  return SUPPORTED_SYMBOL_MAP[symbol]?.providers ?? [];
}

/** Default Binance symbol (BTC/USD → BTCUSDT) unless the registry overrides. */
export function binanceSymbolFor(symbol: string): string {
  const entry = SUPPORTED_SYMBOL_MAP[symbol];
  if (entry?.binanceSymbol) return entry.binanceSymbol;
  return symbol.replace("/USD", "USDT");
}

/** Default Coinbase symbol (BTC/USD → BTC-USD) unless the registry overrides. */
export function coinbaseSymbolFor(symbol: string): string {
  const entry = SUPPORTED_SYMBOL_MAP[symbol];
  if (entry?.coinbaseSymbol) return entry.coinbaseSymbol;
  return symbol.replace("/", "-");
}

export interface SymbolGroup {
  label: string;
  assetClass: AssetClass;
  region?: Region;
  symbols: { symbol: string; displayName: string }[];
}

/** Grouped list for UI selectors (watchlist / charts / market-pulse). */
export function getSymbolGroups(): SymbolGroup[] {
  const groups: SymbolGroup[] = [
    { label: "Crypto", assetClass: "CRYPTO", symbols: CRYPTO.map((s) => ({ symbol: s.symbol, displayName: s.displayName })) },
    { label: "Forex", assetClass: "FOREX", symbols: FOREX.map((s) => ({ symbol: s.symbol, displayName: s.displayName })) },
    { label: "Commodities", assetClass: "COMMODITY", symbols: COMMODITY.map((s) => ({ symbol: s.symbol, displayName: s.displayName })) },
    { label: "Indices", assetClass: "INDEX", symbols: INDEX.map((s) => ({ symbol: s.symbol, displayName: s.displayName })) },
    { label: "US Stocks", assetClass: "STOCK", region: "US", symbols: US_STOCKS.map((s) => ({ symbol: s.symbol, displayName: s.displayName })) },
    { label: "Indian Stocks", assetClass: "STOCK", region: "IN", symbols: IN_STOCKS.map((s) => ({ symbol: s.symbol, displayName: s.displayName })) },
    { label: "Japanese Stocks", assetClass: "STOCK", region: "JP", symbols: JP_STOCKS.map((s) => ({ symbol: s.symbol, displayName: s.displayName })) },
    { label: "UAE Stocks", assetClass: "STOCK", region: "AE", symbols: AE_STOCKS.map((s) => ({ symbol: s.symbol, displayName: s.displayName })) },
    { label: "UK Stocks", assetClass: "STOCK", region: "UK", symbols: UK_STOCKS.map((s) => ({ symbol: s.symbol, displayName: s.displayName })) },
    { label: "European Stocks", assetClass: "STOCK", region: "EU", symbols: EU_STOCKS.map((s) => ({ symbol: s.symbol, displayName: s.displayName })) },
  ];
  return groups;
}