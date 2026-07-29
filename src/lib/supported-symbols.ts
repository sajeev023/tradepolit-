/**
 * src/lib/supported-symbols.ts
 *
 * The single source of truth for the tradable instrument universe across
 * TradCopilot — AND for every provider dimension each instrument touches.
 *
 * A previous architecture kept only the REST price/OHLCV provider chain here
 * and re-encoded every other dimension (TradingView feed, WebSocket stream,
 * news category/query, risk instrument spec, AI-prompt exchange label, default
 * symbol) as a separate hardcoded `if`/`switch`/`Record` in ~15 consuming
 * files. That made "add a market = edit 15 files" and was the root cause of
 * the recurring "Bitcoin appears on a stock chart" class of bugs: the
 * decentralized fallbacks drifted out of sync with the registry.
 *
 * Now every dimension lives on the registry entry itself. Adding a market is
 * a row in `MARKETS` + new `SupportedSymbol` entries; every consumer derives
 * automatically through the accessors below. No consuming file dispatches on
 * symbol/market strings.
 */

// ─── Canonical shared types ─────────────────────────────────────────────────
// `AssetClass` is defined ONCE here and re-exported by `types.ts`. The risk
// engine and every other consumer imports from here so the union can never
// diverge (it previously did: the risk-engine copy omitted STOCK, so stocks
// silently classified as CRYPTO).
export type AssetClass = "CRYPTO" | "FOREX" | "COMMODITY" | "INDEX" | "STOCK";
export type Region = "GLOBAL" | "US" | "IN" | "JP" | "AE" | "UK" | "EU";
export type MarketRegion = "INDIA" | "US" | "UAE" | "UK" | "JAPAN" | "EUROPE" | "FOREX" | "CRYPTO";
export type Provider = "twelvedata" | "binance" | "coinbase";

/**
 * Per-instrument risk parameters used by the risk engine for position sizing.
 * Optional — instruments without a spec fall back to a typed CRYPTO default
 * via `riskSpecFor()`. Lives on the registry so the risk engine, risk
 * calculator UI, and backtester all share one definition (previously
 * duplicated 4× with divergent contents).
 */
export interface RiskSpec {
  contractSize: number;
  pipSize: number;
  minTradable: number;
  isJpyQuote: boolean;
}

export interface SupportedSymbol {
  symbol: string;
  displayName: string;
  assetClass: AssetClass;
  region: Region;
  providers: Provider[];
  twelvedataSymbol?: string;
  exchange?: string;
  micCode?: string;
  binanceSymbol?: string;
  coinbaseSymbol?: string;
  baselinePrice: number;
  volatility: number;

  // ── Provider dimensions (the root-cause fix) ──────────────────────────────
  /** Exact TradingView feed string, e.g. `BINANCE:BTCUSDT`, `NSE:RELIANCE`. */
  tradingViewSymbol: string;
  /** Binance WebSocket stream name (e.g. `btcusdt`). Omit for non-streamable symbols. */
  binanceStream?: string;
  /** Finnhub news category for this symbol. */
  newsCategory?: string;
  /** NewsAPI `q=` query for this symbol. */
  newsQuery?: string;
  /** Lowercase keywords whose presence in a headline maps the article to this symbol. */
  newsKeywords?: string[];
  /** Risk-engine instrument spec. */
  riskSpec?: RiskSpec;
  /** Exchange label injected into AI analysis prompts (e.g. `BINANCE`, `FX`, `NASDAQ`). */
  aiExchangeLabel?: string;
  /**
   * Marks the curated "popular" instruments surfaced in quick-select dropdowns
   * (alerts, backtester, news filter, alert evaluator). Replaces the per-page
   * hardcoded `["BTC/USD","ETH/USD",...]` lists — curation lives in config, so
   * adding a popular instrument is a one-line registry edit, not a UI edit.
   */
  popular?: boolean;
}

/**
 * How a market selects its symbols. A market is either region-scoped (equities
 * of one country) or asset-class-scoped (FOREX/CRYPTO). Replaces the previous
 * hand-written `switch (market)` that mapped `MarketRegion` ↔ `Region` inline.
 */
export type MarketFilter = { region: Region } | { assetClass: AssetClass };

export interface MarketConfig {
  key: MarketRegion;
  label: string;
  flag: string;
  countryName: string;
  defaultSymbol: string;
  marketFilter: MarketFilter;
}

export const MARKETS: Record<MarketRegion, MarketConfig> = {
  INDIA:  { key: "INDIA",  label: "India (NSE/BSE)",            flag: "🇮🇳", countryName: "India",                defaultSymbol: "RELIANCE", marketFilter: { region: "IN" } },
  US:     { key: "US",     label: "United States (NYSE/NASDAQ)", flag: "🇺🇸", countryName: "United States",        defaultSymbol: "AAPL",     marketFilter: { region: "US" } },
  UAE:    { key: "UAE",    label: "United Arab Emirates (DFM/ADX)", flag: "🇦🇪", countryName: "United Arab Emirates", defaultSymbol: "EMAAR",  marketFilter: { region: "AE" } },
  UK:     { key: "UK",     label: "United Kingdom (LSE)",        flag: "🇬🇧", countryName: "United Kingdom",       defaultSymbol: "HSBA.L",   marketFilter: { region: "UK" } },
  JAPAN:  { key: "JAPAN",  label: "Japan (TSE)",                flag: "🇯🇵", countryName: "Japan",                defaultSymbol: "7203",    marketFilter: { region: "JP" } },
  EUROPE: { key: "EUROPE", label: "Europe (DAX/Euronext)",       flag: "🇪🇺", countryName: "Europe",              defaultSymbol: "SAP",      marketFilter: { region: "EU" } },
  FOREX:  { key: "FOREX",  label: "Forex Currency Pairs",        flag: "🌍", countryName: "Global Forex",         defaultSymbol: "EUR/USD",  marketFilter: { assetClass: "FOREX" } },
  CRYPTO: { key: "CRYPTO", label: "Cryptocurrency",             flag: "₿",  countryName: "Global Crypto",        defaultSymbol: "BTC/USD",  marketFilter: { assetClass: "CRYPTO" } },
};

