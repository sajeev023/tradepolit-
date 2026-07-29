import { describe, it, expect } from "vitest";
import {
  getTradingViewSymbol,
  binanceStreamFor,
  symbolForBinanceStream,
  riskSpecFor,
  aiExchangeLabelFor,
  newsCategoryFor,
  newsQueryFor,
  determineAffectedAssets,
  getSymbolsForMarket,
  regionForMarket,
  getDefaultSymbolForMarket,
  getDefaultSymbolForAssetClass,
  getSymbolsForAssetClass,
  MARKETS,
  SUPPORTED_SYMBOLS,
} from "../supported-symbols";
import {
  tdIntervalFor,
  binanceIntervalFor,
  coinbaseCandleSpecFor,
  tradingViewIntervalFor,
  ohlcvCacheTtlFor,
  normalizeTimeframe,
} from "../timeframes";

/**
 * Phase 6 — registry accessor contract tests.
 *
 * The registry (supported-symbols.ts) is the single source of truth for every
 * provider dimension. These tests lock in the root-cause guarantee from Phase
 * 1: adding a symbol/market is config-only, and every provider dimension derives
 * from the registry entry — no consumer re-encodes symbols via its own
 * if/switch/Record. If any accessor here regresses to a hardcoded dispatch, the
 * corresponding assertion fails.
 */
describe("registry — TradingView feed symbol (getTradingViewSymbol)", () => {
  it("returns the exact registry feed string for known symbols across asset classes", () => {
    expect(getTradingViewSymbol("BTC/USD")).toBe("BINANCE:BTCUSDT");
    expect(getTradingViewSymbol("EUR/USD")).toBe("FX:EURUSD");
    expect(getTradingViewSymbol("XAU/USD")).toBe("OANDA:XAUUSD");
    expect(getTradingViewSymbol("AAPL")).toBe("NASDAQ:AAPL");
    expect(getTradingViewSymbol("RELIANCE")).toBe("NSE:RELIANCE");
    expect(getTradingViewSymbol("HSBA.L")).toBe("LSE:HSBA");
    expect(getTradingViewSymbol("7203")).toBe("TSE:7203");
    expect(getTradingViewSymbol("SAP")).toBe("XETR:SAP");
    expect(getTradingViewSymbol("NIFTY50")).toBe("NSE:NIFTY");
  });

  it("falls back to a coherent FX feed for an unknown pair symbol", () => {
    expect(getTradingViewSymbol("ABC/USD")).toBe("FX:ABCUSD");
  });

  it("falls back to a NASDAQ feed for an unknown non-pair symbol", () => {
    expect(getTradingViewSymbol("UNKNOWN")).toBe("NASDAQ:UNKNOWN");
  });
});

describe("registry — Binance WebSocket stream (binanceStreamFor / symbolForBinanceStream)", () => {
  it("returns the lowercase stream name for streamable symbols", () => {
    expect(binanceStreamFor("BTC/USD")).toBe("btcusdt");
    expect(binanceStreamFor("ETH/USD")).toBe("ethusdt");
    expect(binanceStreamFor("EUR/USD")).toBe("eurusdt");
  });

  it("returns null for symbols with no WS stream (equities, indices, non-streamable forex)", () => {
    expect(binanceStreamFor("AAPL")).toBeNull();
    expect(binanceStreamFor("RELIANCE")).toBeNull();
    expect(binanceStreamFor("USD/JPY")).toBeNull();
  });

  it("round-trips stream name → canonical symbol", () => {
    expect(symbolForBinanceStream("btcusdt")).toBe("BTC/USD");
    expect(symbolForBinanceStream("ethusdt")).toBe("ETH/USD");
    expect(symbolForBinanceStream("nonsense")).toBeNull();
  });
});

describe("registry — risk instrument spec (riskSpecFor)", () => {
  it("returns the JPY-aware pip size for yen-quoted pairs", () => {
    expect(riskSpecFor("USD/JPY")).toEqual({ contractSize: 100000, pipSize: 0.01, minTradable: 1000, isJpyQuote: true });
    expect(riskSpecFor("EUR/JPY")).toEqual({ contractSize: 100000, pipSize: 0.01, minTradable: 1000, isJpyQuote: true });
  });

  it("returns the standard 0.0001 pip size for non-JPY forex", () => {
    expect(riskSpecFor("EUR/USD").pipSize).toBe(0.0001);
    expect(riskSpecFor("EUR/USD").isJpyQuote).toBe(false);
  });

  it("returns a typed CRYPTO-flavored default for unknown symbols (no silent CRYPTO misclassification of equities)", () => {
    const spec = riskSpecFor("UNKNOWN");
    expect(spec).toEqual({ contractSize: 1, pipSize: 1, minTradable: 0.001, isJpyQuote: false });
  });
});

