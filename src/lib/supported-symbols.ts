/**
 * src/lib/supported-symbols.ts
 *
 * Single source of truth for the tradable instrument universe across TradCopilot.
 * Enforces strict per-market instrument scoping for US, India, UAE, UK, Japan,
 * Europe, Forex, and Crypto markets.
 */

export type AssetClass = "CRYPTO" | "FOREX" | "COMMODITY" | "INDEX" | "STOCK";
export type Region = "GLOBAL" | "US" | "IN" | "JP" | "AE" | "UK" | "EU";
export type MarketRegion = "INDIA" | "US" | "UAE" | "UK" | "JAPAN" | "EUROPE" | "FOREX" | "CRYPTO";
export type Provider = "twelvedata" | "binance" | "coinbase";

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
}

export interface MarketConfig {
  key: MarketRegion;
  label: string;
  flag: string;
  countryName: string;
  defaultSymbol: string;
}

export const MARKETS: Record<MarketRegion, MarketConfig> = {
  INDIA: { key: "INDIA", label: "India (NSE/BSE)", flag: "🇮🇳", countryName: "India", defaultSymbol: "RELIANCE" },
  US: { key: "US", label: "United States (NYSE/NASDAQ)", flag: "🇺🇸", countryName: "United States", defaultSymbol: "AAPL" },
  UAE: { key: "UAE", label: "United Arab Emirates (DFM/ADX)", flag: "🇦🇪", countryName: "United Arab Emirates", defaultSymbol: "EMAAR" },
  UK: { key: "UK", label: "United Kingdom (LSE)", flag: "🇬🇧", countryName: "United Kingdom", defaultSymbol: "HSBA.L" },
  JAPAN: { key: "JAPAN", label: "Japan (TSE)", flag: "🇯🇵", countryName: "Japan", defaultSymbol: "7203" },
  EUROPE: { key: "EUROPE", label: "Europe (DAX/Euronext)", flag: "🇪🇺", countryName: "Europe", defaultSymbol: "SAP" },
  FOREX: { key: "FOREX", label: "Forex Currency Pairs", flag: "🌍", countryName: "Global Forex", defaultSymbol: "EUR/USD" },
  CRYPTO: { key: "CRYPTO", label: "Cryptocurrency", flag: "₿", countryName: "Global Crypto", defaultSymbol: "BTC/USD" },
};

// ─── Crypto ──────────────────────────────────────────────────────────────
const CRYPTO: SupportedSymbol[] = [
  { symbol: "BTC/USD", displayName: "Bitcoin", assetClass: "CRYPTO", region: "GLOBAL", providers: ["binance", "coinbase"], baselinePrice: 68250, volatility: 0.02 },
  { symbol: "ETH/USD", displayName: "Ethereum", assetClass: "CRYPTO", region: "GLOBAL", providers: ["binance", "coinbase"], baselinePrice: 3480, volatility: 0.03 },
  { symbol: "SOL/USD", displayName: "Solana", assetClass: "CRYPTO", region: "GLOBAL", providers: ["binance", "coinbase"], baselinePrice: 142.5, volatility: 0.05 },
  { symbol: "BNB/USD", displayName: "BNB", assetClass: "CRYPTO", region: "GLOBAL", providers: ["binance"], baselinePrice: 580, volatility: 0.03 },
  { symbol: "XRP/USD", displayName: "XRP", assetClass: "CRYPTO", region: "GLOBAL", providers: ["binance", "coinbase"], baselinePrice: 0.55, volatility: 0.04 },
  { symbol: "ADA/USD", displayName: "Cardano", assetClass: "CRYPTO", region: "GLOBAL", providers: ["binance", "coinbase"], baselinePrice: 0.38, volatility: 0.045 },
  { symbol: "DOGE/USD", displayName: "Dogecoin", assetClass: "CRYPTO", region: "GLOBAL", providers: ["binance", "coinbase"], baselinePrice: 0.12, volatility: 0.06 },
  { symbol: "AVAX/USD", displayName: "Avalanche", assetClass: "CRYPTO", region: "GLOBAL", providers: ["binance", "coinbase"], baselinePrice: 28, volatility: 0.05 },
  { symbol: "DOT/USD", displayName: "Polkadot", assetClass: "CRYPTO", region: "GLOBAL", providers: ["binance"], baselinePrice: 6.5, volatility: 0.045 },
  { symbol: "LINK/USD", displayName: "Chainlink", assetClass: "CRYPTO", region: "GLOBAL", providers: ["binance", "coinbase"], baselinePrice: 14, volatility: 0.04 },
];