// ─── Crypto ──────────────────────────────────────────────────────────────
const CRYPTO: SupportedSymbol[] = [
  { symbol: "BTC/USD", displayName: "Bitcoin",   assetClass: "CRYPTO", region: "GLOBAL", providers: ["binance", "coinbase"], baselinePrice: 68250, volatility: 0.02, tradingViewSymbol: "BINANCE:BTCUSDT",  binanceStream: "btcusdt", newsCategory: "crypto", newsQuery: "Bitcoin OR BTC",   newsKeywords: ["btc", "bitcoin", "xbt"], riskSpec: { contractSize: 1, pipSize: 1,    minTradable: 0.001, isJpyQuote: false }, aiExchangeLabel: "BINANCE", popular: true },
  { symbol: "ETH/USD", displayName: "Ethereum",  assetClass: "CRYPTO", region: "GLOBAL", providers: ["binance", "coinbase"], baselinePrice: 3480,  volatility: 0.03, tradingViewSymbol: "BINANCE:ETHUSDT",  binanceStream: "ethusdt", newsCategory: "crypto", newsQuery: "Ethereum OR ETH",  newsKeywords: ["eth", "ethereum"],       riskSpec: { contractSize: 1, pipSize: 0.01, minTradable: 0.01,  isJpyQuote: false }, aiExchangeLabel: "BINANCE", popular: true },
  { symbol: "SOL/USD", displayName: "Solana",    assetClass: "CRYPTO", region: "GLOBAL", providers: ["binance", "coinbase"], baselinePrice: 142.5, volatility: 0.05, tradingViewSymbol: "BINANCE:SOLUSDT",  binanceStream: "solusdt", newsCategory: "crypto", newsQuery: "Solana OR SOL",    newsKeywords: ["sol", "solana"],         riskSpec: { contractSize: 1, pipSize: 0.01, minTradable: 0.01,  isJpyQuote: false }, aiExchangeLabel: "BINANCE", popular: true },
  { symbol: "BNB/USD", displayName: "BNB",       assetClass: "CRYPTO", region: "GLOBAL", providers: ["binance"],             baselinePrice: 580,   volatility: 0.03, tradingViewSymbol: "BINANCE:BNBUSDT" },
  { symbol: "XRP/USD", displayName: "XRP",        assetClass: "CRYPTO", region: "GLOBAL", providers: ["binance", "coinbase"], baselinePrice: 0.55, volatility: 0.04, tradingViewSymbol: "BINANCE:XRPUSDT" },
  { symbol: "ADA/USD", displayName: "Cardano",   assetClass: "CRYPTO", region: "GLOBAL", providers: ["binance", "coinbase"], baselinePrice: 0.38, volatility: 0.045, tradingViewSymbol: "BINANCE:ADAUSDT" },
  { symbol: "DOGE/USD", displayName: "Dogecoin", assetClass: "CRYPTO", region: "GLOBAL", providers: ["binance", "coinbase"], baselinePrice: 0.12, volatility: 0.06, tradingViewSymbol: "BINANCE:DOGEUSDT" },
  { symbol: "AVAX/USD", displayName: "Avalanche", assetClass: "CRYPTO", region: "GLOBAL", providers: ["binance", "coinbase"], baselinePrice: 28, volatility: 0.05, tradingViewSymbol: "BINANCE:AVAXUSDT" },
  { symbol: "DOT/USD", displayName: "Polkadot",  assetClass: "CRYPTO", region: "GLOBAL", providers: ["binance"],             baselinePrice: 6.5,  volatility: 0.045, tradingViewSymbol: "BINANCE:DOTUSDT" },
  { symbol: "LINK/USD", displayName: "Chainlink", assetClass: "CRYPTO", region: "GLOBAL", providers: ["binance", "coinbase"], baselinePrice: 14, volatility: 0.04, tradingViewSymbol: "BINANCE:LINKUSDT" },
];

// ─── Forex ────────────────────────────────────────────────────────────────
const FOREX: SupportedSymbol[] = [
  { symbol: "EUR/USD", displayName: "Euro / US Dollar",        assetClass: "FOREX", region: "GLOBAL", providers: ["twelvedata", "binance"], baselinePrice: 1.085, volatility: 0.003,  tradingViewSymbol: "FX:EURUSD", binanceStream: "eurusdt", newsCategory: "forex", newsQuery: "EUR OR Euro OR ECB",        newsKeywords: ["eur", "euro", "ecb"],       riskSpec: { contractSize: 100000, pipSize: 0.0001, minTradable: 1000, isJpyQuote: false }, aiExchangeLabel: "FX", popular: true },
  { symbol: "GBP/USD", displayName: "British Pound / US Dollar", assetClass: "FOREX", region: "GLOBAL", providers: ["twelvedata", "binance"], baselinePrice: 1.28,  volatility: 0.004,  tradingViewSymbol: "FX:GBPUSD", binanceStream: "gbpusd", newsCategory: "forex", newsQuery: "GBP OR Pound Sterling OR BOE", newsKeywords: ["gbp", "sterling", "pound", "boe"], riskSpec: { contractSize: 100000, pipSize: 0.0001, minTradable: 1000, isJpyQuote: false }, aiExchangeLabel: "FX", popular: true },
  { symbol: "USD/JPY", displayName: "US Dollar / Japanese Yen", assetClass: "FOREX", region: "GLOBAL", providers: ["twelvedata"],           baselinePrice: 155.0, volatility: 0.005,  tradingViewSymbol: "FX:USDJPY",                          newsCategory: "forex", newsQuery: "JPY OR Japanese Yen OR BOJ",  newsKeywords: ["jpy", "yen", "boj"],        riskSpec: { contractSize: 100000, pipSize: 0.01,  minTradable: 1000, isJpyQuote: true },  aiExchangeLabel: "FX", popular: true },
  { symbol: "AUD/USD", displayName: "Australian Dollar / US Dollar", assetClass: "FOREX", region: "GLOBAL", providers: ["twelvedata"],     baselinePrice: 0.66,  volatility: 0.004,  tradingViewSymbol: "FX:AUDUSD" },
  { symbol: "USD/CAD", displayName: "US Dollar / Canadian Dollar", assetClass: "FOREX", region: "GLOBAL", providers: ["twelvedata"],        baselinePrice: 1.36,  volatility: 0.0035, tradingViewSymbol: "FX:USDCAD" },
  { symbol: "USD/CHF", displayName: "US Dollar / Swiss Franc",   assetClass: "FOREX", region: "GLOBAL", providers: ["twelvedata"],           baselinePrice: 0.89,  volatility: 0.004,  tradingViewSymbol: "FX:USDCHF" },
  { symbol: "NZD/USD", displayName: "New Zealand Dollar / US Dollar", assetClass: "FOREX", region: "GLOBAL", providers: ["twelvedata"],     baselinePrice: 0.61,  volatility: 0.0045, tradingViewSymbol: "FX:NZDUSD" },
  { symbol: "EUR/GBP", displayName: "Euro / British Pound",      assetClass: "FOREX", region: "GLOBAL", providers: ["twelvedata"],           baselinePrice: 0.84,  volatility: 0.003,  tradingViewSymbol: "FX:EURGBP",                                                                                                                                                riskSpec: { contractSize: 100000, pipSize: 0.0001, minTradable: 1000, isJpyQuote: false } },
  { symbol: "EUR/JPY", displayName: "Euro / Japanese Yen",       assetClass: "FOREX", region: "GLOBAL", providers: ["twelvedata"],           baselinePrice: 168.0, volatility: 0.005,  tradingViewSymbol: "FX:EURJPY",                                                                                                                                                riskSpec: { contractSize: 100000, pipSize: 0.01,  minTradable: 1000, isJpyQuote: true } },
  { symbol: "GBP/JPY", displayName: "British Pound / Japanese Yen", assetClass: "FOREX", region: "GLOBAL", providers: ["twelvedata"],       baselinePrice: 198.0, volatility: 0.006,  tradingViewSymbol: "FX:GBPJPY",                                                                                                                                                riskSpec: { contractSize: 100000, pipSize: 0.01,  minTradable: 1000, isJpyQuote: true } },
];

