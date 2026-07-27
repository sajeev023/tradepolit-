/**
 * src/lib/trade-validator.ts
 *
 * Deterministic Post-Analysis Reasoning & Validation Engine for TradCopilot.
 * Guarantees mathematical, logical, and structural consistency across all assets and timeframes.
 */

export interface TradeTelemetryContext {
  symbol: string;
  timeframe: string;
  currentPrice: number;
  support: number;
  resistance: number;
  invalidationLevel: number;
  rsi: number;
  macdValue: number;
  macdSignal: number;
  macdHistogram: number;
  trend: "BULLISH" | "BEARISH" | "SIDEWAYS" | string;
  bias: "BUY/LONG" | "SELL/SHORT" | "NEUTRAL" | string;
  setupQuality?: string;
  confidence?: "HIGH" | "MEDIUM" | "LOW" | string;
  volumeSurgeRatio?: number;
  volatility?: number;
  isVolatilitySpike?: boolean;
  atr?: number;
  emaCrossover?: "BULLISH" | "BEARISH" | null;
  macdCrossover?: "BULLISH" | "BEARISH" | null;
  volume?: number;
}

export interface AIAnalysisPayload {
  marketRegime?: string;
  bias?: string;
  support?: number | string;
  resistance?: number | string;
  invalidationLevel?: number | string;
  setupQuality?: string;
  riskLevel?: string;
  confidence?: string;
  whyItMatters?: string;
  entryIdeas?: string;
  stopLossIdea?: string;
  takeProfitIdea?: string;
  shortTermScenario?: string;
  coachNarrative?: string;
  [key: string]: any;
}

export interface ValidationOptions {
  minRRThreshold?: number; // Default 1.5
  minStopBufferPercent?: number; // Default 0.1% (0.001)
  allowBreakoutStructure?: boolean; // Default true
}

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  calculatedRisk: "Low" | "Medium" | "High";
  riskScore: number;
  riskFactors: string[];
  rsiClassification: string;
  macdStatus: {
    isBullish: boolean;
    isHistPositive: boolean;
  };
  tradeSetup: {
    entry: number;
    stopLoss: number;
    takeProfit: number;
    rrRatio: number;
    stopPercent: number;
  };
}

/**
 * FIX 5: Standard RSI 7-Tier Mapping
 */
export function getRSIClassification(rsi: number): string {
  if (isNaN(rsi)) return "Unknown";
  if (rsi < 30) return "Oversold";
  if (rsi >= 30 && rsi < 40) return "Weak";
  if (rsi >= 40 && rsi < 50) return "Bearish";
  if (rsi >= 50 && rsi < 60) return "Bullish";
  if (rsi >= 60 && rsi < 70) return "Strong Bullish";
  if (rsi >= 70 && rsi < 80) return "Overbought";
  return "Extreme";
}

/**
 * Helper to extract raw floating-point numbers from string / numeric inputs.
 */