// ─── Forex ────────────────────────────────────────────────────────────────
const FOREX: SupportedSymbol[] = [
  { symbol: "EUR/USD", displayName: "Euro / US Dollar", assetClass: "FOREX", region: "GLOBAL", providers: ["twelvedata", "binance"], baselinePrice: 1.085, volatility: 0.003 },
  { symbol: "GBP/USD", displayName: "British Pound / US Dollar", assetClass: "FOREX", region: "GLOBAL", providers: ["twelvedata", "binance"], baselinePrice: 1.28, volatility: 0.004 },
  { symbol: "USD/JPY", displayName: "US Dollar / Japanese Yen", assetClass: "FOREX", region: "GLOBAL", providers: ["twelvedata"], baselinePrice: 155.0, volatility: 0.005 },
  { symbol: "AUD/USD", displayName: "Australian Dollar / US Dollar", assetClass: "FOREX", region: "GLOBAL", providers: ["twelvedata"], baselinePrice: 0.66, volatility: 0.004 },
  { symbol: "USD/CAD", displayName: "US Dollar / Canadian Dollar", assetClass: "FOREX", region: "GLOBAL", providers: ["twelvedata"], baselinePrice: 1.36, volatility: 0.0035 },
  { symbol: "USD/CHF", displayName: "US Dollar / Swiss Franc", assetClass: "FOREX", region: "GLOBAL", providers: ["twelvedata"], baselinePrice: 0.89, volatility: 0.004 },
  { symbol: "NZD/USD", displayName: "New Zealand Dollar / US Dollar", assetClass: "FOREX", region: "GLOBAL", providers: ["twelvedata"], baselinePrice: 0.61, volatility: 0.0045 },
  { symbol: "EUR/GBP", displayName: "Euro / British Pound", assetClass: "FOREX", region: "GLOBAL", providers: ["twelvedata"], baselinePrice: 0.84, volatility: 0.003 },
  { symbol: "EUR/JPY", displayName: "Euro / Japanese Yen", assetClass: "FOREX", region: "GLOBAL", providers: ["twelvedata"], baselinePrice: 168.0, volatility: 0.005 },
  { symbol: "GBP/JPY", displayName: "British Pound / Japanese Yen", assetClass: "FOREX", region: "GLOBAL", providers: ["twelvedata"], baselinePrice: 198.0, volatility: 0.006 },
];

// ─── Commodities ──────────────────────────────────────────────────────────
const COMMODITY: SupportedSymbol[] = [
  { symbol: "XAU/USD", displayName: "Gold / US Dollar", assetClass: "COMMODITY", region: "GLOBAL", providers: ["twelvedata"], twelvedataSymbol: "XAU/USD", baselinePrice: 2380, volatility: 0.01 },
];

// ─── Indices ─────────────────────────────────────────────────────────────
const INDEX: SupportedSymbol[] = [
  { symbol: "NASDAQ", displayName: "Nasdaq 100", assetClass: "INDEX", region: "US", providers: ["twelvedata"], twelvedataSymbol: "NDX", baselinePrice: 19800, volatility: 0.012 },
  { symbol: "S&P500", displayName: "S&P 500", assetClass: "INDEX", region: "US", providers: ["twelvedata"], twelvedataSymbol: "SPX", baselinePrice: 5450, volatility: 0.008 },
  { symbol: "DJI", displayName: "Dow Jones Industrial Avg", assetClass: "INDEX", region: "US", providers: ["twelvedata"], twelvedataSymbol: "DJI", baselinePrice: 40200, volatility: 0.01 },
  { symbol: "NIFTY50", displayName: "NIFTY 50 (India)", assetClass: "INDEX", region: "IN", providers: ["twelvedata"], twelvedataSymbol: "NIFTY", exchange: "NSE", baselinePrice: 24500, volatility: 0.01 },
  { symbol: "SENSEX", displayName: "SENSEX (India)", assetClass: "INDEX", region: "IN", providers: ["twelvedata"], twelvedataSymbol: "SENSEX", exchange: "BSE", baselinePrice: 80500, volatility: 0.009 },
  { symbol: "NIKKEI", displayName: "Nikkei 225 (Japan)", assetClass: "INDEX", region: "JP", providers: ["twelvedata"], twelvedataSymbol: "NI225", exchange: "TSE", baselinePrice: 38500, volatility: 0.011 },
  { symbol: "FTSE100", displayName: "FTSE 100 (UK)", assetClass: "INDEX", region: "UK", providers: ["twelvedata"], twelvedataSymbol: "FTSE", exchange: "LSE", baselinePrice: 8200, volatility: 0.009 },
  { symbol: "DAX", displayName: "DAX 40 (Germany)", assetClass: "INDEX", region: "EU", providers: ["twelvedata"], twelvedataSymbol: "DAX", exchange: "XETR", baselinePrice: 18500, volatility: 0.01 },
];