// ─── Commodities ──────────────────────────────────────────────────────────
const COMMODITY: SupportedSymbol[] = [
  { symbol: "XAU/USD", displayName: "Gold / US Dollar", assetClass: "COMMODITY", region: "GLOBAL", providers: ["twelvedata"], twelvedataSymbol: "XAU/USD", baselinePrice: 2380, volatility: 0.01, tradingViewSymbol: "OANDA:XAUUSD", newsCategory: "general", newsQuery: "Gold OR XAU OR Gold Price", newsKeywords: ["xau", "gold", "bullion"], riskSpec: { contractSize: 1, pipSize: 0.01, minTradable: 0.01, isJpyQuote: false }, aiExchangeLabel: "OANDA", popular: true },
];

// ─── Indices ─────────────────────────────────────────────────────────────
const INDEX: SupportedSymbol[] = [
  { symbol: "NASDAQ",  displayName: "Nasdaq 100",        assetClass: "INDEX", region: "US", providers: ["twelvedata"], twelvedataSymbol: "NDX",     baselinePrice: 19800, volatility: 0.012, tradingViewSymbol: "NASDAQ:NDX",     newsQuery: "NASDAQ OR QQQ OR stock market", newsKeywords: ["nasdaq", "qqq", "s&p", "dow", "spx", "stock", "fed", "rate", "inflation", "cpi", "interest"], riskSpec: { contractSize: 1, pipSize: 1, minTradable: 0.01, isJpyQuote: false }, aiExchangeLabel: "NASDAQ", popular: true },
  { symbol: "S&P500",  displayName: "S&P 500",            assetClass: "INDEX", region: "US", providers: ["twelvedata"], twelvedataSymbol: "SPX",     baselinePrice: 5450,  volatility: 0.008, tradingViewSymbol: "FOREXCOM:SPXUSD",                                                                                                                                                                                                                             riskSpec: { contractSize: 1, pipSize: 1, minTradable: 0.01, isJpyQuote: false }, aiExchangeLabel: "FOREXCOM" },
  { symbol: "DJI",     displayName: "Dow Jones Industrial Avg", assetClass: "INDEX", region: "US", providers: ["twelvedata"], twelvedataSymbol: "DJI", baselinePrice: 40200, volatility: 0.01,  tradingViewSymbol: "DJ:DJI" },
  { symbol: "NIFTY50", displayName: "NIFTY 50 (India)",  assetClass: "INDEX", region: "IN", providers: ["twelvedata"], twelvedataSymbol: "NIFTY",   exchange: "NSE", baselinePrice: 24500, volatility: 0.01,  tradingViewSymbol: "NSE:NIFTY" },
  { symbol: "SENSEX",  displayName: "SENSEX (India)",    assetClass: "INDEX", region: "IN", providers: ["twelvedata"], twelvedataSymbol: "SENSEX",  exchange: "BSE", baselinePrice: 80500, volatility: 0.009, tradingViewSymbol: "BSE:SENSEX" },
  { symbol: "NIKKEI",  displayName: "Nikkei 225 (Japan)", assetClass: "INDEX", region: "JP", providers: ["twelvedata"], twelvedataSymbol: "NI225",   exchange: "TSE", baselinePrice: 38500, volatility: 0.011, tradingViewSymbol: "TVC:NI225" },
  { symbol: "FTSE100", displayName: "FTSE 100 (UK)",     assetClass: "INDEX", region: "UK", providers: ["twelvedata"], twelvedataSymbol: "FTSE",    exchange: "LSE", baselinePrice: 8200,  volatility: 0.009, tradingViewSymbol: "INDEX:FTSE" },
  { symbol: "DAX",     displayName: "DAX 40 (Germany)",   assetClass: "INDEX", region: "EU", providers: ["twelvedata"], twelvedataSymbol: "DAX",     exchange: "XETR", baselinePrice: 18500, volatility: 0.01,  tradingViewSymbol: "XETR:DAX" },
];

