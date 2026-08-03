/**
 * src/lib/ai-response-parser.ts
 *
 * Production-grade AI response parsing and repair engine for TradCopilot.
 *
 * GUARANTEES:
 *   1. Logs raw response content before parsing.
 *   2. Safely extracts content from both streaming (delta) and non-streaming choices.
 *   3. Strips markdown fences and extracts JSON blocks from prose.
 *   4. Auto-repairs truncated JSON (unclosed strings, unbalanced braces/brackets).
 *   5. Auto-populates missing schema fields with telemetry fallbacks.
 *   6. NEVER throws unhandled syntax errors or exposes "parsing failed" to end users.
 */

import { validateAnalysisConsistency } from "./indicators";
import { validateTradeAnalysis, ValidationResult, calculateDynamicRisk } from "./trade-validator";

export interface AIAnalysisSchema {
  marketRegime: string;
  bias: "BULLISH" | "BEARISH" | "NEUTRAL" | string;
  support: string | number;
  resistance: string | number;
  invalidationLevel: string | number;
  setupQuality: string;
  riskLevel: string;
  confidence: string;
  whyItMatters: string;
  entryIdeas?: string;
  stopLossIdea?: string;
  takeProfitIdea?: string;
  shortTermScenario?: string;
  coachNarrative: string;
  [key: string]: any;
}

/**
 * Safely extracts text content from an API response payload (supports streaming deltas and full choices).
 */
export function extractResponseContent(data: any): string | null {
  if (!data) return null;
  if (typeof data === "string") return data;

  // Single choice in OpenAI/NVIDIA/Groq completion format
  const choice = data?.choices?.[0];
  if (!choice) return null;

  // Standard non-streaming content
  if (typeof choice.message?.content === "string") {
    return choice.message.content;
  }

  // Streaming SSE delta content
  if (typeof choice.delta?.content === "string") {
    return choice.delta.content;
  }

  // Fallback text field
  if (typeof choice.text === "string") {
    return choice.text;
  }

  return null;
}

/**
 * Replaces unescaped control characters (newlines, tabs) inside JSON string literals.
 */
function escapeControlCharsInJSON(jsonStr: string): string {
  let result = "";
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];
    if (char === "\\" && !isEscaped) {
      isEscaped = true;
      result += char;
      continue;
    }

    if (char === '"' && !isEscaped) {
      inString = !inString;
      result += char;
    } else if (inString) {
      if (char === "\n") result += "\\n";
      else if (char === "\r") result += "\\r";
      else if (char === "\t") result += "\\t";
      else result += char;
    } else {
      result += char;
    }
    isEscaped = false;
  }

  return result;
}

/**
 * Attempts to repair truncated JSON strings by balancing quotes, brackets, and braces.
 */
function repairTruncatedJSON(jsonStr: string): string {
  let repaired = escapeControlCharsInJSON(jsonStr.trim());

  // Fix trailing comma before end of string or closing bracket/brace
  repaired = repaired.replace(/,\s*$/, "");

  // Balance unclosed double quotes
  let inString = false;
  let isEscaped = false;
  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i];
    if (char === "\\" && !isEscaped) {
      isEscaped = true;
      continue;
    }
    if (char === '"' && !isEscaped) {
      inString = !inString;
    }
    isEscaped = false;
  }

  // If we ended inside a string, close the quote
  if (inString) {
    repaired += '"';
  }

  // Remove trailing unclosed key/value pairs if incomplete
  repaired = repaired.replace(/,\s*"[^"]*"\s*:\s*$/, "");
  repaired = repaired.replace(/,\s*"[^"]*"$/, "");

  // Balance brackets and braces
  const stack: string[] = [];
  inString = false;
  isEscaped = false;

  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i];
    if (char === "\\" && !isEscaped) {
      isEscaped = true;
      continue;
    }
    if (char === '"' && !isEscaped) {
      inString = !inString;
    }
    if (!inString) {
      if (char === "{" || char === "[") {
        stack.push(char);
      } else if (char === "}") {
        if (stack.length > 0 && stack[stack.length - 1] === "{") stack.pop();
      } else if (char === "]") {
        if (stack.length > 0 && stack[stack.length - 1] === "[") stack.pop();
      }
    }
    isEscaped = false;
  }

  // Close remaining open structures in reverse order
  while (stack.length > 0) {
    const open = stack.pop();
    if (open === "{") repaired += "}";
    if (open === "[") repaired += "]";
  }

  return repaired;
}

/**
 * Cleans markdown code blocks and extracts JSON substring from prose.
 */