// ─── US Stocks ────────────────────────────────────────────────────────────
const US_STOCKS: SupportedSymbol[] = [
  { symbol: "AAPL", displayName: "Apple Inc.", assetClass: "STOCK", region: "US", providers: ["twelvedata"], exchange: "NASDAQ", baselinePrice: 220, volatility: 0.015 },
  { symbol: "MSFT", displayName: "Microsoft Corp.", assetClass: "STOCK", region: "US", providers: ["twelvedata"], exchange: "NASDAQ", baselinePrice: 445, volatility: 0.013 },
  { symbol: "NVDA", displayName: "NVIDIA Corp.", assetClass: "STOCK", region: "US", providers: ["twelvedata"], exchange: "NASDAQ", baselinePrice: 125, volatility: 0.03 },
  { symbol: "AMZN", displayName: "Amazon.com Inc.", assetClass: "STOCK", region: "US", providers: ["twelvedata"], exchange: "NASDAQ", baselinePrice: 185, volatility: 0.018 },
  { symbol: "TSLA", displayName: "Tesla Inc.", assetClass: "STOCK", region: "US", providers: ["twelvedata"], exchange: "NASDAQ", baselinePrice: 245, volatility: 0.028 },
  { symbol: "GOOGL", displayName: "Alphabet Inc.", assetClass: "STOCK", region: "US", providers: ["twelvedata"], exchange: "NASDAQ", baselinePrice: 175, volatility: 0.017 },
  { symbol: "META", displayName: "Meta Platforms Inc.", assetClass: "STOCK", region: "US", providers: ["twelvedata"], exchange: "NASDAQ", baselinePrice: 485, volatility: 0.022 },
  { symbol: "AMD", displayName: "Advanced Micro Devices", assetClass: "STOCK", region: "US", providers: ["twelvedata"], exchange: "NASDAQ", baselinePrice: 155, volatility: 0.026 },
  { symbol: "NFLX", displayName: "Netflix Inc.", assetClass: "STOCK", region: "US", providers: ["twelvedata"], exchange: "NASDAQ", baselinePrice: 640, volatility: 0.02 },
  { symbol: "AVGO", displayName: "Broadcom Inc.", assetClass: "STOCK", region: "US", providers: ["twelvedata"], exchange: "NASDAQ", baselinePrice: 160, volatility: 0.024 },
  { symbol: "V", displayName: "Visa Inc.", assetClass: "STOCK", region: "US", providers: ["twelvedata"], exchange: "NYSE", baselinePrice: 270, volatility: 0.011 },
  { symbol: "MA", displayName: "Mastercard Inc.", assetClass: "STOCK", region: "US", providers: ["twelvedata"], exchange: "NYSE", baselinePrice: 440, volatility: 0.012 },
  { symbol: "PLTR", displayName: "Palantir Technologies", assetClass: "STOCK", region: "US", providers: ["twelvedata"], exchange: "NYSE", baselinePrice: 28, volatility: 0.035 },
  { symbol: "ORCL", displayName: "Oracle Corp.", assetClass: "STOCK", region: "US", providers: ["twelvedata"], exchange: "NYSE", baselinePrice: 140, volatility: 0.018 },
  { symbol: "INTC", displayName: "Intel Corp.", assetClass: "STOCK", region: "US", providers: ["twelvedata"], exchange: "NASDAQ", baselinePrice: 32, volatility: 0.025 },
  { symbol: "KO", displayName: "The Coca-Cola Company", assetClass: "STOCK", region: "US", providers: ["twelvedata"], exchange: "NYSE", baselinePrice: 65, volatility: 0.008 },
  { symbol: "MCD", displayName: "McDonald's Corp.", assetClass: "STOCK", region: "US", providers: ["twelvedata"], exchange: "NYSE", baselinePrice: 255, volatility: 0.009 },
  { symbol: "JPM", displayName: "JPMorgan Chase & Co.", assetClass: "STOCK", region: "US", providers: ["twelvedata"], exchange: "NYSE", baselinePrice: 205, volatility: 0.013 },
  { symbol: "BRK.B", displayName: "Berkshire Hathaway Inc.", assetClass: "STOCK", region: "US", providers: ["twelvedata"], exchange: "NYSE", baselinePrice: 415, volatility: 0.009 },
];