// ─── US Stocks ────────────────────────────────────────────────────────────
const US_STOCKS: SupportedSymbol[] = [
  { symbol: "AAPL",  displayName: "Apple Inc.",          assetClass: "STOCK", region: "US", providers: ["twelvedata"], exchange: "NASDAQ", baselinePrice: 220,  volatility: 0.015, tradingViewSymbol: "NASDAQ:AAPL" },
  { symbol: "MSFT",  displayName: "Microsoft Corp.",      assetClass: "STOCK", region: "US", providers: ["twelvedata"], exchange: "NASDAQ", baselinePrice: 445,  volatility: 0.013, tradingViewSymbol: "NASDAQ:MSFT" },
  { symbol: "NVDA",  displayName: "NVIDIA Corp.",         assetClass: "STOCK", region: "US", providers: ["twelvedata"], exchange: "NASDAQ", baselinePrice: 125,  volatility: 0.03,  tradingViewSymbol: "NASDAQ:NVDA" },
  { symbol: "AMZN",  displayName: "Amazon.com Inc.",     assetClass: "STOCK", region: "US", providers: ["twelvedata"], exchange: "NASDAQ", baselinePrice: 185,  volatility: 0.018, tradingViewSymbol: "NASDAQ:AMZN" },
  { symbol: "TSLA",  displayName: "Tesla Inc.",           assetClass: "STOCK", region: "US", providers: ["twelvedata"], exchange: "NASDAQ", baselinePrice: 245,  volatility: 0.028, tradingViewSymbol: "NASDAQ:TSLA" },
  { symbol: "GOOGL", displayName: "Alphabet Inc.",        assetClass: "STOCK", region: "US", providers: ["twelvedata"], exchange: "NASDAQ", baselinePrice: 175,  volatility: 0.017, tradingViewSymbol: "NASDAQ:GOOGL" },
  { symbol: "META",  displayName: "Meta Platforms Inc.", assetClass: "STOCK", region: "US", providers: ["twelvedata"], exchange: "NASDAQ", baselinePrice: 485,  volatility: 0.022, tradingViewSymbol: "NASDAQ:META" },
  { symbol: "AMD",   displayName: "Advanced Micro Devices", assetClass: "STOCK", region: "US", providers: ["twelvedata"], exchange: "NASDAQ", baselinePrice: 155, volatility: 0.026, tradingViewSymbol: "NASDAQ:AMD" },
  { symbol: "NFLX",  displayName: "Netflix Inc.",        assetClass: "STOCK", region: "US", providers: ["twelvedata"], exchange: "NASDAQ", baselinePrice: 640,  volatility: 0.02,  tradingViewSymbol: "NASDAQ:NFLX" },
  { symbol: "AVGO",  displayName: "Broadcom Inc.",       assetClass: "STOCK", region: "US", providers: ["twelvedata"], exchange: "NASDAQ", baselinePrice: 160,  volatility: 0.024, tradingViewSymbol: "NASDAQ:AVGO" },
  { symbol: "V",     displayName: "Visa Inc.",           assetClass: "STOCK", region: "US", providers: ["twelvedata"], exchange: "NYSE",  baselinePrice: 270,  volatility: 0.011, tradingViewSymbol: "NYSE:V" },
  { symbol: "MA",    displayName: "Mastercard Inc.",      assetClass: "STOCK", region: "US", providers: ["twelvedata"], exchange: "NYSE",  baselinePrice: 440,  volatility: 0.012, tradingViewSymbol: "NYSE:MA" },
  { symbol: "PLTR",  displayName: "Palantir Technologies", assetClass: "STOCK", region: "US", providers: ["twelvedata"], exchange: "NYSE", baselinePrice: 28,   volatility: 0.035, tradingViewSymbol: "NYSE:PLTR" },
  { symbol: "ORCL",  displayName: "Oracle Corp.",        assetClass: "STOCK", region: "US", providers: ["twelvedata"], exchange: "NYSE",  baselinePrice: 140,  volatility: 0.018, tradingViewSymbol: "NYSE:ORCL" },
  { symbol: "INTC",  displayName: "Intel Corp.",         assetClass: "STOCK", region: "US", providers: ["twelvedata"], exchange: "NASDAQ", baselinePrice: 32,   volatility: 0.025, tradingViewSymbol: "NASDAQ:INTC" },
  { symbol: "KO",    displayName: "The Coca-Cola Company", assetClass: "STOCK", region: "US", providers: ["twelvedata"], exchange: "NYSE", baselinePrice: 65,   volatility: 0.008, tradingViewSymbol: "NYSE:KO" },
  { symbol: "MCD",   displayName: "McDonald's Corp.",    assetClass: "STOCK", region: "US", providers: ["twelvedata"], exchange: "NYSE",  baselinePrice: 255,  volatility: 0.009, tradingViewSymbol: "NYSE:MCD" },
  { symbol: "JPM",   displayName: "JPMorgan Chase & Co.", assetClass: "STOCK", region: "US", providers: ["twelvedata"], exchange: "NYSE",  baselinePrice: 205,  volatility: 0.013, tradingViewSymbol: "NYSE:JPM" },
  { symbol: "BRK.B", displayName: "Berkshire Hathaway Inc.", assetClass: "STOCK", region: "US", providers: ["twelvedata"], exchange: "NYSE", baselinePrice: 415, volatility: 0.009, tradingViewSymbol: "NYSE:BRK.B" },
];