describe("registry — AI exchange label (aiExchangeLabelFor)", () => {
  it("uses the explicit registry label when present", () => {
    expect(aiExchangeLabelFor("BTC/USD")).toBe("BINANCE");
    expect(aiExchangeLabelFor("EUR/USD")).toBe("FX");
    expect(aiExchangeLabelFor("XAU/USD")).toBe("OANDA");
    expect(aiExchangeLabelFor("NASDAQ")).toBe("NASDAQ");
  });

  it("falls back to the listing exchange for equities without an explicit label", () => {
    expect(aiExchangeLabelFor("AAPL")).toBe("NASDAQ");
    expect(aiExchangeLabelFor("RELIANCE")).toBe("NSE");
    expect(aiExchangeLabelFor("7203")).toBe("TSE");
  });

  it("falls back to a sensible default for unknown symbols", () => {
    expect(aiExchangeLabelFor("UNKNOWN")).toBe("BINANCE");
  });
});

describe("registry — news dimensions (newsCategoryFor / newsQueryFor / determineAffectedAssets)", () => {
  it("returns the registry news category for a symbol", () => {
    expect(newsCategoryFor("BTC/USD")).toEqual(["crypto"]);
    expect(newsCategoryFor("EUR/USD")).toEqual(["forex"]);
    expect(newsCategoryFor("XAU/USD")).toEqual(["general"]);
  });

  it("returns a general default for symbols without a news category", () => {
    expect(newsCategoryFor("AAPL")).toEqual(["general"]);
  });

  it("returns the broad default when no symbol is supplied", () => {
    expect(newsCategoryFor(undefined)).toEqual(["general", "forex", "crypto"]);
  });

  it("returns the registry NewsAPI query for a symbol", () => {
    expect(newsQueryFor("BTC/USD")).toBe("Bitcoin OR BTC");
    expect(newsQueryFor("EUR/USD")).toBe("EUR OR Euro OR ECB");
  });

  it("maps a headline to affected canonical symbols via word-boundary keyword matching", () => {
    expect(determineAffectedAssets("Bitcoin surges past $70k", "")).toContain("BTC/USD");
    expect(determineAffectedAssets("ECB holds rates, euro steady", "")).toContain("EUR/USD");
    // Word boundary: "sol" must NOT match inside "consolidation".
    expect(determineAffectedAssets("Market consolidation continues", "")).not.toContain("SOL/USD");
    expect(determineAffectedAssets("Solana network upgrade", "")).toContain("SOL/USD");
  });
});