// ─── Indian Stocks (NSE) ─────────────────────────────────────────────────
const IN_STOCKS: SupportedSymbol[] = [
  { symbol: "RELIANCE", displayName: "Reliance Industries", assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 3050, volatility: 0.018 },
  { symbol: "TCS", displayName: "Tata Consultancy Services", assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 4250, volatility: 0.014 },
  { symbol: "INFY", displayName: "Infosys Ltd.", assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 1780, volatility: 0.016 },
  { symbol: "HDFCBANK", displayName: "HDFC Bank Ltd.", assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 1620, volatility: 0.015 },
  { symbol: "ICICIBANK", displayName: "ICICI Bank Ltd.", assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 1210, volatility: 0.014 },
  { symbol: "SBIN", displayName: "State Bank of India", assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 850, volatility: 0.019 },
  { symbol: "LT", displayName: "Larsen & Toubro Ltd.", assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 3600, volatility: 0.017 },
  { symbol: "BHARTIARTL", displayName: "Bharti Airtel Ltd.", assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 1450, volatility: 0.015 },
  { symbol: "ITC", displayName: "ITC Limited", assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 470, volatility: 0.012 },
  { symbol: "ADANIENT", displayName: "Adani Enterprises Ltd.", assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 3150, volatility: 0.035 },
  { symbol: "ADANIPORTS", displayName: "Adani Ports & SEZ", assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 1480, volatility: 0.025 },
  { symbol: "TATAMOTORS", displayName: "Tata Motors Ltd.", assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 1020, volatility: 0.022 },
  { symbol: "AXISBANK", displayName: "Axis Bank Ltd.", assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 1280, volatility: 0.017 },
  { symbol: "KOTAKBANK", displayName: "Kotak Mahindra Bank", assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 1780, volatility: 0.015 },
  { symbol: "SUNPHARMA", displayName: "Sun Pharmaceutical Ind.", assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 1650, volatility: 0.014 },
  { symbol: "MARUTI", displayName: "Maruti Suzuki India", assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 12500, volatility: 0.016 },
  { symbol: "BAJFINANCE", displayName: "Bajaj Finance Ltd.", assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 6800, volatility: 0.024 },
  { symbol: "ASIANPAINT", displayName: "Asian Paints Ltd.", assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 2950, volatility: 0.015 },
  { symbol: "ULTRACEMCO", displayName: "UltraTech Cement Ltd.", assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 11200, volatility: 0.016 },
  { symbol: "NESTLEIND", displayName: "Nestle India Ltd.", assetClass: "STOCK", region: "IN", providers: ["twelvedata"], exchange: "NSE", baselinePrice: 2500, volatility: 0.011 },
];

