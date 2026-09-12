import { describe, it, expect } from "vitest";
import { normalizeSymbol, getOHLCV, isRegisteredSymbol } from "@/lib/market";
import { compileTechnicalContext } from "@/lib/indicators";
import { buildMarketContext } from "@/lib/market-context";
import { buildEvidence } from "@/lib/evidence-builder";
import { getAnalyzeChartSystemPrompt } from "@/lib/prompt-cache";
import { safeParseAIResponse } from "@/lib/ai-response-parser";
import { validateSetup } from "@/lib/trade-logic";
import { synthSetup } from "@/lib/trade-logic/setup-synthesis";
import { validateTradeAnalysis } from "@/lib/trade-validator";
import { getExchangeName } from "@/lib/market-registry";

describe("URGENT DEBUG — Pipeline Trace for BTC/USD 4h", () => {
  it("traces all stages of BTC/USD 4h analysis", async () => {
    // Stage 1: Symbol normalization
    const symbol = "BTC/USD";
    const timeframe = "4h";
    expect(isRegisteredSymbol(symbol)).toBe(true);
    const normalized = normalizeSymbol(symbol);
    expect(normalized).toBe("BTC/USD");
    const exchange = getExchangeName(symbol);
    console.log("[STAGE 1] Symbol:", symbol, "Normalized:", normalized, "Exchange:", exchange);

    // Stage 2: Market Data
    const candles = await getOHLCV(symbol, timeframe, 100);
    console.log("[STAGE 2] Candles fetched:", candles.length, "source:", candles[0]?.source);
    expect(candles.length).toBeGreaterThanOrEqual(50);
    expect(candles[0].open).toBeGreaterThan(0);
    expect(candles[candles.length - 1].close).toBeGreaterThan(0);

    // Stage 3: Technical context
    const tech = compileTechnicalContext(symbol, timeframe, candles);
    console.log("[STAGE 3] Indicators:", {
      currentPrice: tech.currentPrice,
      rsi: tech.rsi,
      macdValue: tech.macdValue,
      macdSignal: tech.macdSignal,
      support: tech.support,
      resistance: tech.resistance,
      invalidationLevel: tech.invalidationLevel,
      bias: tech.bias,
      trend: tech.trend,
      atr: tech.atr,
    });
    expect(tech.currentPrice).toBeGreaterThan(0);
    expect(tech.support).toBeGreaterThan(0);
    expect(tech.resistance).toBeGreaterThan(tech.support);

    // Stage 4: Market Context Engine
    const mktCtx = await buildMarketContext(
      symbol,
      timeframe,
      candles,
      {
        trend: tech.trend,
        volatilityPct: tech.volatility,
        isVolatilitySpike: tech.isVolatilitySpike,
        support: tech.support,
        resistance: tech.resistance,
        currentPrice: tech.currentPrice,
        rsi: tech.rsi,
        macdValue: tech.macdValue,
        macdSignal: tech.macdSignal,
        macdHistogram: tech.macdHistogram,
        atr: tech.atr,
      },
      async (s, tf, limit) => getOHLCV(s, tf, limit)
    );
    console.log("[STAGE 4] Market Context:", {
      regime: mktCtx.regime.regime,
      label: mktCtx.regime.label,
      mtf: mktCtx.mtf?.alignment,
    });

    // Stage 5: Evidence Builder
    const techBiasStr = String(tech.bias ?? "NEUTRAL").toUpperCase();
    const deterministicEvidence = buildEvidence(
      techBiasStr.includes("BUY") || techBiasStr.includes("LONG") || techBiasStr.includes("BULLISH")
        ? "LONG"
        : techBiasStr.includes("SELL") || techBiasStr.includes("SHORT") || techBiasStr.includes("BEARISH")
          ? "SHORT"
          : null,
      mktCtx,
      {
        rsi: tech.rsi,
        rsiLabel: tech.rsiLabel,
        macdValue: tech.macdValue,
        macdSignal: tech.macdSignal,
        macdHistogram: tech.macdHistogram,
        trend: tech.trend,
        emaCrossover: tech.emaCrossover,
        macdCrossover: tech.macdCrossover,
        liquiditySweep: tech.liquiditySweep,
        fakeBreakout: tech.fakeBreakout,
        volumeSurgeRatio: tech.volumeSurgeRatio,
        isVolatilitySpike: tech.isVolatilitySpike,
        lostVWAP: tech.lostVWAP,
        approachingKeyLevel: tech.approachingKeyLevel,
      }
    );
    console.log("[STAGE 5] Evidence:", {
      forCount: deterministicEvidence.for.length,
      againstCount: deterministicEvidence.against.length,
    });

    // Stage 6: AI Call
    const systemPrompt = getAnalyzeChartSystemPrompt();
    const userPrompt = `Conduct an elite chart analysis on ${symbol} on the ${timeframe} timeframe.
LIVE CHART TECHNICAL DATA:
- Symbol: ${symbol}
- Current Price: $${tech.currentPrice.toLocaleString()}
- Local Support: $${tech.support.toLocaleString()}
- Local Resistance: $${tech.resistance.toLocaleString()}
- Indicated Bias: ${tech.bias}
- RSI(14): ${tech.rsi.toFixed(2)} (${tech.rsiLabel})
- MACD Value: ${tech.macdValue.toFixed(4)}, Signal: ${tech.macdSignal.toFixed(4)}, Histogram: ${tech.macdHistogram.toFixed(4)}
- ATR (14): ${tech.atr.toFixed(4)}

MACD INTERPRETATION RULES:
- MACD Value (${tech.macdValue.toFixed(4)}) ${tech.macdValue >= tech.macdSignal ? ">=" : "<"} Signal (${tech.macdSignal.toFixed(4)}): Describe MACD as ${tech.macdValue >= tech.macdSignal ? "BULLISH" : "BEARISH"}.
- NEVER describe MACD as ${tech.macdValue >= tech.macdSignal ? "bearish" : "bullish"} when MACD ${tech.macdValue >= tech.macdSignal ? ">=" : "<"} Signal.

REQUIRED JSON RESPONSE SCHEMA:
{
  "marketRegime": "string",
  "bias": "BULLISH" | "BEARISH" | "NEUTRAL",
  "support": "${tech.support}",
  "resistance": "${tech.resistance}",
  "invalidationLevel": "${tech.invalidationLevel}",
  "setupQuality": "HIGH GRADE",
  "riskLevel": "Medium",
  "confidence": "HIGH",
  "whyItMatters": "string",
  "entryIdeas": "string",
  "stopLossIdea": "string",
  "takeProfitIdea": "string",
  "shortTermScenario": "string",
  "coachNarrative": "Analysis Source: TradCopilot Telemetry | Symbol: ${symbol} | Exchange: ${exchange} | TF: ${timeframe} | Price: $${tech.currentPrice.toLocaleString()} | Status: Synchronized\\n\\nDetailed narrative."
}`;

    console.log("[STAGE 6] Calling AI...");
    let raceResult: any = null;
    if (process.env.NVIDIA_API_KEY) {
      try {
        const resp = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
          },
          body: JSON.stringify({
            model: "meta/llama-3.2-11b-vision-instruct",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.25,
            max_tokens: 600,
          }),
        });
        const data = await resp.json();
        if (data?.choices?.[0]?.message?.content) {
          raceResult = {
            provider: "nvidia",
            model: "meta/llama-3.2-11b-vision-instruct",
            duration: 1000,
            content: data.choices[0].message.content,
          };
          console.log("[STAGE 6 SUCCESS] Provider:", raceResult.provider, "Model:", raceResult.model);
        }
      } catch (e: any) {
        console.warn("[STAGE 6] Live NVIDIA call failed, falling back to mock:", e.message);
      }
    }

    if (!raceResult) {
      console.log("[STAGE 6] Running with CI mock content (NVIDIA_API_KEY unset in CI runner)");
      raceResult = {
        provider: "mock",
        model: "mock-llama",
        duration: 10,
        content: JSON.stringify({
          marketRegime: "STRONG DOWNTREND",
          bias: "BEARISH",
          support: `${tech.support}`,
          resistance: `${tech.resistance}`,
          invalidationLevel: `${tech.invalidationLevel}`,
          setupQuality: "HIGH GRADE",
          riskLevel: "Medium",
          confidence: "HIGH",
          whyItMatters: "Macro trend is bearish with aligned momentum.",
          entryIdeas: `Short near $${tech.currentPrice}`,
          stopLossIdea: `${tech.resistance}`,
          takeProfitIdea: `${tech.support}`,
          shortTermScenario: "Downward pressure towards support.",
          coachNarrative: `Analysis Source: TradCopilot Telemetry | Symbol: ${symbol} | Exchange: ${exchange} | TF: ${timeframe} | Price: $${tech.currentPrice.toLocaleString()} | Status: Synchronized\n\n## Market Structure\nBearish trend holding below key resistance.\n\n## Momentum\nRSI is at ${tech.rsi.toFixed(2)}. MACD is ${tech.macdValue >= tech.macdSignal ? "bullish (signal line below)" : "bearish (signal line above)"}.\n\n## Key Levels\nSupport: $${tech.support} | Resistance: $${tech.resistance} | Invalidation: $${tech.invalidationLevel}\n\n## Trade Thesis\nShort bias favored while resistance holds.\n\n## Invalidation\nA close above $${tech.resistance} invalidates.\n\n## Risk Assessment\nStandard risk parameters.\n\n## Bottom Line\nWait for confirmation.`
        }),
      };
    }

    // Stage 7: Parse & Validate
    const techTelemetryData = {
      symbol,
      timeframe,
      currentPrice: tech.currentPrice,
      support: tech.support,
      resistance: tech.resistance,
      invalidationLevel: tech.invalidationLevel,
      rsi: tech.rsi,
      rsiLabel: tech.rsiLabel,
      bias: tech.bias,
      setupQuality: tech.setupQuality,
      confidence: tech.confidence,
      trend: tech.trend,
      sourceMetadata: tech.sourceMetadata,
      macdValue: tech.macdValue,
      macdSignal: tech.macdSignal,
      macdHistogram: tech.macdHistogram,
      volumeSurgeRatio: tech.volumeSurgeRatio,
      volatility: tech.volatility,
      isVolatilitySpike: tech.isVolatilitySpike,
      atr: tech.atr,
    };

    const parseResult = safeParseAIResponse(raceResult.content, techTelemetryData);
    console.log("[STAGE 7] ParseResult:", {
      schemaValid: parseResult.schemaValid,
      jsonParseSuccess: parseResult.jsonParseSuccess,
      rejectionReason: parseResult.rejectionReason,
      validationIssues: parseResult.validationResult?.issues,
      validationIsValid: parseResult.validationResult?.isValid,
    });

    // Stage 8: Setup Synthesis & Validation
    const synth = synthSetup(parseResult.parsed, techTelemetryData);
    console.log("[STAGE 8] synthSetup:", synth);

    const setupResult = validateSetup(parseResult.parsed, techTelemetryData);
    console.log("[STAGE 8] validateSetup:", {
      isValid: setupResult.isValid,
      issues: setupResult.issues,
      repairs: setupResult.repairs,
    });

    // Test re-running validateTradeAnalysis on the synthesized data
    const updatedParsed = {
      ...parseResult.parsed,
      entryIdeas: `Limit near $${setupResult.setup!.entry.toLocaleString(undefined, { maximumFractionDigits: 2 })}.`,
      stopLossIdea: setupResult.setup!.stopLoss.toString(),
      takeProfitIdea: setupResult.setup!.target.toString(),
      invalidationLevel: setupResult.setup!.invalidation,
    };
    const reval = validateTradeAnalysis(updatedParsed, {
      ...techTelemetryData,
      invalidationLevel: setupResult.setup!.invalidation,
    });
    console.log("[STAGE 9] Re-validation of synthesized setup:", {
      isValid: reval.isValid,
      issues: reval.issues,
    });
  }, 60000);
});