// ─── Indian Stocks (NSE) ─────────────────────────────────────────────────
const IN_STOCKS: SupportedSymbol[] = [
  { symbol: "RELIANCE",   displayName: "Reliance Industries",  assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 3050,  volatility: 0.018, tradingViewSymbol: "NSE:RELIANCE" },
  { symbol: "TCS",        displayName: "Tata Consultancy Services", assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 4250, volatility: 0.014, tradingViewSymbol: "NSE:TCS" },
  { symbol: "INFY",       displayName: "Infosys Ltd.",          assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 1780,  volatility: 0.016, tradingViewSymbol: "NSE:INFY" },
  { symbol: "HDFCBANK",  displayName: "HDFC Bank Ltd.",        assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 1620,  volatility: 0.015, tradingViewSymbol: "NSE:HDFCBANK" },
  { symbol: "ICICIBANK",  displayName: "ICICI Bank Ltd.",      assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 1210,  volatility: 0.014, tradingViewSymbol: "NSE:ICICIBANK" },
  { symbol: "SBIN",       displayName: "State Bank of India",  assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 850,   volatility: 0.019, tradingViewSymbol: "NSE:SBIN" },
  { symbol: "LT",         displayName: "Larsen & Toubro Ltd.", assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 3600,  volatility: 0.017, tradingViewSymbol: "NSE:LT" },
  { symbol: "BHARTIARTL", displayName: "Bharti Airtel Ltd.",   assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 1450,  volatility: 0.015, tradingViewSymbol: "NSE:BHARTIARTL" },
  { symbol: "ITC",        displayName: "ITC Limited",          assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 470,   volatility: 0.012, tradingViewSymbol: "NSE:ITC" },
  { symbol: "ADANIENT",   displayName: "Adani Enterprises Ltd.", assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 3150, volatility: 0.035, tradingViewSymbol: "NSE:ADANIENT" },
  { symbol: "ADANIPORTS", displayName: "Adani Ports & SEZ",    assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 1480,  volatility: 0.025, tradingViewSymbol: "NSE:ADANIPORTS" },
  { symbol: "TATAMOTORS", displayName: "Tata Motors Ltd.",      assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 1020,  volatility: 0.022, tradingViewSymbol: "NSE:TATAMOTORS" },
  { symbol: "AXISBANK",   displayName: "Axis Bank Ltd.",        assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 1280,  volatility: 0.017, tradingViewSymbol: "NSE:AXISBANK" },
  { symbol: "KOTAKBANK",  displayName: "Kotak Mahindra Bank",  assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 1780,  volatility: 0.015, tradingViewSymbol: "NSE:KOTAKBANK" },
  { symbol: "SUNPHARMA",  displayName: "Sun Pharmaceutical Ind.", assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 1650, volatility: 0.014, tradingViewSymbol: "NSE:SUNPHARMA" },
  { symbol: "MARUTI",     displayName: "Maruti Suzuki India",  assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 12500, volatility: 0.016, tradingViewSymbol: "NSE:MARUTI" },
  { symbol: "BAJFINANCE", displayName: "Bajaj Finance Ltd.",    assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 6800,  volatility: 0.024, tradingViewSymbol: "NSE:BAJFINANCE" },
  { symbol: "ASIANPAINT", displayName: "Asian Paints Ltd.",    assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 2950,  volatility: 0.015, tradingViewSymbol: "NSE:ASIANPAINT" },
  { symbol: "ULTRACEMCO", displayName: "UltraTech Cement Ltd.", assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 11200, volatility: 0.016, tradingViewSymbol: "NSE:ULTRACEMCO" },
  { symbol: "NESTLEIND",  displayName: "Nestle India Ltd.",    assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 2500,  volatility: 0.011, tradingViewSymbol: "NSE:NESTLEIND" },
];

// ─── UAE Stocks (DFM / ADX) ──────────────────────────────────────────────
const AE_STOCKS: SupportedSymbol[] = [
  { symbol: "EMAAR",       displayName: "Emaar Properties",     assetClass: "STOCK", region: "AE", providers: ["twelvedata"], exchange: "DFM", baselinePrice: 8.4,  volatility: 0.018, tradingViewSymbol: "DFM:EMAAR" },
  { symbol: "DIB",         displayName: "Dubai Islamic Bank",   assetClass: "STOCK", region: "AE", providers: ["twelvedata"], exchange: "DFM", baselinePrice: 5.8,  volatility: 0.014, tradingViewSymbol: "DFM:DIB" },
  { symbol: "EMIRATESNBD", displayName: "Emirates NBD",         assetClass: "STOCK", region: "AE", providers: ["twelvedata"], exchange: "DFM", baselinePrice: 17.5, volatility: 0.015, tradingViewSymbol: "DFM:EMIRATESNBD" },
  { symbol: "SALIK",       displayName: "Salik Company",        assetClass: "STOCK", region: "AE", providers: ["twelvedata"], exchange: "DFM", baselinePrice: 3.6,  volatility: 0.016, tradingViewSymbol: "DFM:SALIK" },
  { symbol: "DEWA",        displayName: "Dubai Elec & Water (DEWA)", assetClass: "STOCK", region: "AE", providers: ["twelvedata"], exchange: "DFM", baselinePrice: 2.4, volatility: 0.012, tradingViewSymbol: "DFM:DEWA" },
  { symbol: "ADNOCGAS",    displayName: "ADNOC Gas",             assetClass: "STOCK", region: "AE", providers: ["twelvedata"], exchange: "ADX", baselinePrice: 3.1,  volatility: 0.015, tradingViewSymbol: "ADX:ADNOCGAS" },
  { symbol: "ADNOCDIST",   displayName: "ADNOC Distribution",   assetClass: "STOCK", region: "AE", providers: ["twelvedata"], exchange: "ADX", baselinePrice: 3.7,  volatility: 0.013, tradingViewSymbol: "ADX:ADNOCDIST" },
  { symbol: "ALDAR",       displayName: "Aldar Properties",      assetClass: "STOCK", region: "AE", providers: ["twelvedata"], exchange: "ADX", baselinePrice: 6.9,  volatility: 0.019, tradingViewSymbol: "ADX:ALDAR" },
  { symbol: "MULTIPLY",    displayName: "Multiply Group",      assetClass: "STOCK", region: "AE", providers: ["twelvedata"], exchange: "ADX", baselinePrice: 2.2,  volatility: 0.025, tradingViewSymbol: "ADX:MULTIPLY" },
  { symbol: "BOROUGE",     displayName: "Borouge plc",          assetClass: "STOCK", region: "AE", providers: ["twelvedata"], exchange: "ADX", baselinePrice: 2.5,  volatility: 0.014, tradingViewSymbol: "ADX:BOROUGE" },
  { symbol: "FAB",         displayName: "First Abu Dhabi Bank", assetClass: "STOCK", region: "AE", providers: ["twelvedata"], exchange: "ADX", baselinePrice: 13.2, volatility: 0.014, tradingViewSymbol: "ADX:FAB" },
  { symbol: "AIRARABIA",   displayName: "Air Arabia",          assetClass: "STOCK", region: "AE", providers: ["twelvedata"], exchange: "DFM", baselinePrice: 2.6,  volatility: 0.017, tradingViewSymbol: "DFM:AIRARABIA" },
  { symbol: "ARAMEX",      displayName: "Aramex PJSC",          assetClass: "STOCK", region: "AE", providers: ["twelvedata"], exchange: "DFM", baselinePrice: 2.3,  volatility: 0.02,  tradingViewSymbol: "DFM:ARAMEX" },
];

