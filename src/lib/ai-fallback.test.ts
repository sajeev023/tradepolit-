import { describe, it, expect } from "vitest";
import { buildChatFallbackFromChartState } from "./ai-fallback";

describe("buildChatFallbackFromChartState", () => {
  it("returns a graceful 'reasoning models slow' message when no chartState", () => {
    const reply = buildChatFallbackFromChartState({ userName: "Sajeev" });
    expect(reply).toContain("Sajeev");
    expect(reply).toContain("reasoning models");
    expect(reply).toContain("try asking again in a moment");
    // Must NOT be the old hardcoded "AI analysis is temporarily unavailable" string
    expect(reply).not.toContain("temporarily unavailable due to high demand");
  });

  it("returns a graceful message when chartState has no currentPrice", () => {
    const reply = buildChatFallbackFromChartState({
      userName: "Sajeev",
      chartState: { symbol: "BTC/USD", rsi: 55 },
    });
    expect(reply).toContain("reasoning models");
    expect(reply).not.toContain("Price: $");
  });

  it("synthesizes chart-aware narrative with price, levels, RSI, MACD when telemetry is present", () => {
    const reply = buildChatFallbackFromChartState({
      userName: "Sajeev",
      chartState: {
        symbol: "BTC/USD",
        timeframe: "4h",
        currentPrice: 67_500,
        support: 66_000,
        resistance: 69_000,
        invalidationLevel: 65_500,
        rsi: 72,
        macdValue: 0.0024,
        macdSignal: 0.0011,
        bias: "BULLISH",
        trend: "UPTREND",
        setupQuality: "B+",
      },
    });
    expect(reply).toContain("BTC/USD (4h)");
    expect(reply).toContain("Price: $67,500");
    expect(reply).toContain("support $66,000");
    expect(reply).toContain("resistance $69,000");
    expect(reply).toContain("Structural invalidation: $65,500");
    expect(reply).toContain("overbought");
    expect(reply).toContain("bullish (above signal)");
    expect(reply).toContain("regime is uptrend");
    expect(reply).toContain("bias is bullish");
    expect(reply).toContain("Setup grade from the detector: B+");
  });

  it("describes RSI as oversold when below 30", () => {
    const reply = buildChatFallbackFromChartState({
      userName: "Sajeev",
      chartState: {
        symbol: "ETH/USD",
        currentPrice: 2_400,
        rsi: 25,
      },
    });
    expect(reply).toContain("oversold");
  });

  it("describes MACD as bearish when value below signal", () => {
    const reply = buildChatFallbackFromChartState({
      userName: "Sajeev",
      chartState: {
        symbol: "SOL/USD",
        currentPrice: 140,
        macdValue: -0.5,
        macdSignal: -0.2,
      },
    });
    expect(reply).toContain("bearish (below signal)");
  });

  it("never emits the legacy 'temporarily unavailable due to high demand' string", () => {
    const replies = [
      buildChatFallbackFromChartState({ userName: "Sajeev" }),
      buildChatFallbackFromChartState({ userName: "Sajeev", chartState: { symbol: "BTC/USD", currentPrice: 100 } }),
      buildChatFallbackFromChartState({
        userName: "Sajeev",
        chartState: { symbol: "BTC/USD", currentPrice: 100, rsi: 50, macdValue: 1, macdSignal: 0.5, support: 90, resistance: 110, invalidationLevel: 85, bias: "BULLISH", trend: "UPTREND", setupQuality: "A" },
      }),
    ];
    for (const r of replies) {
      expect(r).not.toMatch(/temporarily unavailable due to high demand/i);
    }
  });
});