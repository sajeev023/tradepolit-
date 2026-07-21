import { describe, it, expect } from "vitest";
import { safeParseAIResponse, extractResponseContent } from "./ai-response-parser";

const mockTelemetry = {
  symbol: "BTC/USD",
  timeframe: "4h",
  currentPrice: 70000,
  support: 68000,
  resistance: 72000,
  invalidationLevel: 67500,
  rsi: 55.4,
  rsiLabel: "Bullish momentum — above neutral",
  bias: "BUY/LONG",
  setupQuality: "HIGH GRADE",
  confidence: "HIGH",
  trend: "BULLISH",
  sourceMetadata: {},
};

describe("safeParseAIResponse & AI response repair engine", () => {
  it("parses valid JSON successfully", () => {
    const raw = JSON.stringify({
      marketRegime: "Bullish trend continuation",
      bias: "BULLISH",
      setupQuality: "HIGH GRADE",
      confidence: "HIGH",
      coachNarrative: "Analysis Source: TradePilot Telemetry | Symbol: BTC/USD | TF: 4h | Price: $70,000 | Status: Synchronized\n\nLooking strong.",
    });

    const { parsed, isRepaired, isFallback } = safeParseAIResponse(raw, mockTelemetry);
    expect(isFallback).toBe(false);
    expect(isRepaired).toBe(false);
    expect(parsed.marketRegime).toBe("Bullish trend continuation");
    expect(parsed.bias).toBe("BULLISH");
    expect(parsed.support).toBe(68000);
    expect(parsed.resistance).toBe(72000);
  });

  it("handles markdown code fences (```json)", () => {
    const raw = "```json\n{\n  \"marketRegime\": \"Consolidating\",\n  \"bias\": \"NEUTRAL\"\n}\n```";
    const { parsed, isFallback } = safeParseAIResponse(raw, mockTelemetry);
    expect(isFallback).toBe(false);
    expect(parsed.marketRegime).toBe("Consolidating");
    expect(parsed.bias).toBe("NEUTRAL");
  });

  it("auto-repairs truncated JSON strings gracefully", () => {
    // Truncated JSON missing closing quote and closing brace
    const truncated = '{"marketRegime": "Bullish breakout", "bias": "BULLISH", "coachNarrative": "Analysis Source: TradePilot Telemetry | Symbol: BTC/USD | TF: 4h | Price: $70,000 | Status: Synchronized\n\nMarket is breaking out with high volume';

    const { parsed, isRepaired, isFallback } = safeParseAIResponse(truncated, mockTelemetry);
    expect(isFallback).toBe(false);
    expect(isRepaired).toBe(true);
    expect(parsed.marketRegime).toBe("Bullish breakout");
    expect(parsed.bias).toBe("BULLISH");
  });

  it("falls back to structured telemetry on completely invalid prose without throwing", () => {
    const invalidProse = "Internal Server Error from upstream provider.";
    const { parsed, isFallback } = safeParseAIResponse(invalidProse, mockTelemetry);
    expect(isFallback).toBe(true);
    expect(parsed.support).toBe(68000);
    expect(parsed.resistance).toBe(72000);
    expect(parsed.coachNarrative).toContain("Analysis Source: TradePilot Telemetry | Symbol: BTC/USD");
  });

  it("extracts response content from both streaming deltas and non-streaming choices", () => {
    const fullChoice = { choices: [{ message: { content: "Full completion response" } }] };
    const deltaChoice = { choices: [{ delta: { content: "Streaming delta chunk" } }] };

    expect(extractResponseContent(fullChoice)).toBe("Full completion response");
    expect(extractResponseContent(deltaChoice)).toBe("Streaming delta chunk");
    expect(extractResponseContent(null)).toBeNull();
  });
});