describe("registry — market selection (getSymbolsForMarket / regionForMarket / defaults)", () => {
  it("region-scoped markets return only that region's symbols", () => {
    const us = getSymbolsForMarket("US");
    expect(us.length).toBeGreaterThan(0);
    expect(us.every((s) => s.region === "US")).toBe(true);
    expect(us.some((s) => s.symbol === "AAPL")).toBe(true);
    // Indian equities must NOT leak into the US market (the Bitcoin-on-stocks bug class).
    expect(us.some((s) => s.symbol === "RELIANCE")).toBe(false);

    const india = getSymbolsForMarket("INDIA");
    expect(india.every((s) => s.region === "IN")).toBe(true);
    expect(india.some((s) => s.symbol === "RELIANCE")).toBe(true);
    expect(india.some((s) => s.symbol === "AAPL")).toBe(false);
  });

  it("asset-class-scoped markets (FOREX/CRYPTO) return only that asset class", () => {
    const forex = getSymbolsForMarket("FOREX");
    expect(forex.every((s) => s.assetClass === "FOREX")).toBe(true);
    const crypto = getSymbolsForMarket("CRYPTO");
    expect(crypto.every((s) => s.assetClass === "CRYPTO")).toBe(true);
    expect(crypto.some((s) => s.symbol === "BTC/USD")).toBe(true);
  });

  it("regionForMarket returns the Region for region-scoped markets and null for asset-class markets", () => {
    expect(regionForMarket("INDIA")).toBe("IN");
    expect(regionForMarket("US")).toBe("US");
    expect(regionForMarket("JAPAN")).toBe("JP");
    expect(regionForMarket("FOREX")).toBeNull();
    expect(regionForMarket("CRYPTO")).toBeNull();
  });

  it("getDefaultSymbolForMarket returns the configured default per market", () => {
    expect(getDefaultSymbolForMarket("US")).toBe("AAPL");
    expect(getDefaultSymbolForMarket("INDIA")).toBe("RELIANCE");
    expect(getDefaultSymbolForMarket("CRYPTO")).toBe("BTC/USD");
    expect(getDefaultSymbolForMarket("FOREX")).toBe("EUR/USD");
  });

  it("getDefaultSymbolForAssetClass returns the first registered symbol of the class", () => {
    expect(getDefaultSymbolForAssetClass("CRYPTO")).toBe("BTC/USD");
    expect(getDefaultSymbolForAssetClass("FOREX")).toBe("EUR/USD");
  });

  it("getSymbolsForAssetClass returns only symbols of that class", () => {
    const stocks = getSymbolsForAssetClass("STOCK");
    expect(stocks.length).toBeGreaterThan(0);
    expect(stocks.every((s) => s.assetClass === "STOCK")).toBe(true);
  });

  it("every MarketConfig has a defaultSymbol that exists in its own market's symbol set", () => {
    // The keystone invariant: a market's default must belong to that market, so
    // selecting a market can never land on a symbol from another market.
    for (const [market, cfg] of Object.entries(MARKETS)) {
      const symbols = getSymbolsForMarket(market as keyof typeof MARKETS).map((s) => s.symbol);
      expect(symbols).toContain(cfg.defaultSymbol);
    }
  });

  it("every supported symbol carries a tradingViewSymbol (no chart can fall back to a guessed feed)", () => {
    const missing = SUPPORTED_SYMBOLS.filter((s) => !s.tradingViewSymbol);
    expect(missing).toEqual([]);
  });
});

// ─── Timeframe → interval accessors (Phase 1 item 5: one map per provider) ────
describe("timeframes — per-provider interval accessors", () => {
  it("normalizeTimeframe accepts case variants and rejects unknowns", () => {
    expect(normalizeTimeframe("1H")).toBe("1h");
    expect(normalizeTimeframe("4h")).toBe("4h");
    expect(normalizeTimeframe("1D")).toBe("1d");
    expect(normalizeTimeframe("1w")).toBe("1W");
    expect(normalizeTimeframe("nonsense")).toBeNull();
    expect(normalizeTimeframe("")).toBeNull();
  });

  it("twelve data maps to its interval strings", () => {
    expect(tdIntervalFor("1m")).toBe("1min");
    expect(tdIntervalFor("1d")).toBe("1day");
    expect(tdIntervalFor("1W")).toBe("1week");
  });

  it("binance maps to its interval strings", () => {
    expect(binanceIntervalFor("1h")).toBe("1h");
    expect(binanceIntervalFor("1W")).toBe("1w");
  });

  it("coinbase returns granularity + downsample factor (4h synthesizes from 1h)", () => {
    expect(coinbaseCandleSpecFor("1h")).toEqual({ granularity: 3600, factor: 1 });
    expect(coinbaseCandleSpecFor("4h")).toEqual({ granularity: 3600, factor: 4 });
    expect(coinbaseCandleSpecFor("1W")).toEqual({ granularity: 86400, factor: 7 });
  });

  it("tradingView maps to its interval strings", () => {
    expect(tradingViewIntervalFor("1m")).toBe("1");
    expect(tradingViewIntervalFor("1h")).toBe("60");
    expect(tradingViewIntervalFor("4h")).toBe("240");
    expect(tradingViewIntervalFor("1d")).toBe("D");
    expect(tradingViewIntervalFor("1W")).toBe("W");
  });

  it("ohlcvCacheTtlFor is tighter for short timeframes", () => {
    expect(ohlcvCacheTtlFor("1m")).toBeLessThan(ohlcvCacheTtlFor("1d"));
  });

  it("all accessors fall back to the 1h interval for an unknown timeframe", () => {
    expect(tdIntervalFor("nonsense")).toBe("1h");
    expect(binanceIntervalFor("nonsense")).toBe("1h");
    expect(tradingViewIntervalFor("nonsense")).toBe("60");
  });
});