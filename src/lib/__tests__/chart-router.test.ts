/**
 * src/lib/__tests__/chart-router.test.ts
 *
 * Unit tests for the chart router.
 * Validates the strict routing table from the architecture spec:
 *   US Stock  → tradingview
 *   Crypto    → lightweight
 *   Forex     → lightweight
 *   India     → echarts
 *   UK        → echarts
 *   Japan     → echarts
 *   Europe    → echarts
 *   UAE       → echarts
 */

import { describe, it, expect } from "vitest";
import { resolveChartEngine } from "../chart-router";

describe("chart-router / resolveChartEngine", () => {
  // ── US Stocks → TradingView ─────────────────────────────────────────────
  describe("US Stocks", () => {
    it.each([
      ["AAPL", "tradingview"],
      ["MSFT", "tradingview"],
      ["NVDA", "tradingview"],
      ["TSLA", "tradingview"],
      ["META", "tradingview"],
      ["AMZN", "tradingview"],
      ["GOOGL", "tradingview"],
      ["JPM", "tradingview"],
      ["V", "tradingview"],
    ])("%s → %s", (symbol, engine) => {
      expect(resolveChartEngine(symbol)).toBe(engine);
    });
  });

  // ── Crypto → Lightweight Charts ─────────────────────────────────────────
  describe("Crypto", () => {
    it.each([
      ["BTC/USD", "lightweight"],
      ["ETH/USD", "lightweight"],
      ["SOL/USD", "lightweight"],
      ["BNB/USD", "lightweight"],
      ["XRP/USD", "lightweight"],
      ["ADA/USD", "lightweight"],
      ["DOGE/USD", "lightweight"],
    ])("%s → %s", (symbol, engine) => {
      expect(resolveChartEngine(symbol)).toBe(engine);
    });
  });

  // ── Forex → Lightweight Charts ───────────────────────────────────────────
  describe("Forex", () => {
    it.each([
      ["EUR/USD", "lightweight"],
      ["GBP/USD", "lightweight"],
      ["USD/JPY", "lightweight"],
      ["USD/CHF", "lightweight"],
      ["AUD/USD", "lightweight"],
      ["USD/CAD", "lightweight"],
      ["EUR/GBP", "lightweight"],
    ])("%s → %s", (symbol, engine) => {
      expect(resolveChartEngine(symbol)).toBe(engine);
    });
  });

  // ── India → ECharts ──────────────────────────────────────────────────────
  describe("India Stocks", () => {
    it.each([
      ["RELIANCE", "echarts"],
      ["TCS", "echarts"],
      ["INFY", "echarts"],
      ["HDFCBANK", "echarts"],
      ["ICICIBANK", "echarts"],
      ["SBIN", "echarts"],
      ["LT", "echarts"],
    ])("%s → %s", (symbol, engine) => {
      expect(resolveChartEngine(symbol)).toBe(engine);
    });
  });

  // ── UK → ECharts ─────────────────────────────────────────────────────────
  describe("UK Stocks", () => {
    it.each([
      ["HSBA.L", "echarts"],
      ["SHEL.L", "echarts"],
      ["BP.L", "echarts"],
      ["AZN.L", "echarts"],
    ])("%s → %s", (symbol, engine) => {
      expect(resolveChartEngine(symbol)).toBe(engine);
    });
  });

  // ── Europe → ECharts ──────────────────────────────────────────────────────
  describe("European Stocks", () => {
    it.each([
      ["SAP", "echarts"],
      ["ASML", "echarts"],
      ["MC", "echarts"],
      ["SIE", "echarts"],
    ])("%s → %s", (symbol, engine) => {
      expect(resolveChartEngine(symbol)).toBe(engine);
    });
  });

  // ── Japan → ECharts ───────────────────────────────────────────────────────
  describe("Japanese Stocks", () => {
    it.each([
      ["7203", "echarts"],
      ["6758", "echarts"],
      ["9984", "echarts"],
    ])("%s → %s", (symbol, engine) => {
      expect(resolveChartEngine(symbol)).toBe(engine);
    });
  });

  // ── UAE → ECharts ─────────────────────────────────────────────────────────
  describe("UAE Stocks", () => {
    it.each([
      ["EMAAR", "echarts"],
      ["FAB", "echarts"],
      ["DIB", "echarts"],
    ])("%s → %s", (symbol, engine) => {
      expect(resolveChartEngine(symbol)).toBe(engine);
    });
  });

  // ── US Indices → TradingView ──────────────────────────────────────────────
  describe("US Indices", () => {
    it.each([
      ["NASDAQ", "tradingview"],
      ["S&P500", "tradingview"],
      ["DJI", "tradingview"],
    ])("%s → %s", (symbol, engine) => {
      expect(resolveChartEngine(symbol)).toBe(engine);
    });
  });

  // ── Non-US Indices → ECharts ──────────────────────────────────────────────
  describe("Non-US Indices", () => {
    it.each([
      ["NIFTY50", "echarts"],
      ["SENSEX", "echarts"],
      ["NIKKEI", "echarts"],
      ["FTSE100", "echarts"],
      ["DAX", "echarts"],
    ])("%s → %s", (symbol, engine) => {
      expect(resolveChartEngine(symbol)).toBe(engine);
    });
  });

  // ── Commodity → TradingView ───────────────────────────────────────────────
  describe("Commodities", () => {
    it("XAU/USD → tradingview", () => {
      expect(resolveChartEngine("XAU/USD")).toBe("tradingview");
    });
  });

  // ── Heuristic fallback for unknown symbols ────────────────────────────────
  describe("Unknown symbols (heuristic fallback)", () => {
    it("unknown Forex pair format → lightweight", () => {
      expect(resolveChartEngine("EUR/CHF")).toBe("lightweight");
    });
    it("unknown crypto format → lightweight", () => {
      expect(resolveChartEngine("PEPE/USD")).toBe("lightweight");
    });
    it("unknown stock ticker → tradingview (best effort)", () => {
      expect(resolveChartEngine("UNKNOWN_TICKER")).toBe("tradingview");
    });
  });

  // ── Critical anti-regression: crypto must NOT go to TradingView ───────────
  describe("CRITICAL: Crypto must NOT route to TradingView", () => {
    it("BTC/USD is not tradingview", () => {
      expect(resolveChartEngine("BTC/USD")).not.toBe("tradingview");
    });
    it("ETH/USD is not tradingview", () => {
      expect(resolveChartEngine("ETH/USD")).not.toBe("tradingview");
    });
  });

  // ── Critical anti-regression: Forex must NOT go to TradingView ───────────
  describe("CRITICAL: Forex must NOT route to TradingView", () => {
    it("EUR/USD is not tradingview", () => {
      expect(resolveChartEngine("EUR/USD")).not.toBe("tradingview");
    });
    it("GBP/USD is not tradingview", () => {
      expect(resolveChartEngine("GBP/USD")).not.toBe("tradingview");
    });
  });

  // ── Critical anti-regression: India must NOT go to TradingView ───────────
  describe("CRITICAL: India stocks must NOT route to TradingView", () => {
    it("RELIANCE is not tradingview", () => {
      expect(resolveChartEngine("RELIANCE")).not.toBe("tradingview");
    });
    it("TCS is not tradingview", () => {
      expect(resolveChartEngine("TCS")).not.toBe("tradingview");
    });
  });
});
