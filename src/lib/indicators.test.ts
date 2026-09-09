import { describe, it, expect } from "vitest";
import { appendTelemetryMetadata } from "./indicators";

describe("Telemetry Metadata Insertion & Cleanup", () => {
  it("should append a new telemetry metadata block to plain narrative text", () => {
    const narrative = "Based on structural analysis, the market is in a bullish regime.";
    const analyzedAt = "2026-07-05T12:00:00Z";
    const lastCandleTime = "2026-07-05T11:45:00Z";
    const analyzedPrice = 71604.13;
    const livePrice = 71604.13;

    const result = appendTelemetryMetadata(
      narrative,
      analyzedAt,
      lastCandleTime,
      analyzedPrice,
      livePrice
    );

    expect(result).toContain("Based on structural analysis");
    expect(result).toContain("**Telemetry Metadata:**");
    expect(result).toContain("- **Analysis Timestamp:** 2026-07-05T12:00:00.000Z");
    expect(result).toContain("- **Telemetry Timestamp:** 2026-07-05T12:00:00.000Z");
    expect(result).toContain("- **Last Candle Timestamp:** 2026-07-05T11:45:00.000Z");
    expect(result).toContain("- **Current Market Price Used:** $71,604.13");
    expect(result).toContain("- **Price Difference from Live Ticker:** 0.00%");
  });

  it("should strip any pre-existing telemetry metadata blocks before appending a new one", () => {
    const originalNarrative = "Bullish momentum continues.\n\n---\n**Telemetry Metadata:**\n- **Analysis Timestamp:** 2026-07-05T11:00:00.000Z\n- **Current Market Price Used:** $71,604.13";
    const analyzedAt = "2026-07-05T13:00:00Z";
    const lastCandleTime = "2026-07-05T12:45:00Z";
    const analyzedPrice = 68000.00;
    const livePrice = 68340.00; // 0.5% diff

    const result = appendTelemetryMetadata(
      originalNarrative,
      analyzedAt,
      lastCandleTime,
      analyzedPrice,
      livePrice
    );

    // Verify the old timestamp and old price are gone
    expect(result).not.toContain("2026-07-05T11:00:00.000Z");
    expect(result).not.toContain("71,604.13");

    // Verify the new timestamp, price, and price difference (approx 0.50%) are set correctly
    expect(result).toContain("Bullish momentum continues.");
    expect(result).toContain("- **Analysis Timestamp:** 2026-07-05T13:00:00.000Z");
    expect(result).toContain("- **Current Market Price Used:** $68,000.00");
    expect(result).toContain("- **Price Difference from Live Ticker:** 0.50%");
  });

  it("should append mapped exchange name when optional exchange parameter is provided", () => {
    const originalNarrative = "Bullish momentum continues.";
    const analyzedAt = "2026-07-05T13:00:00Z";
    const lastCandleTime = "2026-07-05T12:45:00Z";
    const analyzedPrice = 68000.00;
    const livePrice = 68000.00;
    const exchange = "BINANCE";

    const result = appendTelemetryMetadata(
      originalNarrative,
      analyzedAt,
      lastCandleTime,
      analyzedPrice,
      livePrice,
      exchange
    );

    expect(result).toContain("- **Exchange Mapped:** BINANCE");
  });
});

import { validateMarketData, validateIndicators, validateLevels, isDataFresh } from "./validate-market-data";

describe("Market Data & Indicator Validation Engines", () => {
  it("should validate market data symbol, price, and candle format correctly", () => {
    // Valid case
    const validData = {
      symbol: "BTC/USD",
      currentPrice: 68000,
      ohlcv: Array.from({ length: 50 }, (_, i) => ({
        open: 67900 + i,
        high: 68100 + i,
        low: 67800 + i,
        close: 68000 + i,
        volume: 1000,
        timestamp: Date.now() - i * 60000
      }))
    };
    const errors = validateMarketData(validData, "BTC/USD", "4h");
    expect(errors).toHaveLength(0);

    // Invalid symbol case
    const invalidSymbol = { ...validData, symbol: "BTCUSD" };
    expect(validateMarketData(invalidSymbol, "BTCUSD", "4h")).toContain("Invalid symbol format: BTCUSD");

    // Insufficient candles case
    const shortCandles = { ...validData, ohlcv: validData.ohlcv.slice(0, 10) };
    expect(validateMarketData(shortCandles, "BTC/USD", "4h")[0]).toContain("Insufficient OHLCV data");
  });

  it("should validate indicator bounds correctly", () => {
    const validIndicators = {
      rsi: 55,
      macd: { macd: 10, signal: 8 },
      ema9: 68000,
      ema21: 67800,
      atr: 250
    };
    expect(validateIndicators(validIndicators)).toHaveLength(0);

    const invalidRsi = { ...validIndicators, rsi: 105 };
    expect(validateIndicators(invalidRsi)[0]).toContain("RSI out of range");

    const nanMacd = { ...validIndicators, macd: { macd: NaN, signal: 8 } };
    expect(validateIndicators(nanMacd)[0]).toContain("MACD values are missing or NaN");
  });

  it("should validate support and resistance levels cross-consistency correctly", () => {
    const price = 68000;
    const validLevels = { support: 65000, resistance: 71000 };
    expect(validateLevels(validLevels, price)).toHaveLength(0);

    const supportAbovePrice = { support: 69000, resistance: 71000 };
    expect(validateLevels(supportAbovePrice, price)[0]).toContain("Support (69000) is above or equal to current price");

    const supportAboveResistance = { support: 65000, resistance: 64000 };
    expect(validateLevels(supportAboveResistance, price)).toContain("Support (65000) >= Resistance (64000) — impossible");
  });

  it("should correctly verify data freshness on various timeframes", () => {
    const now = Date.now();

    // Fresh 1m timeframe (last candle 30s ago)
    expect(isDataFresh(now - 30 * 1000, "1m")).toBe(true);

    // Stale 1m timeframe (last candle 2 minutes ago)
    expect(isDataFresh(now - 2 * 60 * 1000, "1m")).toBe(false);

    // Fresh 4h timeframe (last candle 10 minutes ago)
    expect(isDataFresh(now - 10 * 60 * 1000, "4h")).toBe(true);

    // 4h candle is legitimately up to 4h old — must NOT be rejected as stale.
    // Regression: previous hardcoded 15min cap on 4h rejected 100% of 4h fetches
    // and forced the analyze-chart route into the placeholder fallback path.
    expect(isDataFresh(now - 3 * 60 * 60 * 1000, "4h")).toBe(true);
    expect(isDataFresh(now - 23 * 60 * 60 * 1000, "1d")).toBe(true);

    // A 4h candle older than 4h + grace is still stale.
    expect(isDataFresh(now - 10 * 60 * 60 * 1000, "4h")).toBe(false);
  });
});