// ─── UK Stocks (LSE) ─────────────────────────────────────────────────────
const UK_STOCKS: SupportedSymbol[] = [
  { symbol: "HSBA.L",  displayName: "HSBC Holdings plc",   assetClass: "STOCK", region: "UK", providers: ["twelvedata"], twelvedataSymbol: "HSBA",  exchange: "LSE", baselinePrice: 680,  volatility: 0.013, tradingViewSymbol: "LSE:HSBA" },
  { symbol: "SHEL.L",  displayName: "Shell plc",          assetClass: "STOCK", region: "UK", providers: ["twelvedata"], twelvedataSymbol: "SHEL",  exchange: "LSE", baselinePrice: 2850, volatility: 0.014, tradingViewSymbol: "LSE:SHEL" },
  { symbol: "BP.L",    displayName: "BP plc",             assetClass: "STOCK", region: "UK", providers: ["twelvedata"], twelvedataSymbol: "BP",    exchange: "LSE", baselinePrice: 475,  volatility: 0.015, tradingViewSymbol: "LSE:BP" },
  { symbol: "AZN.L",   displayName: "AstraZeneca plc",   assetClass: "STOCK", region: "UK", providers: ["twelvedata"], twelvedataSymbol: "AZN",   exchange: "LSE", baselinePrice: 12400, volatility: 0.015, tradingViewSymbol: "LSE:AZN" },
  { symbol: "ULVR.L",  displayName: "Unilever plc",       assetClass: "STOCK", region: "UK", providers: ["twelvedata"], twelvedataSymbol: "ULVR",  exchange: "LSE", baselinePrice: 4400, volatility: 0.011, tradingViewSymbol: "LSE:ULVR" },
  { symbol: "RIO.L",   displayName: "Rio Tinto plc",     assetClass: "STOCK", region: "UK", providers: ["twelvedata"], twelvedataSymbol: "RIO",   exchange: "LSE", baselinePrice: 5200, volatility: 0.021, tradingViewSymbol: "LSE:RIO" },
  { symbol: "GSK.L",   displayName: "GSK plc",           assetClass: "STOCK", region: "UK", providers: ["twelvedata"], twelvedataSymbol: "GSK",   exchange: "LSE", baselinePrice: 1550, volatility: 0.014, tradingViewSymbol: "LSE:GSK" },
  { symbol: "BARC.L",  displayName: "Barclays plc",      assetClass: "STOCK", region: "UK", providers: ["twelvedata"], twelvedataSymbol: "BARC",  exchange: "LSE", baselinePrice: 220,  volatility: 0.02,  tradingViewSymbol: "LSE:BARC" },
  { symbol: "DGE.L",   displayName: "Diageo plc",         assetClass: "STOCK", region: "UK", providers: ["twelvedata"], twelvedataSymbol: "DGE",   exchange: "LSE", baselinePrice: 2550, volatility: 0.013, tradingViewSymbol: "LSE:DGE" },
  { symbol: "BATS.L",  displayName: "British American Tobacco", assetClass: "STOCK", region: "UK", providers: ["twelvedata"], twelvedataSymbol: "BATS", exchange: "LSE", baselinePrice: 2480, volatility: 0.012, tradingViewSymbol: "LSE:BATS" },
];

// ─── Japanese Stocks (TSE) ───────────────────────────────────────────────
const JP_STOCKS: SupportedSymbol[] = [
  { symbol: "7203", displayName: "Toyota Motor Corp.",        assetClass: "STOCK", region: "JP", providers: ["twelvedata"], exchange: "TSE", baselinePrice: 3200,  volatility: 0.015, tradingViewSymbol: "TSE:7203" },
  { symbol: "6758", displayName: "Sony Group Corp.",          assetClass: "STOCK", region: "JP", providers: ["twelvedata"], exchange: "TSE", baselinePrice: 13500, volatility: 0.017, tradingViewSymbol: "TSE:6758" },
  { symbol: "6861", displayName: "Keyence Corp.",             assetClass: "STOCK", region: "JP", providers: ["twelvedata"], exchange: "TSE", baselinePrice: 68000, volatility: 0.018, tradingViewSymbol: "TSE:6861" },
  { symbol: "9983", displayName: "Fast Retailing Co.",        assetClass: "STOCK", region: "JP", providers: ["twelvedata"], exchange: "TSE", baselinePrice: 42000, volatility: 0.02,  tradingViewSymbol: "TSE:9983" },
  { symbol: "9984", displayName: "SoftBank Group Corp.",      assetClass: "STOCK", region: "JP", providers: ["twelvedata"], exchange: "TSE", baselinePrice: 9500,  volatility: 0.025, tradingViewSymbol: "TSE:9984" },
  { symbol: "8035", displayName: "Tokyo Electron Ltd.",      assetClass: "STOCK", region: "JP", providers: ["twelvedata"], exchange: "TSE", baselinePrice: 31000, volatility: 0.026, tradingViewSymbol: "TSE:8035" },
  { symbol: "8306", displayName: "Mitsubishi UFJ Financial", assetClass: "STOCK", region: "JP", providers: ["twelvedata"], exchange: "TSE", baselinePrice: 1600,  volatility: 0.016, tradingViewSymbol: "TSE:8306" },
  { symbol: "7267", displayName: "Honda Motor Co.",          assetClass: "STOCK", region: "JP", providers: ["twelvedata"], exchange: "TSE", baselinePrice: 1650,  volatility: 0.016, tradingViewSymbol: "TSE:7267" },
  { symbol: "7974", displayName: "Nintendo Co. Ltd.",        assetClass: "STOCK", region: "JP", providers: ["twelvedata"], exchange: "TSE", baselinePrice: 8100,  volatility: 0.017, tradingViewSymbol: "TSE:7974" },
  { symbol: "6501", displayName: "Hitachi Ltd.",             assetClass: "STOCK", region: "JP", providers: ["twelvedata"], exchange: "TSE", baselinePrice: 3400,  volatility: 0.018, tradingViewSymbol: "TSE:6501" },
];