// ─── UAE Stocks (DFM / ADX) ──────────────────────────────────────────────
const AE_STOCKS: SupportedSymbol[] = [
  { symbol: "EMAAR", displayName: "Emaar Properties", assetClass: "STOCK", region: "AE", providers: ["twelvedata"], exchange: "DFM", baselinePrice: 8.4, volatility: 0.018 },
  { symbol: "DIB", displayName: "Dubai Islamic Bank", assetClass: "STOCK", region: "AE", providers: ["twelvedata"], exchange: "DFM", baselinePrice: 5.8, volatility: 0.014 },
  { symbol: "EMIRATESNBD", displayName: "Emirates NBD", assetClass: "STOCK", region: "AE", providers: ["twelvedata"], exchange: "DFM", baselinePrice: 17.5, volatility: 0.015 },
  { symbol: "SALIK", displayName: "Salik Company", assetClass: "STOCK", region: "AE", providers: ["twelvedata"], exchange: "DFM", baselinePrice: 3.6, volatility: 0.016 },
  { symbol: "DEWA", displayName: "Dubai Elec & Water (DEWA)", assetClass: "STOCK", region: "AE", providers: ["twelvedata"], exchange: "DFM", baselinePrice: 2.4, volatility: 0.012 },
  { symbol: "ADNOCGAS", displayName: "ADNOC Gas", assetClass: "STOCK", region: "AE", providers: ["twelvedata"], exchange: "ADX", baselinePrice: 3.1, volatility: 0.015 },
  { symbol: "ADNOCDIST", displayName: "ADNOC Distribution", assetClass: "STOCK", region: "AE", providers: ["twelvedata"], exchange: "ADX", baselinePrice: 3.7, volatility: 0.013 },
  { symbol: "ALDAR", displayName: "Aldar Properties", assetClass: "STOCK", region: "AE", providers: ["twelvedata"], exchange: "ADX", baselinePrice: 6.9, volatility: 0.019 },
  { symbol: "MULTIPLY", displayName: "Multiply Group", assetClass: "STOCK", region: "AE", providers: ["twelvedata"], exchange: "ADX", baselinePrice: 2.2, volatility: 0.025 },
  { symbol: "BOROUGE", displayName: "Borouge plc", assetClass: "STOCK", region: "AE", providers: ["twelvedata"], exchange: "ADX", baselinePrice: 2.5, volatility: 0.014 },
  { symbol: "FAB", displayName: "First Abu Dhabi Bank", assetClass: "STOCK", region: "AE", providers: ["twelvedata"], exchange: "ADX", baselinePrice: 13.2, volatility: 0.014 },
  { symbol: "AIRARABIA", displayName: "Air Arabia", assetClass: "STOCK", region: "AE", providers: ["twelvedata"], exchange: "DFM", baselinePrice: 2.6, volatility: 0.017 },
  { symbol: "ARAMEX", displayName: "Aramex PJSC", assetClass: "STOCK", region: "AE", providers: ["twelvedata"], exchange: "DFM", baselinePrice: 2.3, volatility: 0.02 },
];

// ─── UK Stocks (LSE) ─────────────────────────────────────────────────────
const UK_STOCKS: SupportedSymbol[] = [
  { symbol: "HSBA.L", displayName: "HSBC Holdings plc", assetClass: "STOCK", region: "UK", providers: ["twelvedata"], twelvedataSymbol: "HSBA", exchange: "LSE", baselinePrice: 680, volatility: 0.013 },
  { symbol: "SHEL.L", displayName: "Shell plc", assetClass: "STOCK", region: "UK", providers: ["twelvedata"], twelvedataSymbol: "SHEL", exchange: "LSE", baselinePrice: 2850, volatility: 0.014 },
  { symbol: "BP.L", displayName: "BP plc", assetClass: "STOCK", region: "UK", providers: ["twelvedata"], twelvedataSymbol: "BP", exchange: "LSE", baselinePrice: 475, volatility: 0.015 },
  { symbol: "AZN.L", displayName: "AstraZeneca plc", assetClass: "STOCK", region: "UK", providers: ["twelvedata"], twelvedataSymbol: "AZN", exchange: "LSE", baselinePrice: 12400, volatility: 0.015 },
  { symbol: "ULVR.L", displayName: "Unilever plc", assetClass: "STOCK", region: "UK", providers: ["twelvedata"], twelvedataSymbol: "ULVR", exchange: "LSE", baselinePrice: 4400, volatility: 0.011 },
  { symbol: "RIO.L", displayName: "Rio Tinto plc", assetClass: "STOCK", region: "UK", providers: ["twelvedata"], twelvedataSymbol: "RIO", exchange: "LSE", baselinePrice: 5200, volatility: 0.021 },
  { symbol: "GSK.L", displayName: "GSK plc", assetClass: "STOCK", region: "UK", providers: ["twelvedata"], twelvedataSymbol: "GSK", exchange: "LSE", baselinePrice: 1550, volatility: 0.014 },
  { symbol: "BARC.L", displayName: "Barclays plc", assetClass: "STOCK", region: "UK", providers: ["twelvedata"], twelvedataSymbol: "BARC", exchange: "LSE", baselinePrice: 220, volatility: 0.02 },
  { symbol: "DGE.L", displayName: "Diageo plc", assetClass: "STOCK", region: "UK", providers: ["twelvedata"], twelvedataSymbol: "DGE", exchange: "LSE", baselinePrice: 2550, volatility: 0.013 },
  { symbol: "BATS.L", displayName: "British American Tobacco", assetClass: "STOCK", region: "UK", providers: ["twelvedata"], twelvedataSymbol: "BATS", exchange: "LSE", baselinePrice: 2480, volatility: 0.012 },
];