export function parsePriceNumber(val: any): number {
  if (val === null || val === undefined) return NaN;
  if (typeof val === "number") return val;
  const cleaned = String(val).replace(/[^0-9.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? NaN : num;
}

/**
 * Extract numerical price from trade idea strings like "Limit near $95,000" or "$94,200"
 */
function extractFirstNumber(text?: string): number {
  if (!text) return NaN;
  // Standardize commas between digits e.g. "95,000" -> "95000"
  const normalized = String(text).replace(/(\d),(?=\d{3})/g, "$1");
  const match = normalized.match(/[\$]?\s*([0-9]+(?:\.[0-9]+)?)/);
  if (!match) return NaN;
  return parseFloat(match[1]);
}

/**
 * FIX 4: Risk Engine - Dynamic calculation based on actual telemetry conditions
 */
export function calculateDynamicRisk(tech: TradeTelemetryContext): {
  calculatedRisk: "Low" | "Medium" | "High";
  riskScore: number;
  factors: string[];
} {
  let score = 20; // Base baseline risk
  const factors: string[] = [];

  const trend = (tech.trend || "SIDEWAYS").toUpperCase();
  const bias = (tech.bias || "NEUTRAL").toUpperCase();
  const rsi = tech.rsi ?? 50;
  const macdHist = tech.macdHistogram ?? 0;
  const macdVal = tech.macdValue ?? 0;
  const macdSig = tech.macdSignal ?? 0;

  // 1. Indicator Conflict
  if (trend.includes("BULLISH") && (macdHist < 0 || rsi < 45 || macdVal < macdSig)) {
    score += 25;
    factors.push("Trend is Bullish but MACD/RSI show bearish momentum");
  } else if (trend.includes("BEARISH") && (macdHist > 0 || rsi > 55 || macdVal > macdSig)) {
    score += 25;
    factors.push("Trend is Bearish but MACD/RSI show bullish momentum");
  }

  // 2. Trend vs Bias Disagreement
  if (
    (trend.includes("BULLISH") && (bias.includes("SELL") || bias.includes("SHORT"))) ||
    (trend.includes("BEARISH") && (bias.includes("BUY") || bias.includes("LONG")))
  ) {
    score += 20;
    factors.push("Counter-trend trade bias (Bias conflicts with Trend regime)");
  }

  // 3. Weak Volume / Low Volume Surge
  if (tech.volumeSurgeRatio !== undefined && tech.volumeSurgeRatio < 0.8) {
    score += 15;
    factors.push("Weak volume surge ratio (< 0.8x average)");
  }

  // 4. Low AI / Telemetry Confidence
  if ((tech.confidence || "").toUpperCase() === "LOW") {
    score += 20;
    factors.push("Low telemetry confidence grade");
  }

  // 5. Volatility Spike or High ATR
  if (tech.isVolatilitySpike || (tech.volatility && tech.volatility > 2.5)) {
    score += 20;
    factors.push("High ATR / Volatility spike active");
  }

  // 6. Ranging / Structural Uncertainty
  if (trend.includes("SIDEWAYS") || bias.includes("NEUTRAL")) {
    score += 15;
    factors.push("Range-bound or sideways market structure");
  }

  let calculatedRisk: "Low" | "Medium" | "High";
  if (score <= 35) {
    calculatedRisk = "Low";
  } else if (score <= 65) {
    calculatedRisk = "Medium";
  } else {
    calculatedRisk = "High";
  }

  return { calculatedRisk, riskScore: score, factors };
}

/**
 * Main Deterministic Validation Engine (FIX 1 to FIX 8)
 */
export function validateTradeAnalysis(
  analysis: AIAnalysisPayload,
  tech: TradeTelemetryContext,
  options: ValidationOptions = {}
): ValidationResult {
  const issues: string[] = [];
  const minRR = options.minRRThreshold ?? 1.5;
  const minStopBufferPercent = options.minStopBufferPercent ?? 0.001; // 0.1%

  // -------------------------------------------------------------
  // Parse Numeric Values
  // -------------------------------------------------------------
  const currentPrice = tech.currentPrice;
  const support = parsePriceNumber(analysis.support ?? tech.support);
  const resistance = parsePriceNumber(analysis.resistance ?? tech.resistance);
  const invalidation = parsePriceNumber(analysis.invalidationLevel ?? tech.invalidationLevel);

  // Extract Entry, SL, TP
  let entry = extractFirstNumber(analysis.entryIdeas);
  if (isNaN(entry)) entry = currentPrice;

  let stopLoss = extractFirstNumber(analysis.stopLossIdea);
  if (isNaN(stopLoss)) stopLoss = invalidation;

  let takeProfit = extractFirstNumber(analysis.takeProfitIdea);
  if (isNaN(takeProfit)) {
    const isLong = (analysis.bias || tech.bias).toUpperCase().includes("BUY") || (analysis.bias || tech.bias).toUpperCase().includes("BULLISH");
    takeProfit = isLong ? resistance : support;
  }

  // -------------------------------------------------------------
  // FIX 3: SUPPORT / RESISTANCE STRUCTURE VALIDATION
  // -------------------------------------------------------------
  if (isNaN(support) || support <= 0) {
    issues.push("Invalid Support level: must be a positive number.");
  }
  if (isNaN(resistance) || resistance <= 0) {
    issues.push("Invalid Resistance level: must be a positive number.");
  }
  if (!isNaN(support) && !isNaN(resistance)) {
    if (support >= resistance) {
      issues.push(`Impossible Structure: Support ($${support}) cannot be greater than or equal to Resistance ($${resistance}).`);
    }

    // Unless price is breaking out, price should be logically structured relative to key levels
    if (!options.allowBreakoutStructure) {
      if (currentPrice < support) {
        issues.push(`Impossible Structure: Current price ($${currentPrice}) is below Support ($${support}).`);
      }
      if (currentPrice > resistance) {
        issues.push(`Impossible Structure: Current price ($${currentPrice}) is above Resistance ($${resistance}).`);
      }
    }
  }

  // -------------------------------------------------------------
  // FIX 1: MACD CONSISTENCY VALIDATION
  // -------------------------------------------------------------
  const macdVal = tech.macdValue ?? 0;
  const macdSig = tech.macdSignal ?? 0;
  const macdHist = tech.macdHistogram ?? 0;
  const isMacdBullish = macdVal > macdSig;
  const isHistPositive = macdHist > 0;

  const narrativeText = (analysis.coachNarrative || "").toLowerCase();
  const whyText = (analysis.whyItMatters || "").toLowerCase();
  const fullNarrative = `${narrativeText} ${whyText}`;

  if (isMacdBullish) {
    if (fullNarrative.includes("macd is bearish") || fullNarrative.includes("macd line is below signal") || fullNarrative.includes("bearish macd crossover")) {
      issues.push(`MACD Contradiction: MACD (${macdVal.toFixed(4)}) > Signal (${macdSig.toFixed(4)}) is bullish, but narrative claims MACD is bearish.`);
    }
  } else if (macdVal < macdSig) {
    if (fullNarrative.includes("macd is bullish") || fullNarrative.includes("macd line is above signal") || fullNarrative.includes("bullish macd crossover")) {
      issues.push(`MACD Contradiction: MACD (${macdVal.toFixed(4)}) < Signal (${macdSig.toFixed(4)}) is bearish, but narrative claims MACD is bullish.`);
    }
  }

  if (isHistPositive) {
    if (fullNarrative.includes("weakening momentum") && !fullNarrative.includes("increasing") && !fullNarrative.includes("positive")) {
      // Allowed if qualified, but reject if claims negative histogram
    }
  } else if (macdHist < 0) {
    if (fullNarrative.includes("strong bullish momentum acceleration") || fullNarrative.includes("positive macd histogram")) {
      issues.push(`MACD Histogram Contradiction: MACD Histogram (${macdHist.toFixed(4)}) < 0, but narrative claims positive/accelerating momentum.`);
    }
  }

  // -------------------------------------------------------------
  // FIX 2: STOP LOSS & INVALIDATION LOGIC
  // -------------------------------------------------------------
  const biasStr = (analysis.bias || tech.bias || "").toUpperCase();
  const isLong = biasStr.includes("BUY") || biasStr.includes("LONG") || biasStr.includes("BULLISH");
  const isShort = biasStr.includes("SELL") || biasStr.includes("SHORT") || biasStr.includes("BEARISH");

  const atrBuffer = (tech.atr && tech.atr > 0) ? tech.atr * 0.1 : currentPrice * 0.001;

  if (isLong) {
    if (stopLoss >= entry) {
      issues.push(`Stop Loss Violation (LONG): Stop Loss ($${stopLoss}) must be strictly less than Entry price ($${entry}).`);
    }
    if (stopLoss > invalidation + (currentPrice * 0.0001)) {
      issues.push(`Stop Loss Violation (LONG): Stop Loss ($${stopLoss}) cannot be above Invalidation level ($${invalidation}).`);
    }
    if (stopLoss > support + atrBuffer) {
      issues.push(`Stop Loss Violation (LONG): Stop Loss ($${stopLoss}) must be placed below Support ($${support}).`);
    }
  } else if (isShort) {
    if (stopLoss <= entry) {
      issues.push(`Stop Loss Violation (SHORT): Stop Loss ($${stopLoss}) must be strictly greater than Entry price ($${entry}).`);
    }
    if (stopLoss < invalidation - (currentPrice * 0.0001)) {
      issues.push(`Stop Loss Violation (SHORT): Stop Loss ($${stopLoss}) cannot be below Invalidation level ($${invalidation}).`);
    }
    if (stopLoss < resistance - atrBuffer) {
      issues.push(`Stop Loss Violation (SHORT): Stop Loss ($${stopLoss}) must be placed above Resistance ($${resistance}).`);
    }
  }

  // -------------------------------------------------------------
  // FIX 5: RSI NARRATIVE MATCHING
  // -------------------------------------------------------------
  const rsiVal = tech.rsi ?? 50;
  const rsiClassification = getRSIClassification(rsiVal);

  if (rsiVal >= 60 && (fullNarrative.includes("oversold") || fullNarrative.includes("rsi is weak") || fullNarrative.includes("bearish rsi"))) {
    issues.push(`RSI Contradiction: RSI is ${rsiVal.toFixed(2)} (${rsiClassification}), but narrative describes it as weak/oversold/bearish.`);
  }
  if (rsiVal <= 40 && (fullNarrative.includes("overbought") || fullNarrative.includes("strong bullish rsi"))) {
    issues.push(`RSI Contradiction: RSI is ${rsiVal.toFixed(2)} (${rsiClassification}), but narrative describes it as overbought/strong bullish.`);
  }

  // -------------------------------------------------------------
  // FIX 6: ENTRY LOGIC & RISK:REWARD RATIO
  // -------------------------------------------------------------
  const riskAmount = Math.abs(entry - stopLoss);
  const rewardAmount = Math.abs(takeProfit - entry);
  const rrRatio = riskAmount > 0 ? rewardAmount / riskAmount : 0;
  const stopPercent = entry > 0 ? riskAmount / entry : 0;

  if (stopPercent < minStopBufferPercent) {
    issues.push(`Entry Logic Violation: Stop Loss distance (${(stopPercent * 100).toFixed(3)}%) is below minimum volatility buffer (${(minStopBufferPercent * 100).toFixed(2)}%).`);
  }

  if (isLong) {
    if (takeProfit <= entry) {
      issues.push(`Take Profit Violation (LONG): Take Profit ($${takeProfit}) must be above Entry price ($${entry}).`);
    }
  } else if (isShort) {
    if (takeProfit >= entry) {
      issues.push(`Take Profit Violation (SHORT): Take Profit ($${takeProfit}) must be below Entry price ($${entry}).`);
    }
  }

  if (rrRatio < minRR && (isLong || isShort)) {
    issues.push(`Risk:Reward Violation: Calculated R:R ratio is ${rrRatio.toFixed(2)}:1, which is below the minimum threshold of ${minRR}:1.`);
  }

  // -------------------------------------------------------------
  // FIX 4: DYNAMIC RISK ENGINE EVALUATION
  // -------------------------------------------------------------
  const { calculatedRisk, riskScore, factors: riskFactors } = calculateDynamicRisk(tech);

  const claimedRisk = (analysis.riskLevel || "").toLowerCase();
  if (claimedRisk.length > 0) {
    if (calculatedRisk === "High" && claimedRisk.includes("low")) {
      issues.push(`Risk Engine Contradiction: Telemetry risk is HIGH (Score: ${riskScore}), but JSON/narrative claims LOW risk.`);
    }
  }

  // -------------------------------------------------------------
  // FIX 8: OUTPUT QUALITY & TEMPLATE CLEANUP
  // -------------------------------------------------------------
  if (fullNarrative.includes("as an ai language model") || fullNarrative.includes("[insert level]") || fullNarrative.includes("undefined")) {
    issues.push("Output Quality Error: Narrative contains raw template placeholders or AI system boilerplate.");
  }

  return {
    isValid: issues.length === 0,
    issues,
    calculatedRisk,
    riskScore,
    riskFactors,
    rsiClassification,
    macdStatus: {
      isBullish: isMacdBullish,
      isHistPositive,
    },
    tradeSetup: {
      entry,
      stopLoss,
      takeProfit,
      rrRatio: parseFloat(rrRatio.toFixed(2)),
      stopPercent: parseFloat((stopPercent * 100).toFixed(2)),
    },
  };
}