function cleanAndExtractJSON(raw: string): string {
  let text = escapeControlCharsInJSON(raw.trim());

  // Strip markdown fences
  if (text.startsWith("```json")) {
    text = text.substring(7);
  } else if (text.startsWith("```")) {
    text = text.substring(3);
  }
  if (text.endsWith("```")) {
    text = text.substring(0, text.length - 3);
  }
  text = text.trim();

  // If response contains surrounding prose, extract the first {...} block
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.substring(firstBrace, lastBrace + 1);
  } else if (firstBrace !== -1) {
    return text.substring(firstBrace);
  }

  return text;
}

/**
 * Robust JSON parser for AI responses. Guaranteed never to throw.
 * Returns a fully populated AIAnalysisSchema object.
 */
export interface SafeParseResult {
  parsed: AIAnalysisSchema;
  isRepaired: boolean;
  isFallback: boolean;
  jsonParseSuccess: boolean;
  schemaValid: boolean;
  rejectionReason?: string;
  validationResult?: ValidationResult;
}

export function safeParseAIResponse(
  rawContent: string,
  techTelemetry: {
    symbol: string;
    timeframe: string;
    currentPrice: number;
    support: number;
    resistance: number;
    invalidationLevel: number;
    rsi: number;
    rsiLabel: string;
    bias: string;
    setupQuality: string;
    confidence: string;
    trend: string;
    sourceMetadata: any;
    macdValue?: number;
    macdSignal?: number;
    macdHistogram?: number;
    volumeSurgeRatio?: number;
    volatility?: number;
    isVolatilitySpike?: boolean;
    atr?: number;
    // Deterministic server-side Stop Loss (=== invalidationLevel by
    // construction). When supplied it overrides the AI's stopLossIdea so the
    // displayed and validated stop can never contradict the invalidation.
    stopLoss?: number;
  }
): SafeParseResult {
  const symbol = techTelemetry.symbol;
  const timeframe = techTelemetry.timeframe;
  const priceStr = `$${techTelemetry.currentPrice.toLocaleString()}`;

  let jsonParseSuccess = false;
  let schemaValid = false;
  let rejectionReason: string | undefined = undefined;

  // Log raw AI response snippet
  console.log(
    `[AI PARSER] Raw response received (${rawContent ? rawContent.length : 0} chars): ` +
      `${rawContent ? rawContent.substring(0, 300).replace(/\n/g, " ") : "(empty)"}...`
  );

  if (!rawContent || rawContent.trim().length === 0) {
    rejectionReason = "EMPTY_AI_RESPONSE";
    console.warn(`[AI PARSER EVALUATION] Rejection Reason: ${rejectionReason}`);
    return {
      parsed: buildTelemetryFallback(techTelemetry),
      isRepaired: false,
      isFallback: true,
      jsonParseSuccess: false,
      schemaValid: false,
      rejectionReason,
    };
  }

  const cleaned = cleanAndExtractJSON(rawContent);
  let parsedObj: any = null;
  let isRepaired = false;

  // Attempt 1: Direct JSON.parse
  try {
    parsedObj = JSON.parse(cleaned);
    jsonParseSuccess = true;
  } catch (err1: any) {
    // Attempt 2: Auto-repair truncated JSON
    console.log(`[AI PARSER] Standard JSON.parse failed. Attempting truncated JSON repair...`);
    try {
      const repairedStr = repairTruncatedJSON(cleaned);
      parsedObj = JSON.parse(repairedStr);
      isRepaired = true;
      jsonParseSuccess = true;
      console.log(`[AI PARSER] Truncated JSON repair SUCCESSFUL.`);
    } catch (err2) {
      jsonParseSuccess = false;
      rejectionReason = `JSON_PARSE_FAILED: ${err1?.message || String(err1)}`;
      console.error(`[AI PARSER] JSON parse & repair failed. Error:`, err1);
    }
  }

  // If parsing failed completely, build structured fallback from telemetry
  if (!parsedObj || typeof parsedObj !== "object") {
    if (!rejectionReason) rejectionReason = "PARSED_JSON_NOT_AN_OBJECT";
    console.warn(`[AI PARSER EVALUATION] Rejection Reason: ${rejectionReason}`);
    return {
      parsed: buildTelemetryFallback(techTelemetry),
      isRepaired: false,
      isFallback: true,
      jsonParseSuccess: false,
      schemaValid: false,
      rejectionReason,
    };
  }

  // Enforce required schema fields & default fallbacks
  const headerLine = `Analysis Source: TradCopilot Telemetry | Symbol: ${symbol} | TF: ${timeframe} | Price: ${priceStr} | Status: Synchronized`;

  let coachNarrative = typeof parsedObj.coachNarrative === "string" ? parsedObj.coachNarrative.trim() : "";
  if (!coachNarrative.includes(`Symbol: ${symbol}`)) {
    coachNarrative = coachNarrative.replace(/^Analysis Source:[^\n]*\n?/, "");
    coachNarrative = `${headerLine}\n\n${coachNarrative.trim()}`;
  }

  // Dynamic Risk Engine Calculation
  const dynamicRisk = calculateDynamicRisk(techTelemetry as any);

  const finalParsed: AIAnalysisSchema = {
    marketRegime: parsedObj.marketRegime || `${techTelemetry.trend} Market Structure`,
    bias: parsedObj.bias || techTelemetry.bias,
    support: techTelemetry.support,
    resistance: techTelemetry.resistance,
    invalidationLevel: techTelemetry.invalidationLevel,
    rsi: techTelemetry.rsi,
    rsiLabel: techTelemetry.rsiLabel,
    setupQuality: parsedObj.setupQuality || techTelemetry.setupQuality,
    riskLevel: parsedObj.riskLevel || dynamicRisk.calculatedRisk,
    confidence: parsedObj.confidence || techTelemetry.confidence,
    whyItMatters:
      parsedObj.whyItMatters ||
      `${symbol} is trading in a ${techTelemetry.trend.toLowerCase()} regime on the ${timeframe} interval. RSI is ${techTelemetry.rsi.toFixed(1)} (${techTelemetry.rsiLabel}).`,
    entryIdeas: parsedObj.entryIdeas || `Limit entry near support level $${techTelemetry.support.toLocaleString()}`,
    stopLossIdea: (typeof techTelemetry.stopLoss === "number" && !isNaN(techTelemetry.stopLoss) && techTelemetry.stopLoss > 0)
      ? `$${techTelemetry.stopLoss.toLocaleString()}`
      : (parsedObj.stopLossIdea || `$${techTelemetry.invalidationLevel.toLocaleString()}`),
    takeProfitIdea: parsedObj.takeProfitIdea || `$${techTelemetry.resistance.toLocaleString()}`,
    shortTermScenario:
      parsedObj.shortTermScenario ||
      `Monitor key structural levels at $${techTelemetry.support.toLocaleString()} (support) and $${techTelemetry.resistance.toLocaleString()} (resistance).`,
    coachNarrative: coachNarrative,
  };

  const validationRes = validateTradeAnalysis(finalParsed, techTelemetry as any);

  if (!validationRes.isValid) {
    schemaValid = false;
    rejectionReason = `CONSISTENCY_CHECK_FAILED: ${validationRes.issues.join("; ")}`;
    console.warn(`[AI PARSER EVALUATION] ${rejectionReason}. Marking invalid.`);
    return {
      parsed: finalParsed,
      isRepaired,
      isFallback: false,
      jsonParseSuccess: true,
      schemaValid: false,
      rejectionReason,
      validationResult: validationRes,
    };
  }

  schemaValid = true;
  return {
    parsed: finalParsed,
    isRepaired,
    isFallback: false,
    jsonParseSuccess,
    schemaValid,
    rejectionReason: undefined,
    validationResult: validationRes,
  };
}