// ─── Japanese Stocks (TSE) ───────────────────────────────────────────────
const JP_STOCKS: SupportedSymbol[] = [
  { symbol: "7203", displayName: "Toyota Motor Corp.", assetClass: "STOCK", region: "JP", providers: ["twelvedata"], exchange: "TSE", baselinePrice: 3200, volatility: 0.015 },
  { symbol: "6758", displayName: "Sony Group Corp.", assetClass: "STOCK", region: "JP", providers: ["twelvedata"], exchange: "TSE", baselinePrice: 13500, volatility: 0.017 },
  { symbol: "6861", displayName: "Keyence Corp.", assetClass: "STOCK", region: "JP", providers: ["twelvedata"], exchange: "TSE", baselinePrice: 68000, volatility: 0.018 },
  { symbol: "9983", displayName: "Fast Retailing Co.", assetClass: "STOCK", region: "JP", providers: ["twelvedata"], exchange: "TSE", baselinePrice: 42000, volatility: 0.02 },
  { symbol: "9984", displayName: "SoftBank Group Corp.", assetClass: "STOCK", region: "JP", providers: ["twelvedata"], exchange: "TSE", baselinePrice: 9500, volatility: 0.025 },
  { symbol: "8035", displayName: "Tokyo Electron Ltd.", assetClass: "STOCK", region: "JP", providers: ["twelvedata"], exchange: "TSE", baselinePrice: 31000, volatility: 0.026 },
  { symbol: "8306", displayName: "Mitsubishi UFJ Financial", assetClass: "STOCK", region: "JP", providers: ["twelvedata"], exchange: "TSE", baselinePrice: 1600, volatility: 0.016 },
  { symbol: "7267", displayName: "Honda Motor Co.", assetClass: "STOCK", region: "JP", providers: ["twelvedata"], exchange: "TSE", baselinePrice: 1650, volatility: 0.016 },
  { symbol: "7974", displayName: "Nintendo Co. Ltd.", assetClass: "STOCK", region: "JP", providers: ["twelvedata"], exchange: "TSE", baselinePrice: 8100, volatility: 0.017 },
  { symbol: "6501", displayName: "Hitachi Ltd.", assetClass: "STOCK", region: "JP", providers: ["twelvedata"], exchange: "TSE", baselinePrice: 3400, volatility: 0.018 },
];