// ─── European Stocks (XETR / Euronext) ───────────────────────────────────
const EU_STOCKS: SupportedSymbol[] = [
  { symbol: "ASML", displayName: "ASML Holding NV",     assetClass: "STOCK", region: "EU", providers: ["twelvedata"], exchange: "Euronext", baselinePrice: 950,  volatility: 0.022, tradingViewSymbol: "Euronext:ASML" },
  { symbol: "SAP",  displayName: "SAP SE",              assetClass: "STOCK", region: "EU", providers: ["twelvedata"], exchange: "XETR",     baselinePrice: 185,  volatility: 0.014, tradingViewSymbol: "XETR:SAP" },
  { symbol: "MC",   displayName: "LVMH Moët Hennessy",  assetClass: "STOCK", region: "EU", providers: ["twelvedata"], exchange: "Euronext", baselinePrice: 720,  volatility: 0.018, tradingViewSymbol: "Euronext:MC" },
  { symbol: "TTE",  displayName: "TotalEnergies SE",    assetClass: "STOCK", region: "EU", providers: ["twelvedata"], exchange: "Euronext", baselinePrice: 62,   volatility: 0.016, tradingViewSymbol: "Euronext:TTE" },
  { symbol: "SAN",  displayName: "Sanofi SA",           assetClass: "STOCK", region: "EU", providers: ["twelvedata"], exchange: "Euronext", baselinePrice: 92,   volatility: 0.012, tradingViewSymbol: "Euronext:SAN" },
  { symbol: "SIE",  displayName: "Siemens AG",          assetClass: "STOCK", region: "EU", providers: ["twelvedata"], exchange: "XETR",     baselinePrice: 172,  volatility: 0.015, tradingViewSymbol: "XETR:SIE" },
  { symbol: "ALV",  displayName: "Allianz SE",           assetClass: "STOCK", region: "EU", providers: ["twelvedata"], exchange: "XETR",     baselinePrice: 265,  volatility: 0.013, tradingViewSymbol: "XETR:ALV" },
  { symbol: "SU",   displayName: "Schneider Electric SE", assetClass: "STOCK", region: "EU", providers: ["twelvedata"], exchange: "Euronext", baselinePrice: 225, volatility: 0.016, tradingViewSymbol: "Euronext:SU" },
  { symbol: "AI",   displayName: "Air Liquide SA",       assetClass: "STOCK", region: "EU", providers: ["twelvedata"], exchange: "Euronext", baselinePrice: 165,  volatility: 0.012, tradingViewSymbol: "Euronext:AI" },
  { symbol: "AIR",  displayName: "Airbus SE",            assetClass: "STOCK", region: "EU", providers: ["twelvedata"], exchange: "Euronext", baselinePrice: 135,  volatility: 0.018, tradingViewSymbol: "Euronext:AIR" },
];

export const SUPPORTED_SYMBOLS: SupportedSymbol[] = [
  ...CRYPTO,
  ...FOREX,
  ...COMMODITY,
  ...INDEX,
  ...US_STOCKS,
  ...IN_STOCKS,
  ...AE_STOCKS,
  ...UK_STOCKS,
  ...JP_STOCKS,
  ...EU_STOCKS,
];

export const SUPPORTED_SYMBOL_MAP: Record<string, SupportedSymbol> = Object.fromEntries(
  SUPPORTED_SYMBOLS.map((s) => [s.symbol, s])
);

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

// ─── Basic lookups ───────────────────────────────────────────────────────────
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

/** Symbols to send to Twelve Data. */
export function twelvedataSymbolFor(symbol: string): string {
  return SUPPORTED_SYMBOL_MAP[symbol]?.twelvedataSymbol ?? symbol;
}

/** Exchange param to append to Twelve Data requests for non-US listings. */
export function twelvedataExchangeFor(symbol: string): string | undefined {
  return SUPPORTED_SYMBOL_MAP[symbol]?.exchange;
}

export function providersFor(symbol: string): Provider[] {
  return SUPPORTED_SYMBOL_MAP[symbol]?.providers ?? [];
}

export function binanceSymbolFor(symbol: string): string {
  const entry = SUPPORTED_SYMBOL_MAP[symbol];
  if (entry?.binanceSymbol) return entry.binanceSymbol;
  return symbol.replace("/USD", "USDT");
}

export function coinbaseSymbolFor(symbol: string): string {
  const entry = SUPPORTED_SYMBOL_MAP[symbol];
  if (entry?.coinbaseSymbol) return entry.coinbaseSymbol;
  return symbol.replace("/", "-");
}

// ─── Provider-dimension accessors (root-cause fix) ──────────────────────────
// Each replaces a hardcoded if/switch/Record that previously lived in the
// consuming file. All derive from the registry entry, so adding a symbol to
// the registry automatically wires every dimension.

/**
 * Exact TradingView feed string for a canonical symbol. Replaces the previous
 * nested if-chain over assetClass/region/symbol. Unknown symbols get a best-
 * effort pair/stock fallback so the chart still renders something coherent.
 */
export function getTradingViewSymbol(symbol: string): string {
  const entry = getSupportedSymbol(symbol);
  if (entry) return entry.tradingViewSymbol;
  if (symbol.includes("/")) return `FX:${symbol.replace("/", "")}`;
  return `NASDAQ:${symbol}`;
}

/** Binance WebSocket stream name, or null if the symbol is not streamable. */
export function binanceStreamFor(symbol: string): string | null {
  return SUPPORTED_SYMBOL_MAP[symbol]?.binanceStream ?? null;
}

/** Reverse lookup: canonical symbol for a Binance stream name (for WS frames). */
export function symbolForBinanceStream(streamName: string): string | null {
  const entry = SUPPORTED_SYMBOLS.find((s) => s.binanceStream === streamName);
  return entry?.symbol ?? null;
}

/** Finnhub news categories for a symbol (replaces getFinnhubCategoriesForSymbol). */
export function newsCategoryFor(symbol: string | undefined): string[] {
  if (!symbol) return ["general", "forex", "crypto"];
  const cat = SUPPORTED_SYMBOL_MAP[symbol]?.newsCategory;
  return cat ? [cat] : ["general"];
}

/** NewsAPI `q=` query for a symbol (replaces getNewsAPIQueryForSymbol). */
export function newsQueryFor(symbol: string | undefined): string {
  if (!symbol) return "financial markets OR stock market OR crypto OR forex";
  return SUPPORTED_SYMBOL_MAP[symbol]?.newsQuery ?? symbol;
}

// Pre-compiled keyword → symbol index for news affected-asset detection.
// Replaces the hardcoded regex chain in news.determineAffectedAssets. Only
// symbols carrying `newsKeywords` participate, so the common case (equities
// with no news keyword set) is a cheap empty loop. Keywords are matched with
// word boundaries (same semantics as the prior per-asset regexes) so that e.g.
// "sol" does not match inside "consolidation".
const NEWS_KEYWORD_ENTRIES: ReadonlyArray<{ symbol: string; pattern: RegExp }> = SUPPORTED_SYMBOLS
  .filter((s) => s.newsKeywords && s.newsKeywords.length > 0)
  .map((s) => ({
    symbol: s.symbol,
    pattern: new RegExp(`\\b(${(s.newsKeywords as string[]).map(escapeRegex).join("|")})\\b`, "i"),
  }));

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Map a headline/summary to the canonical symbols it concerns. Data-driven via
 * the registry's `newsKeywords`; replaces the hardcoded per-asset regex chain.
 */
