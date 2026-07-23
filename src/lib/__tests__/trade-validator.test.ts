import { describe, it, expect } from "vitest";
import {
  validateTradeAnalysis,
  calculateDynamicRisk,
  getRSIClassification,
  TradeTelemetryContext,
  AIAnalysisPayload,
} from "../trade-validator";

const ASSETS = ["BTC/USD", "ETH/USD", "SOL/USD", "XAU/USD", "EUR/USD", "NASDAQ"];
const TIMEFRAMES = ["15m", "1h", "4h", "1D"];

const BASE_PRICES: Record<string, number> = {
  "BTC/USD": 95000,
  "ETH/USD": 3300,
  "SOL/USD": 180,
  "XAU/USD": 2650,
  "EUR/USD": 1.085,
  "NASDAQ": 19800,
};

describe("Trade Analysis Reasoning & Validation Engine Suite", () => {
  describe("FIX 5 — RSI 7-Tier Scale Classification", () => {
    it("correctly maps all 7 RSI tiers", () => {
      expect(getRSIClassification(25)).toBe("Oversold");
      expect(getRSIClassification(35)).toBe("Weak");
      expect(getRSIClassification(45)).toBe("Bearish");
      expect(getRSIClassification(55)).toBe("Bullish");
      expect(getRSIClassification(65)).toBe("Strong Bullish");
      expect(getRSIClassification(75)).toBe("Overbought");
      expect(getRSIClassification(85)).toBe("Extreme");
    });
  });

  describe("FIX 1 — MACD Consistency", () => {
    it("rejects analysis when MACD > Signal but narrative states MACD is bearish", () => {
      const tech: TradeTelemetryContext = {
        symbol: "BTC/USD",
        timeframe: "1h",
        currentPrice: 95000,
        support: 94000,
        resistance: 97000,
        invalidationLevel: 93500,
        rsi: 55,
        macdValue: 120,
        macdSignal: 80,
        macdHistogram: 40,
        trend: "BULLISH",
        bias: "BUY/LONG",
      };

      const analysis: AIAnalysisPayload = {
        bias: "BULLISH",
        support: 94000,
        resistance: 97000,
        invalidationLevel: 93500,
        rsi: 55,
        riskLevel: "Low",
        entryIdeas: "Limit near $95,000",
        stopLossIdea: "$93,500",
        takeProfitIdea: "$97,000",
        coachNarrative: "Analysis Source: TradCopilot Telemetry | Symbol: BTC/USD | Price: $95,000\n\nMACD is bearish and crossed below signal line.",
      };

      const result = validateTradeAnalysis(analysis, tech);
      expect(result.isValid).toBe(false);
      expect(result.issues.some((i) => i.includes("MACD Contradiction"))).toBe(true);
    });

    it("passes analysis when MACD > Signal and narrative states MACD is bullish", () => {
      const tech: TradeTelemetryContext = {
        symbol: "BTC/USD",
        timeframe: "1h",
        currentPrice: 95000,
        support: 94000,
        resistance: 97000,
        invalidationLevel: 93500,
        rsi: 55,
        macdValue: 120,
        macdSignal: 80,
        macdHistogram: 40,
        trend: "BULLISH",
        bias: "BUY/LONG",
      };

      const analysis: AIAnalysisPayload = {
        bias: "BULLISH",
        support: 94000,
        resistance: 97000,
        invalidationLevel: 93500,
        rsi: 55,
        riskLevel: "Low",
        entryIdeas: "Limit near $95,000",
        stopLossIdea: "$93,500",
        takeProfitIdea: "$98,000",
        coachNarrative: "Analysis Source: TradCopilot Telemetry | Symbol: BTC/USD | Price: $95,000\n\nMACD is bullish with expanding histogram.",
      };

      const result = validateTradeAnalysis(analysis, tech);
      expect(result.isValid).toBe(true);
    });
  });

  describe("FIX 2 — Stop Loss & Invalidation Rules", () => {
    it("rejects LONG setup when Stop Loss is above Entry", () => {
      const tech: TradeTelemetryContext = {
        symbol: "ETH/USD",
        timeframe: "4h",
        currentPrice: 3300,
        support: 3200,
        resistance: 3500,
        invalidationLevel: 3150,
        rsi: 52,
        macdValue: 5,
        macdSignal: 2,
        macdHistogram: 3,
        trend: "BULLISH",
        bias: "BUY/LONG",
      };

      const analysis: AIAnalysisPayload = {
        bias: "BUY/LONG",
        entryIdeas: "Limit near $3,300",
        stopLossIdea: "$3,400", // Invalid! Above Entry for LONG
        takeProfitIdea: "$3,600",
        support: 3200,
        resistance: 3500,
        invalidationLevel: 3150,
        coachNarrative: "Symbol: ETH/USD | Price: $3,300\n\nLong setup favored.",
      };

      const result = validateTradeAnalysis(analysis, tech);
      expect(result.isValid).toBe(false);
      expect(result.issues.some((i) => i.includes("Stop Loss Violation (LONG)"))).toBe(true);
    });

    it("rejects SHORT setup when Stop Loss is below Entry", () => {
      const tech: TradeTelemetryContext = {
        symbol: "SOL/USD",
        timeframe: "15m",
        currentPrice: 180,
        support: 170,
        resistance: 190,
        invalidationLevel: 192,
        rsi: 42,
        macdValue: -2,
        macdSignal: -1,
        macdHistogram: -1,
        trend: "BEARISH",
        bias: "SELL/SHORT",
      };

      const analysis: AIAnalysisPayload = {
        bias: "SELL/SHORT",
        entryIdeas: "Entry at $180",
        stopLossIdea: "$175", // Invalid! Below Entry for SHORT
        takeProfitIdea: "$165",
        support: 170,
        resistance: 190,
        invalidationLevel: 192,
        coachNarrative: "Symbol: SOL/USD | Price: $180\n\nBearish breakdown favored.",
      };

      const result = validateTradeAnalysis(analysis, tech);
      expect(result.isValid).toBe(false);
      expect(result.issues.some((i) => i.includes("Stop Loss Violation (SHORT)"))).toBe(true);
    });
  });

  describe("FIX 3 — Support / Resistance Bounds", () => {
    it("rejects structure where Support >= Resistance", () => {
      const tech: TradeTelemetryContext = {
        symbol: "EUR/USD",
        timeframe: "1D",
        currentPrice: 1.085,
        support: 1.090, // Invalid!
        resistance: 1.080,
        invalidationLevel: 1.095,
        rsi: 50,
        macdValue: 0,
        macdSignal: 0,
        macdHistogram: 0,
        trend: "SIDEWAYS",
        bias: "NEUTRAL",
      };

      const analysis: AIAnalysisPayload = {
        support: 1.090,
        resistance: 1.080,
        invalidationLevel: 1.095,
        bias: "NEUTRAL",
        coachNarrative: "Symbol: EUR/USD | Price: $1.085\n\nRanging structure.",
      };

      const result = validateTradeAnalysis(analysis, tech);
      expect(result.isValid).toBe(false);
      expect(result.issues.some((i) => i.includes("Support ($1.09) cannot be greater than or equal to Resistance"))).toBe(true);
    });
  });

  describe("FIX 4 — Dynamic Risk Engine", () => {
    it("increases risk score when indicator conflict and volatility spike exist", () => {
      const tech: TradeTelemetryContext = {
        symbol: "XAU/USD",
        timeframe: "1h",
        currentPrice: 2650,
        support: 2600,
        resistance: 2700,
        invalidationLevel: 2580,
        rsi: 38, // Conflict with Bullish trend
        macdValue: -15, // Conflict with Bullish trend
        macdSignal: -5,
        macdHistogram: -10,
        trend: "BULLISH",
        bias: "BUY/LONG",
        isVolatilitySpike: true,
        confidence: "LOW",
      };

      const riskRes = calculateDynamicRisk(tech);
      expect(riskRes.calculatedRisk).toBe("High");
      expect(riskRes.riskScore).toBeGreaterThan(60);
      expect(riskRes.factors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("FIX 6 — Entry Logic & R:R Ratio", () => {
    it("rejects trades with Risk:Reward < 1.5:1", () => {
      const tech: TradeTelemetryContext = {
        symbol: "NASDAQ",
        timeframe: "4h",
        currentPrice: 19800,
        support: 19500,
        resistance: 20000,
        invalidationLevel: 19400,
        rsi: 58,
        macdValue: 50,
        macdSignal: 30,
        macdHistogram: 20,
        trend: "BULLISH",
        bias: "BUY/LONG",
      };

      const analysis: AIAnalysisPayload = {
        bias: "BUY/LONG",
        entryIdeas: "Entry at $19,800",
        stopLossIdea: "$19,400", // Risk = 400
        takeProfitIdea: "$19,900", // Reward = 100 -> R:R = 0.25 (Below 1.5)
        support: 19500,
        resistance: 20000,
        invalidationLevel: 19400,
        coachNarrative: "Symbol: NASDAQ | Price: $19,800\n\nBullish continuation.",
      };

      const result = validateTradeAnalysis(analysis, tech);
      expect(result.isValid).toBe(false);
      expect(result.issues.some((i) => i.includes("Risk:Reward Violation"))).toBe(true);
    });
  });

  describe("FIX 7 & 8 — 100 Matrix Analysis Benchmark Across 6 Assets & 4 Timeframes", () => {
    it("runs 100+ scenario validation iterations and verifies pass rate metrics", () => {
      let totalRuns = 0;
      let validCount = 0;
      let invalidCount = 0;

      ASSETS.forEach((asset) => {
        TIMEFRAMES.forEach((tf) => {
          // Generate 5 scenarios per asset/timeframe pair = 6 * 4 * 5 = 120 total runs
          for (let scenarioIdx = 0; scenarioIdx < 5; scenarioIdx++) {
            totalRuns++;
            const basePrice = BASE_PRICES[asset] || 100;
            const isBullish = scenarioIdx % 2 === 0;

            const currentPrice = basePrice;
            let support: number;
            let resistance: number;
            let stopLoss: number;
            let takeProfit: number;
            let invalidation: number;

            if (isBullish) {
              support = currentPrice * 0.98;
              stopLoss = support * 0.99;
              invalidation = stopLoss;
              takeProfit = currentPrice + (currentPrice - stopLoss) * 2.0;
              resistance = takeProfit * 1.01;
            } else {
              resistance = currentPrice * 1.02;
              stopLoss = resistance * 1.01;
              invalidation = stopLoss;
              takeProfit = currentPrice - (stopLoss - currentPrice) * 2.0;
              support = takeProfit * 0.99;
            }

            const rsi = isBullish ? 58 : 42;
            const macdVal = isBullish ? 10 : -10;
            const macdSig = isBullish ? 5 : -5;
            const macdHist = macdVal - macdSig;

            const tech: TradeTelemetryContext = {
              symbol: asset,
              timeframe: tf,
              currentPrice,
              support,
              resistance,
              invalidationLevel: invalidation,
              rsi,
              macdValue: macdVal,
              macdSignal: macdSig,
              macdHistogram: macdHist,
              trend: isBullish ? "BULLISH" : "BEARISH",
              bias: isBullish ? "BUY/LONG" : "SELL/SHORT",
              confidence: "HIGH",
              volumeSurgeRatio: 1.2,
            };

            const analysis: AIAnalysisPayload = {
              bias: isBullish ? "BUY/LONG" : "SELL/SHORT",
              support,
              resistance,
              invalidationLevel: invalidation,
              rsi,
              riskLevel: "Low",
              confidence: "HIGH",
              entryIdeas: `Limit at $${currentPrice}`,
              stopLossIdea: `$${stopLoss}`,
              takeProfitIdea: `$${takeProfit}`,
              coachNarrative: `Analysis Source: TradCopilot Telemetry | Symbol: ${asset} | TF: ${tf} | Price: $${currentPrice}\n\nTechnical analysis shows ${asset} in a ${isBullish ? "bullish" : "bearish"} regime. MACD is ${isBullish ? "bullish" : "bearish"}. RSI is ${rsi.toFixed(1)}.`,
            };

            const valResult = validateTradeAnalysis(analysis, tech, { allowBreakoutStructure: true });
            if (valResult.isValid) {
              validCount++;
            } else {
              invalidCount++;
            }
          }
        });
      });

      expect(totalRuns).toBeGreaterThanOrEqual(100);
      expect(validCount).toBe(120);
      expect(invalidCount).toBe(0);

      console.log(`[TEST MATRIX REPORT] Total Runs: ${totalRuns} | Passed: ${validCount} | Failed: ${invalidCount} | Pass Rate: ${((validCount / totalRuns) * 100).toFixed(2)}%`);
    });
  });
});