// ─── European Stocks (XETR / Euronext) ───────────────────────────────────
const EU_STOCKS: SupportedSymbol[] = [
  { symbol: "ASML", displayName: "ASML Holding NV", assetClass: "STOCK", region: "EU", providers: ["twelvedata"], exchange: "Euronext", baselinePrice: 950, volatility: 0.022 },
  { symbol: "SAP", displayName: "SAP SE", assetClass: "STOCK", region: "EU", providers: ["twelvedata"], exchange: "XETR", baselinePrice: 185, volatility: 0.014 },
  { symbol: "MC", displayName: "LVMH Moët Hennessy", assetClass: "STOCK", region: "EU", providers: ["twelvedata"], exchange: "Euronext", baselinePrice: 720, volatility: 0.018 },
  { symbol: "TTE", displayName: "TotalEnergies SE", assetClass: "STOCK", region: "EU", providers: ["twelvedata"], exchange: "Euronext", baselinePrice: 62, volatility: 0.016 },
  { symbol: "SAN", displayName: "Sanofi SA", assetClass: "STOCK", region: "EU", providers: ["twelvedata"], exchange: "Euronext", baselinePrice: 92, volatility: 0.012 },
  { symbol: "SIE", displayName: "Siemens AG", assetClass: "STOCK", region: "EU", providers: ["twelvedata"], exchange: "XETR", baselinePrice: 172, volatility: 0.015 },
  { symbol: "ALV", displayName: "Allianz SE", assetClass: "STOCK", region: "EU", providers: ["twelvedata"], exchange: "XETR", baselinePrice: 265, volatility: 0.013 },
  { symbol: "SU", displayName: "Schneider Electric SE", assetClass: "STOCK", region: "EU", providers: ["twelvedata"], exchange: "Euronext", baselinePrice: 225, volatility: 0.016 },
  { symbol: "AI", displayName: "Air Liquide SA", assetClass: "STOCK", region: "EU", providers: ["twelvedata"], exchange: "Euronext", baselinePrice: 165, volatility: 0.012 },
  { symbol: "AIR", displayName: "Airbus SE", assetClass: "STOCK", region: "EU", providers: ["twelvedata"], exchange: "Euronext", baselinePrice: 135, volatility: 0.018 },
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

/**
 * Returns the exact TradingView symbol string for a given canonical symbol.
 * Dynamic resolution prevents stale chart states or falling back to BTC.
 */
export function getTradingViewSymbol(symbol: string): string {
  const entry = getSupportedSymbol(symbol);
  if (!entry) {
    if (symbol.includes("/")) return `FX:${symbol.replace("/", "")}`;
    return `NASDAQ:${symbol}`;
  }

  if (entry.assetClass === "CRYPTO") {
    return `BINANCE:${symbol.replace("/USD", "USDT")}`;
  }
  if (entry.assetClass === "FOREX") {
    return `FX:${symbol.replace("/", "")}`;
  }
  if (entry.assetClass === "COMMODITY") {
    return `OANDA:${symbol.replace("/", "")}`;
  }
  if (entry.assetClass === "INDEX") {
    if (symbol === "NASDAQ") return "NASDAQ:NDX";
    if (symbol === "S&P500") return "FOREXCOM:SPXUSD";
    if (symbol === "DJI") return "DJ:DJI";
    if (symbol === "NIFTY50") return "NSE:NIFTY";
    if (symbol === "SENSEX") return "BSE:SENSEX";
    if (symbol === "NIKKEI") return "TVC:NI225";
    if (symbol === "FTSE100" || symbol === "FTSE") return "INDEX:FTSE";
    if (symbol === "DAX") return "XETR:DAX";
  }
  if (entry.assetClass === "STOCK") {
    if (entry.region === "IN") return `NSE:${symbol}`;
    if (entry.region === "AE") return `${entry.exchange || "DFM"}:${symbol}`;
    if (entry.region === "UK") {
      const clean = symbol.replace(/\.L$/, "");
      return `LSE:${clean}`;
    }
    if (entry.region === "JP") return `TSE:${symbol}`;
    if (entry.region === "EU") return `${entry.exchange || "XETR"}:${symbol}`;
    if (entry.region === "US") return `${entry.exchange || "NASDAQ"}:${symbol}`;
  }

  return `NASDAQ:${symbol}`;
}

/**
 * Filter supported symbols for a specific user preferred market.
 */
export function getSymbolsForMarket(market: MarketRegion): SupportedSymbol[] {
  switch (market) {
    case "INDIA":
      return SUPPORTED_SYMBOLS.filter((s) => (s.region as string) === "IN");
    case "US":
      return SUPPORTED_SYMBOLS.filter((s) => (s.region as string) === "US");
    case "UAE":
      return SUPPORTED_SYMBOLS.filter((s) => (s.region as string) === "AE");
    case "UK":
      return SUPPORTED_SYMBOLS.filter((s) => (s.region as string) === "UK");
    case "JAPAN":
      return SUPPORTED_SYMBOLS.filter((s) => (s.region as string) === "JP");
    case "EUROPE":
      return SUPPORTED_SYMBOLS.filter((s) => (s.region as string) === "EU");
    case "FOREX":
      return SUPPORTED_SYMBOLS.filter((s) => s.assetClass === "FOREX");
    case "CRYPTO":
      return SUPPORTED_SYMBOLS.filter((s) => s.assetClass === "CRYPTO");
    default:
      return SUPPORTED_SYMBOLS.filter((s) => (s.region as string) === "US");
  }
}

export function getSymbolGroups(): Array<{ label: string; assetClass: AssetClass; symbols: SupportedSymbol[] }> {
  return [
    { label: "Crypto", assetClass: "CRYPTO", symbols: CRYPTO },
    { label: "Forex", assetClass: "FOREX", symbols: FOREX },
    { label: "US Stocks & Indices", assetClass: "STOCK", symbols: [...INDEX, ...US_STOCKS] },
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