export function determineAffectedAssets(title: string, summary: string): string[] {
  const text = `${title} ${summary}`;
  const assets: string[] = [];
  for (const { symbol, pattern } of NEWS_KEYWORD_ENTRIES) {
    if (pattern.test(text)) assets.push(symbol);
  }
  return assets;
}

const DEFAULT_RISK_SPEC: RiskSpec = {
  contractSize: 1,
  pipSize: 1,
  minTradable: 0.001,
  isJpyQuote: false,
};

/**
 * Risk-engine instrument spec for a symbol (replaces INSTRUMENT_SPECS + the
 * CRYPTO-fallback `getSpec`). Unknown symbols get a typed CRYPTO default
 * rather than silently misclassifying.
 */
export function riskSpecFor(symbol: string): RiskSpec {
  return SUPPORTED_SYMBOL_MAP[symbol]?.riskSpec ?? DEFAULT_RISK_SPEC;
}

/** Symbols that carry a risk spec — the universe the risk calculator offers. */
export const RISK_SYMBOLS: SupportedSymbol[] = SUPPORTED_SYMBOLS.filter((s) => s.riskSpec);

/** Exchange label for AI analysis prompts (replaces getExchangeForSymbol). */
export function aiExchangeLabelFor(symbol: string): string {
  const entry = getSupportedSymbol(symbol);
  if (entry?.aiExchangeLabel) return entry.aiExchangeLabel;
  if (entry?.exchange) return entry.exchange;
  if (entry?.assetClass === "CRYPTO") return "BINANCE";
  if (entry?.assetClass === "FOREX") return "FX";
  if (entry?.assetClass === "COMMODITY") return "OANDA";
  return "BINANCE";
}

// ─── Market selection ────────────────────────────────────────────────────────
/**
 * Filter supported symbols for a market. Replaces the hand-written
 * `switch (market)` that mapped MarketRegion ↔ Region inline; now driven by
 * the `marketFilter` predicate on each MarketConfig.
 */
export function getSymbolsForMarket(market: MarketRegion): SupportedSymbol[] {
  const cfg = MARKETS[market];
  if (!cfg?.marketFilter) return SUPPORTED_SYMBOLS.filter((s) => s.region === "US");
  const f = cfg.marketFilter;
  if ("region" in f) return SUPPORTED_SYMBOLS.filter((s) => s.region === f.region);
  return SUPPORTED_SYMBOLS.filter((s) => s.assetClass === f.assetClass);
}

/** The Region a market covers, or null for asset-class-scoped markets (FOREX/CRYPTO). */
export function regionForMarket(market: MarketRegion): Region | null {
  const f = MARKETS[market]?.marketFilter;
  return f && "region" in f ? f.region : null;
}

export function getSymbolGroups(): Array<{ label: string; assetClass: AssetClass; symbols: SupportedSymbol[] }> {
  return [
    { label: "Crypto", assetClass: "CRYPTO", symbols: CRYPTO },
    { label: "Forex", assetClass: "FOREX", symbols: FOREX },
    { label: "US Stocks & Indices", assetClass: "STOCK", symbols: [...INDEX.filter((s) => s.region === "US"), ...US_STOCKS] },
    { label: "Indian Equities (NSE)", assetClass: "STOCK", symbols: IN_STOCKS },
    { label: "UAE Equities (DFM/ADX)", assetClass: "STOCK", symbols: AE_STOCKS },
    { label: "UK Equities (LSE)", assetClass: "STOCK", symbols: UK_STOCKS },
    { label: "Japanese Equities (TSE)", assetClass: "STOCK", symbols: JP_STOCKS },
    { label: "European Equities", assetClass: "STOCK", symbols: EU_STOCKS },
  ];
}

export function getSymbolGroupsForMarket(market: MarketRegion): Array<{ label: string; assetClass: AssetClass; symbols: SupportedSymbol[] }> {
  const symbols = getSymbolsForMarket(market);
  return [
    {
      label: MARKETS[market]?.label || market,
      assetClass: (symbols[0]?.assetClass || "STOCK") as AssetClass,
      symbols,
    },
  ];
}

export function getDefaultSymbolForMarket(market: MarketRegion): string {
  return MARKETS[market]?.defaultSymbol ?? "AAPL";
}

/**
 * All supported symbols for a given asset class. Lets asset-class-scoped UIs
 * (risk calculator, backtester, alerts) derive their dropdown lists from the
 * registry instead of hardcoding `["BTC/USD","ETH/USD",...]` per page.
 */
export function getSymbolsForAssetClass(assetClass: AssetClass): SupportedSymbol[] {
  return SUPPORTED_SYMBOLS.filter((s) => s.assetClass === assetClass);
}

/**
 * The first symbol registered for an asset class — a deterministic default
 * for asset-class-scoped forms that have no market context. Replaces the
 * per-page `DEFAULT_SYMBOL: Record<AssetClass, string>` maps.
 */
export function getDefaultSymbolForAssetClass(assetClass: AssetClass): string {
  return getSymbolsForAssetClass(assetClass)[0]?.symbol ?? getDefaultSymbolForMarket("CRYPTO");
}

/** Symbol strings for an asset class — convenience for dropdown `map`. */
export function getSymbolStringsForAssetClass(assetClass: AssetClass): string[] {
  return getSymbolsForAssetClass(assetClass).map((s) => s.symbol);
}

/**
 * The curated "popular" instruments (those flagged `popular: true` on their
 * registry entry). Used by quick-select dropdowns — alerts, backtester, news
 * filter, alert evaluator — so the curated set lives in config, not in N UIs.
 */
export function getPopularSymbols(): SupportedSymbol[] {
  return SUPPORTED_SYMBOLS.filter((s) => s.popular);
}

/** Popular instrument symbol strings — convenience for dropdown `map`. */
export function getPopularSymbolStrings(): string[] {
  return getPopularSymbols().map((s) => s.symbol);
}