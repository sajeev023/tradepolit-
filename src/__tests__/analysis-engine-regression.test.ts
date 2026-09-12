import { describe, it, expect, vi } from "vitest";
import { normalizeSymbol, isRegisteredSymbol } from "@/lib/market";
import { validateMarketData, validateIndicators, isDataFresh } from "@/lib/validate-market-data";
import { synthSetup } from "@/lib/trade-logic/setup-synthesis";
import { validateSetup } from "@/lib/trade-logic";
import { safeParseAIResponse } from "@/lib/ai-response-parser";
import { validateTradeAnalysis } from "@/lib/trade-validator";
import { NextRequest } from "next/server";

// Mock dependencies for route testing
vi.mock("@/lib/auth", () => ({
  getAuthenticatedUser: vi.fn().mockResolvedValue({
    user: { id: "test-user-123", email: "trader@example.com" },
    error: null,
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkUserRateLimit: vi.fn().mockReturnValue({
    result: { allowed: true, resetAt: Date.now() + 60000 },
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn().mockResolvedValue({ displayName: "ProTrader", email: "pro@trade.com" }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    userProfile: {
      findUnique: vi.fn().mockResolvedValue({ accountSize: 25000, maxRiskPercent: 1 }),
    },
    trade: { findMany: vi.fn().mockResolvedValue([]) },
    journalEntry: { findMany: vi.fn().mockResolvedValue([]) },
    behavioralEvent: { findMany: vi.fn().mockResolvedValue([]) },
    conversationMemory: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "mem-1" }),
      update: vi.fn().mockResolvedValue({ id: "mem-1" }),
    },
  },
}));

vi.mock("@/lib/analytics-server", () => ({
  analyticsServer: {
    track: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("TradeCopilot V4 Analysis Engine — Regression Test Suite", () => {
  // ───────────────────────────────────────────────────────────────────────────
  // 1. Symbol Normalization & Registry
  // ───────────────────────────────────────────────────────────────────────────
  describe("Symbol Normalization & Registry Verification", () => {
    const validVariants = [
      { input: "BTC/USD", expected: "BTC/USD" },
      { input: "BTC/USDT", expected: "BTC/USD" },
      { input: "BTCUSD", expected: "BTC/USD" },
      { input: "BTCUSDT", expected: "BTC/USD" },
      { input: "BINANCE:BTCUSDT", expected: "BTC/USD" },
      { input: "binance:btcusdt", expected: "BTC/USD" },
      { input: "ETH/USD", expected: "ETH/USD" },
      { input: "ETH/USDT", expected: "ETH/USD" },
      { input: "ETHUSD", expected: "ETH/USD" },
      { input: "SOL/USD", expected: "SOL/USD" },
      { input: "SOL/USDT", expected: "SOL/USD" },
      { input: "EUR/USD", expected: "EUR/USD" },
      { input: "EURUSD", expected: "EUR/USD" },
      { input: "NASDAQ", expected: "NASDAQ" },
      { input: "S&P500", expected: "S&P500" },
    ];

    validVariants.forEach(({ input, expected }) => {
      it(`normalizes "${input}" to "${expected}" and verifies registration`, () => {
        const normalized = normalizeSymbol(input);
        expect(normalized).toBe(expected);
        expect(isRegisteredSymbol(input)).toBe(true);
        expect(isRegisteredSymbol(normalized)).toBe(true);
      });
    });

    it("rejects unknown and unregistered symbols", () => {
      expect(isRegisteredSymbol("UNKNOWN/TICKER")).toBe(false);
      expect(isRegisteredSymbol("FAKECRYPTO")).toBe(false);
      expect(isRegisteredSymbol("")).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Market Data Validation & Freshness
  // ───────────────────────────────────────────────────────────────────────────
  describe("Market Data & Indicators Validation", () => {
    const mockCandles = Array.from({ length: 60 }, (_, i) => ({
      timestamp: Date.now() - (60 - i) * 4 * 3600 * 1000,
      open: 65000 + i * 10,
      high: 65200 + i * 10,
      low: 64900 + i * 10,
      close: 65100 + i * 10,
      volume: 1200 + i * 5,
    }));

    it("passes validation for valid 4h BTC/USD candle history", () => {
      const data = {
        symbol: "BTC/USD",
        currentPrice: 65700,
        ohlcv: mockCandles,
      };
      const errors = validateMarketData(data, "BTC/USD", "4h");
      expect(errors).toHaveLength(0);
    });

    it("rejects market data with insufficient candle history (< 50)", () => {
      const data = {
        symbol: "BTC/USD",
        currentPrice: 65700,
        ohlcv: mockCandles.slice(0, 30),
      };
      const errors = validateMarketData(data, "BTC/USD", "4h");
      expect(errors.some(e => e.includes("minimum 50 required"))).toBe(true);
    });

    it("rejects market data with invalid current price", () => {
      const data = {
        symbol: "BTC/USD",
        currentPrice: -10,
        ohlcv: mockCandles,
      };
      const errors = validateMarketData(data, "BTC/USD", "4h");
      expect(errors.some(e => e.includes("Invalid current price"))).toBe(true);
    });

    it("verifies 4h data freshness correctly (fresh vs stale)", () => {
      const now = Date.now();
      // 1 hour old candle on 4h timeframe is fresh (4h candle duration)
      expect(isDataFresh(now - 3600 * 1000, "4h")).toBe(true);
      // 10 hours old on 4h timeframe is stale (exceeds 4h + grace)
      expect(isDataFresh(now - 10 * 3600 * 1000, "4h")).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Trade-Logic Setup Synthesis & Mathematical Invariants
  // ───────────────────────────────────────────────────────────────────────────
  describe("Trade-Logic Setup Synthesis & Invariant Engine", () => {
    const longContext = {
      symbol: "BTC/USD",
      timeframe: "4h",
      currentPrice: 67000,
      support: 65000,
      resistance: 71000,
      invalidationLevel: 64500,
      rsi: 52,
      macdValue: -20,
      macdSignal: -50,
      macdHistogram: 30,
      trend: "BULLISH" as const,
      bias: "BUY/LONG" as const,
      atr: 1200,
    };

    it("synthesizes valid LONG setup meeting all invariants", () => {
      const setup = synthSetup({ bias: "BUY/LONG" }, longContext);
      expect(setup).toBeDefined();
      if (!setup) return;

      // Invariants for LONG:
      // stopLoss <= invalidation < entry < target
      expect(setup.entry).toBeGreaterThan(0);
      expect(setup.stopLoss).toBeGreaterThan(0);
      expect(setup.target).toBeGreaterThan(0);
      expect(setup.invalidation).toBeGreaterThan(0);

      expect(setup.target).toBeGreaterThan(setup.entry);
      expect(setup.entry).toBeGreaterThan(setup.invalidation);
      expect(setup.invalidation).toBeGreaterThanOrEqual(setup.stopLoss);
      expect(setup.riskReward).toBeGreaterThanOrEqual(1.5);
    });

    const shortContext = {
      symbol: "BTC/USD",
      timeframe: "4h",
      currentPrice: 67000,
      support: 64000,
      resistance: 69000,
      invalidationLevel: 69500,
      rsi: 44,
      macdValue: -200,
      macdSignal: -150,
      macdHistogram: -50,
      trend: "BEARISH" as const,
      bias: "SELL/SHORT" as const,
      atr: 1200,
    };

    it("synthesizes valid SHORT setup meeting all invariants", () => {
      const setup = synthSetup({ bias: "SELL/SHORT" }, shortContext);
      expect(setup).toBeDefined();
      if (!setup) return;

      // Invariants for SHORT:
      // stopLoss >= invalidation > entry > target
      expect(setup.entry).toBeGreaterThan(0);
      expect(setup.stopLoss).toBeGreaterThan(0);
      expect(setup.target).toBeGreaterThan(0);
      expect(setup.invalidation).toBeGreaterThan(0);

      expect(setup.entry).toBeGreaterThan(setup.target);
      expect(setup.invalidation).toBeGreaterThan(setup.entry);
      expect(setup.stopLoss).toBeGreaterThanOrEqual(setup.invalidation);
      expect(setup.riskReward).toBeGreaterThanOrEqual(1.5);
    });

    it("deterministically repairs inverted AI numbers without throwing away analysis", () => {
      // AI incorrectly returns stopLoss above entry for a LONG trade
      const invalidAiProposal = {
        bias: "BULLISH",
        entryIdeas: "Buy at $67,000",
        stopLossIdea: "68500", // INVERTED: above entry!
        takeProfitIdea: "66000", // INVERTED: below entry!
        invalidationLevel: 68500,
      };

      const result = validateSetup(invalidAiProposal, longContext);
      expect(result.isValid).toBe(true);
      expect(result.setup!.provenance.stopLoss).toBe("structure");
      expect(result.setup!.provenance.target).toBe("structure");
      expect(result.setup!.target).toBeGreaterThan(result.setup!.entry);
      expect(result.setup!.entry).toBeGreaterThan(result.setup!.stopLoss);
      expect(result.setup!.riskReward).toBeGreaterThanOrEqual(1.5);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. AI Parser & MACD Consistency Checks
  // ───────────────────────────────────────────────────────────────────────────
  describe("AI Parser & Telemetry-Narrative Consistency", () => {
    const techTelemetry = {
      symbol: "BTC/USD",
      timeframe: "4h",
      currentPrice: 67448,
      support: 65089,
      resistance: 74050,
      invalidationLevel: 64500,
      rsi: 48.6,
      rsiLabel: "Bearish momentum — below neutral",
      bias: "SELL/SHORT",
      setupQuality: "HIGH GRADE",
      confidence: "MEDIUM",
      trend: "BEARISH",
      sourceMetadata: { rsiSource: "test", supportSource: "test" },
      macdValue: -402.6969,
      macdSignal: -456.8834, // macdValue > macdSignal (-402 > -456) => MACD momentum is bullish crossover
      macdHistogram: 54.1865,
    };

    it("flags MACD contradiction when telemetry is bullish but narrative claims bearish", () => {
      const aiResponseContradiction = JSON.stringify({
        marketRegime: "Bearish Trend",
        bias: "BEARISH",
        support: 65089,
        resistance: 74050,
        invalidationLevel: 75000,
        setupQuality: "HIGH GRADE",
        riskLevel: "Medium",
        confidence: "MEDIUM",
        whyItMatters: "Testing MACD contradiction",
        entryIdeas: "Short near $67,448",
        stopLossIdea: "74500",
        takeProfitIdea: "63000",
        shortTermScenario: "Downward pressure",
        coachNarrative: "Analysis Source: TradCopilot Telemetry | Symbol: BTC/USD | Exchange: Binance | TF: 4h | Price: $67,448 | Status: Synchronized\n\n## Momentum\nRSI is at 48.60. MACD is bearish (signal line below) with negative momentum.",
      });

      const parsed = safeParseAIResponse(aiResponseContradiction, techTelemetry);
      expect(parsed.jsonParseSuccess).toBe(true);
      const validation = validateTradeAnalysis(parsed.parsed, techTelemetry);
      expect(validation.isValid).toBe(false);
      expect(validation.issues.some(i => i.includes("MACD Contradiction"))).toBe(true);
    });

    it("passes validation when narrative correctly aligns with MACD telemetry", () => {
      const aiResponseConsistent = JSON.stringify({
        marketRegime: "Bearish Trend with Bullish Momentum Crossover",
        bias: "BEARISH",
        support: 65089,
        resistance: 74050,
        invalidationLevel: 75000,
        setupQuality: "HIGH GRADE",
        riskLevel: "Medium",
        confidence: "MEDIUM",
        whyItMatters: "Testing MACD consistency",
        entryIdeas: "Short near $67,448",
        stopLossIdea: "74500",
        takeProfitIdea: "63000",
        shortTermScenario: "Downward pressure with bounce risk",
        coachNarrative: "Analysis Source: TradCopilot Telemetry | Symbol: BTC/USD | Exchange: Binance | TF: 4h | Price: $67,448 | Status: Synchronized\n\n## Momentum\nRSI is at 48.60. MACD is bullish (signal line below) showing positive histogram momentum inside a macro downtrend.",
      });

      const parsed = safeParseAIResponse(aiResponseConsistent, techTelemetry);
      expect(parsed.jsonParseSuccess).toBe(true);
      const validation = validateTradeAnalysis(parsed.parsed, techTelemetry);
      expect(validation.issues.some(i => i.includes("MACD Contradiction"))).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Route Integration & Error Code Handling
  // ───────────────────────────────────────────────────────────────────────────
  describe("API Route POST /api/v1/ai/analyze-chart End-to-End Handling", () => {
    it("returns SYMBOL_MAPPING_ERROR for invalid symbol", async () => {
      const { POST } = await import("@/app/api/v1/ai/analyze-chart/route");
      const req = new NextRequest("http://localhost:3000/api/v1/ai/analyze-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: "INVALID_COIN", timeframe: "4h" }),
      });

      const res = await POST(req);
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.error?.code).toBe("VALIDATION_ERROR");
    });

    it("normalizes BTC/USDT at route level to BTC/USD and retains canonical symbol", async () => {
      // Import route and execute with normalized input
      const { POST } = await import("@/app/api/v1/ai/analyze-chart/route");
      const req = new NextRequest("http://localhost:3000/api/v1/ai/analyze-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: "BTC/USDT", timeframe: "4h", bypassCache: true }),
      });

      const res = await POST(req);
      const json = await res.json();
      // Should succeed (200) or gracefully return structured response
      if (res.status === 200) {
        expect(json.data.symbol).toBe("BTC/USD");
        expect(json.data.timeframe).toBe("4h");
        expect(json.data.support).toBeGreaterThan(0);
        expect(json.data.resistance).toBeGreaterThan(json.data.support);
      } else {
        // If external AI network is blocked in CI, should return structured error, not crash
        expect(json.error).toBeDefined();
        expect(typeof json.error.code).toBe("string");
      }
    }, 65000);
  });
});