/**
 * Builds a structured analysis payload directly from backend telemetry if AI fails.
 */
function buildTelemetryFallback(tech: any): AIAnalysisSchema {
  const priceStr = `$${tech.currentPrice.toLocaleString()}`;
  const headerLine = `Analysis Source: TradCopilot Telemetry | Symbol: ${tech.symbol} | TF: ${tech.timeframe} | Price: ${priceStr} | Status: Synchronized`;

  const narrative = `${headerLine}

• Technical Structure: ${tech.symbol} is trading at ${priceStr} in a ${tech.trend.toLowerCase()} regime.
• Key Levels: Local support detected at $${tech.support.toLocaleString()} (swing-low detector) and resistance at $${tech.resistance.toLocaleString()} (swing-high detector).
• Invalidation: A ${tech.timeframe} close below $${tech.invalidationLevel.toLocaleString()} invalidates the bullish structure.
• Momentum: RSI(14) is at ${tech.rsi.toFixed(1)} (${tech.rsiLabel}).`;

  return {
    marketRegime: `${tech.trend} Market Structure`,
    bias: tech.bias,
    support: tech.support,
    resistance: tech.resistance,
    invalidationLevel: tech.invalidationLevel,
    setupQuality: tech.setupQuality,
    riskLevel: "Medium",
    confidence: tech.confidence,
    whyItMatters: `${tech.symbol} is currently holding structural support at $${tech.support.toLocaleString()} on the ${tech.timeframe} timeframe.`,
    entryIdeas: `Limit order near $${tech.support.toLocaleString()}`,
    stopLossIdea: `$${tech.invalidationLevel.toLocaleString()}`,
    takeProfitIdea: `$${tech.resistance.toLocaleString()}`,
    shortTermScenario: `Watching for price reaction at $${tech.support.toLocaleString()}.`,
    coachNarrative: narrative,
  };
}
