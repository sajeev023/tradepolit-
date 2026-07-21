import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth";
import { getOHLCV } from "@/lib/market";
import {
  compileTechnicalContext,
  validateAnalysisConsistency,
  getRSIInterpretation,
  appendTelemetryMetadata,
} from "@/lib/indicators";
import {
  successResponse,
  unauthorizedError,
  validationError,
  errorResponse,
  aiUnavailableError,
} from "@/lib/api-helpers";
import { checkUsageLimit, recordUsage, getCurrentUsage } from "@/lib/limit-checker";
import { getEntitlementForUser, getAnalysisLimitError } from "@/lib/entitlements";
import { callFastestModel } from "@/lib/nvidia-ai";
import { getAnalyzeChartSystemPrompt } from "@/lib/prompt-cache";
import { safeParseAIResponse } from "@/lib/ai-response-parser";
import { validateMarketData, validateIndicators, validateLevels, isDataFresh } from "@/lib/validate-market-data";
import { checkTokenBudget } from "@/lib/token-budget";

const telemetrySchema = z.object({
  symbol: z.string(),
  timeframe: z.string(),
  currentPrice: z.number(),
  lastCandleTime: z.string(),
  trend: z.enum(["BULLISH", "BEARISH", "SIDEWAYS"]),
  rsi: z.number(),
  rsiSentiment: z.enum(["OVERBOUGHT", "OVERSOLD", "NEUTRAL"]),
  rsiLabel: z.string(),
  macdValue: z.number(),
  macdSignal: z.number(),
  macdHistogram: z.number(),
  support: z.number(),
  resistance: z.number(),
  volatility: z.number(),
  isVolatilitySpike: z.boolean(),
  bias: z.enum(["BUY/LONG", "SELL/SHORT", "NEUTRAL"]),
  setupQuality: z.enum(["A+ SELECT", "HIGH GRADE", "B-GRADE", "NO SETUP"]),
  confidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
  entryPrice: z.number(),
  stopLoss: z.number(),
  takeProfit: z.number(),
  invalidationLevel: z.number(),
  atr: z.number(),
  volume: z.number().optional(),
  sourceMetadata: z.any().optional(),
  volumeSurgeRatio: z.number().optional(),
  lostVWAP: z.boolean().optional(),
  reclaimedVWAP: z.boolean().optional(),
  emaCrossover: z.enum(["BULLISH", "BEARISH"]).nullable().optional(),
  macdCrossover: z.enum(["BULLISH", "BEARISH"]).nullable().optional(),
  liquiditySweep: z.boolean().optional(),
  fakeBreakout: z.boolean().optional(),
  approachingKeyLevel: z.enum(["SUPPORT", "RESISTANCE"]).nullable().optional(),
  activeSession: z.enum(["LONDON", "NEWYORK", "ASIA"]).nullable().optional(),
});

const analyzeChartSchema = z.object({
  symbol: z.string().min(1, "Asset symbol is required"),
  timeframe: z.enum(["1m", "5m", "15m", "1h", "4h", "1d", "1W"]).default("1h"),
  bypassCache: z.boolean().optional(),
  telemetry: telemetrySchema.optional(),
  // WebSocket live price from client — overrides stale last-candle close in telemetry.
  // Accepted only if within 5% of telemetry.currentPrice to catch bad data.
  livePrice: z.number().positive().optional(),
});

// Allow up to 60s for AI model race — overrides Next.js default 10s timeout
export const maxDuration = 60;

function buildFallbackAnalysis(symbol: string, timeframe: string, tech: any, traderName = "Trader", behavioralCtx = "") {
  const price = tech.currentPrice || 0;
  const supportVal = tech.support || price * 0.97;
  const resistanceVal = tech.resistance || price * 1.03;
  const invalidationVal = tech.invalidationLevel || price * 0.96;

  const supportStr = supportVal.toLocaleString();
  const resistanceStr = resistanceVal.toLocaleString();

  const biasLabel = tech.bias || "NEUTRAL";
  const rsiVal = tech.rsi ?? 50;
  const rsiLbl = tech.rsiLabel || "Neutral";

  // Extract key behavioral flags for the narrative
  const overtradingNotice = behavioralCtx.includes("OVERTRADING") ? `\n\n⚠️ **Behavioral Alert:** ${traderName}, you're at risk of overtrading today. Consider this analysis a moment to pause and reflect, not a signal to enter.` : "";
  const revengeNotice = behavioralCtx.includes("Revenge Trading Detected: YES") ? `\n\n⚠️ **Behavioral Alert:** ${traderName}, I notice a revenge trading pattern in your recent history. After your last loss, you entered another trade within minutes. Take a 30-minute break before making any decisions.` : "";

  return {
    symbol,
    timeframe,
    cached: false,
    marketRegime: tech.trend ? `${tech.trend} momentum favored.` : `Range-bound structure on ${timeframe}.`,
    bias: biasLabel,
    support: supportVal,
    resistance: resistanceVal,
    invalidationLevel: invalidationVal,
    setupQuality: tech.setupQuality || "SPECULATIVE",
    riskLevel: "Medium",
    confidence: tech.confidence || "MEDIUM",
    whyItMatters: `Key local structure at $${supportStr} / $${resistanceStr} with ${rsiLbl.toLowerCase()} RSI.`,
    entryIdeas: price ? `Limit near support at $${supportStr}.` : "Awaiting telemetry synchronization...",
    stopLossIdea: invalidationVal ? invalidationVal.toString() : null,
    takeProfitIdea: resistanceVal ? resistanceVal.toString() : null,
    shortTermScenario: price ? `Price respecting support at $${supportStr} with momentum toward $${resistanceStr}.` : "Awaiting telemetry synchronization...",
    coachNarrative: `Analysis Source: TradePilot Telemetry (AI Offline) | Symbol: ${symbol} | Exchange: AUTO | TF: ${timeframe} | Price: $${price.toLocaleString()} | Status: Synchronized\n\n## Executive Summary\n${traderName}, ${symbol} is in a ${tech.trend || "neutral"} regime on the ${timeframe} timeframe. Price is at $${price.toLocaleString()}, with support at $${supportStr} and resistance at $${resistanceStr}.${overtradingNotice}${revengeNotice}\n\n## Market Structure\nTechnical indicators show ${symbol} in a ${tech.trend || "neutral"} regime. ${price > supportVal * 1.01 ? "Price is holding above key support, suggesting buyers are still in control." : "Price is near support — this is a decision zone."}\n\n## Momentum Analysis\nRSI(14) at ${rsiVal.toFixed(2)} (${rsiLbl}). ${rsiVal >= 70 ? "Overbought — caution on longs." : rsiVal <= 30 ? "Oversold — watch for reversal." : "Momentum neutral to directional."} ${tech.macdValue > tech.macdSignal ? "MACD is bullish (signal line above)." : "MACD is bearish (signal line below)."}\n\n## Key Levels\nSupport: $${supportStr} | Resistance: $${resistanceStr} | Invalidation: $${invalidationVal.toLocaleString()}\n\n## Trade Thesis\n${biasLabel} bias favored while support at $${supportStr} holds. ${tech.setupQuality === "A+ SELECT" ? "This is a high-conviction setup — clear levels, aligned momentum." : tech.setupQuality === "HIGH GRADE" ? "Decent setup with manageable risk." : "Enter only if you have a specific catalyst or additional confluence."}\n\n## Risk Assessment\nVolatility: ${tech.volatility ? tech.volatility.toFixed(2) + "%" : "normal"}. Position size accordingly. Risk from current price to invalidation is ${price > 0 && invalidationVal > 0 ? `$${Math.abs(price - invalidationVal).toFixed(2)}` : "standard"}.\n\n## Invalidation\nA close below $${invalidationVal.toLocaleString()} invalidates the thesis.\n\n## Bottom Line\n${price > supportVal * 1.02 ? "WAIT for a pullback to support or a confirmed breakout above resistance before entering." : "HOLDING support — watch for confirmation before committing capital."}`,
    indicators: {
      rsi: rsiVal,
      rsiLabel: rsiLbl,
      macd: { macd: tech.macdValue || 0, signal: tech.macdSignal || 0 },
    },
    levels: {
      support: supportVal,
      resistance: resistanceVal,
      invalidation: invalidationVal,
    },
    sourceMetadata: {
      symbolSource: `User selection (${symbol})`,
      timeframeSource: `Chart interval (${timeframe})`,
      priceSource: price ? `Binance spot ($${price.toLocaleString()})` : "N/A",
      rsiSource: `RSI(14) from close prices (${rsiVal.toFixed(2)})`,
      supportSource: "Swing-low detector",
      resistanceSource: "Swing-high detector",
      aiModelSource: "Fallback — technical indicators (AI offline)",
    },
    _aiFallback: true,
  };
}

export async function POST(request: NextRequest) {
  const t0 = Date.now();
  console.log(`[STEP 1: Request received] [0ms]`);
  let reservedUserId: string | null = null;

  const releaseReservation = async () => {
    if (reservedUserId) {
      await prisma.user.update({
        where: { id: reservedUserId },
        data: { analysesCountToday: { decrement: 1 } },
      }).catch(() => {});
      reservedUserId = null;
    }
  };

  try {
    const json = await request.json();
    const validation = analyzeChartSchema.safeParse(json);
    if (!validation.success) {
      return validationError(validation.error);
    }

    const { symbol, timeframe, bypassCache, telemetry, livePrice } = validation.data;

    const getExchangeForSymbol = (sym: string): string => {
      if (["BTC/USD", "ETH/USD", "SOL/USD"].includes(sym)) return "BINANCE";
      if (["EUR/USD", "GBP/USD", "USD/JPY"].includes(sym)) return "FX";
      if (sym === "XAU/USD") return "OANDA";
      if (sym === "NASDAQ") return "NASDAQ";
      if (sym === "S&P500") return "FOREXCOM";
      return "BINANCE";
    };
    const exchangeName = getExchangeForSymbol(symbol);

    // Check user auth first
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();
    console.log(`[STEP 2: Environment loaded] authUser=${user.id} | NVIDIA_KEY=${!!process.env.NVIDIA_API_KEY} | GROQ_KEY=${!!process.env.GROQ_API_KEY}`);

    // ─── STEP 2b: Load behavioral context for personalized analysis ──────
    let userName = "Trader";
    let behavioralContext = "";
    try {
      const settled = await Promise.allSettled([
        prisma.user.findUnique({ where: { id: user.id }, select: { displayName: true, email: true } }),
        prisma.trade.findMany({ where: { userId: user.id }, orderBy: { openedAt: "desc" }, take: 20 }),
        prisma.journalEntry.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
        prisma.behavioralEvent.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 10 }),
        prisma.userProfile.findUnique({ where: { userId: user.id } }),
      ]);
      const [dbUser, rawTrades, journalEntries, behavioralEvents, userProfile] = settled.map(r => r.status === "fulfilled" ? r.value : null);
      const userTrades = rawTrades || [];

      if (dbUser) {
        const rawName = dbUser.displayName || (dbUser.email ? dbUser.email.split("@")[0].replace(/[._-]/g, " ") : "Trader");
        userName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
      }

      const closedTrades = userTrades.filter((t: any) => t.status === "CLOSED");
      const openTrades = userTrades.filter((t: any) => t.status === "OPEN");
      const winningTrades = closedTrades.filter((t: any) => Number(t.pnl) > 0);
      const losingTrades = closedTrades.filter((t: any) => Number(t.pnl) < 0);
      const avgWin = winningTrades.length ? winningTrades.reduce((a: number, t: any) => a + Number(t.pnl), 0) / winningTrades.length : 0;
      const avgLoss = losingTrades.length ? losingTrades.reduce((a: number, t: any) => a + Math.abs(Number(t.pnl)), 0) / losingTrades.length : 0;

      const today = new Date();
      const tradesToday = userTrades.filter((t: any) => {
        const d = new Date(t.openedAt);
        return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
      }).length;

      let revengeDetected = false;
      for (let i = 0; i < userTrades.length - 1; i++) {
        const cur = userTrades[i];
        const prev = userTrades[i + 1];
        if (prev.status === "CLOSED" && Number(prev.pnl) < 0) {
          const diff = new Date(cur.openedAt).getTime() - new Date(prev.closedAt!).getTime();
          if (diff > 0 && diff < 30 * 60 * 1000) { revengeDetected = true; break; }
        }
      }

      const recentMistakes = closedTrades.slice(0, 5).flatMap((t: any) => (t.mistakeTags || []) as string[]);
      const topMistakes = [...new Set(recentMistakes)].slice(0, 3).join(", ");

      const profile = userProfile || { accountSize: 10000, maxRiskPercent: 1.0, preferredRR: 2.0, maxDrawdown: 10.0 };
      const recentJournalEntries = journalEntries.slice(0, 3).map((j: any) => `- [${new Date(j.createdAt).toLocaleDateString()}] Mood:${j.mood || "NEUTRAL"} | "${j.title}"`).join("\n");
      const recentEventsStr = behavioralEvents.slice(0, 5).map((e: any) => `- ${e.eventType}: ${e.description}`).join("\n");

      behavioralContext = `
TRADER IDENTITY:
- Name: ${userName}
- Account Size: $${(profile as any).accountSize?.toString() || "10,000"}
- Max Risk Per Trade: ${(profile as any).maxRiskPercent?.toString() || "1.0"}%
- Trades Today: ${tradesToday}${tradesToday > 5 ? " ⚠️ OVERTRADING" : ""}
- Recent Mistakes: ${topMistakes || "None recorded"}
- Win Rate: ${closedTrades.length ? ((winningTrades.length / closedTrades.length) * 100).toFixed(0) + "%" : "No closed trades"}
- Revenge Trading Detected: ${revengeDetected ? "YES ⚠️" : "No"}

RECENT BEHAVIORAL EVENTS:
${recentEventsStr || "None recorded"}

RECENT JOURNAL ENTRIES:
${recentJournalEntries || "None recorded"}

RECENT CLOSED TRADES:
${closedTrades.slice(0, 5).map((t: any) => {
  const d = new Date(t.openedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `- ${d} | ${t.instrument} ${t.direction} | PnL: $${Number(t.pnl).toFixed(2)} | ${t.emotionTag || "NEUTRAL"} | ${(t.mistakeTags || []).join(", ") || "No tags"}`;
}).join("\n") || "No closed trades yet"}

ACTIVE OPEN POSITIONS:
${openTrades.length === 0 ? "None" : openTrades.map((t: any) => `- ${t.instrument} ${t.direction} | Entry: $${t.entryPrice}`).join("\n")}

COACHING MANDATE:
- You MUST address ${userName} by name throughout the analysis.
- If behavioral red flags exist (overtrading, revenge, repeated mistakes), call them out BEFORE discussing the chart.
- ${userName} needs to see that you know their personal trading patterns.
- Cite specific trades, dates, and dollar amounts from the data above.
- If this is analysis-only (no coaching question), still include a brief behavioral check at the end.`;
    } catch (ctxErr) {
      console.warn("[ANALYZE-CHART] Behavioral context fetch failed:", ctxErr);
      behavioralContext = "\nTRADER IDENTITY:\n- Name: Valued Trader\n- Note: Behavioral data temporarily unavailable.\n";
    }

    let tech: any;
    let lastCandleTime: string;
    let candles: any[] = [];

    if (telemetry) {
      console.log(`[STEP 3 & 4: Telemetry supplied by client] Bypassing independent OHLCV fetches. price=${telemetry.currentPrice}`);
      // Assert symbol and timeframe match
      if (telemetry.symbol !== symbol || telemetry.timeframe !== timeframe) {
        return errorResponse("VALIDATION_ERROR", "Telemetry symbol or timeframe mismatch", 400);
      }
      tech = telemetry;
      lastCandleTime = telemetry.lastCandleTime;
      console.log(`[STEP 5 & 6: Indicators/Support loaded from client telemetry]`);
    } else {
      // Fetch candles (OHLC fetch)
      console.log(`[STEP 3: Market API response] Fetching candles for ${symbol} ${timeframe}`);
      const fetchedCandles = await getOHLCV(symbol, timeframe, 100);
      if (fetchedCandles.length === 0) {
        return errorResponse("INTERNAL_ERROR", "No historical data available for selected asset", 500);
      }
      candles = fetchedCandles;
      console.log(`[STEP 4: OHLCV fetched] candleCount=${candles.length} | lastPrice=${candles[candles.length - 1]?.close}`);

      const lastCandle = candles[candles.length - 1];
      lastCandleTime = lastCandle ? new Date(lastCandle.timestamp).toISOString() : new Date().toISOString();

      // Verify data freshness
      const lastCandleTimestamp = lastCandle ? lastCandle.timestamp : Date.now();
      isDataFresh(lastCandleTimestamp, timeframe);

      // Compile Technical Context (Market data compilation)
      tech = compileTechnicalContext(symbol, timeframe, candles);
      validateAnalysisConsistency(tech);
      console.log(`[STEP 5: Indicators calculated] RSI=${tech.rsi.toFixed(2)} | MACD=${tech.macdValue.toFixed(4)}`);
      console.log(`[STEP 6: Support calculated] Support=$${tech.support} | Resistance=$${tech.resistance} | Invalidation=$${tech.invalidationLevel}`);
    }

    // ── Live Price Override ────────────────────────────────────────────────────
    // The client sends the Binance WebSocket price (sub-100ms latency).
    // The telemetry currentPrice is derived from the last closed candle (up to
    // 60s stale on 1h timeframe). We override with the live WebSocket price
    // if it is within 5% of the candle price (sanity guard against bad data).
    if (livePrice && livePrice > 0 && tech.currentPrice > 0) {
      const deviation = Math.abs(livePrice - tech.currentPrice) / tech.currentPrice;
      if (deviation <= 0.05) {
        console.log(
          `[LIVE PRICE OVERRIDE] Replacing stale candle price $${tech.currentPrice.toFixed(4)} ` +
          `with live WebSocket price $${livePrice.toFixed(4)} ` +
          `(deviation: ${(deviation * 100).toFixed(4)}%)`
        );
        tech = { ...tech, currentPrice: livePrice };
      } else {
        console.warn(
          `[LIVE PRICE OVERRIDE REJECTED] Deviation ${(deviation * 100).toFixed(2)}% exceeds 5% threshold. ` +
          `livePrice=$${livePrice} candle=$${tech.currentPrice} — keeping candle price.`
        );
      }
    }

    // VALIDATION: Reject if price, indicators, or pivot levels are incomplete/NaN
    const dataErrors: string[] = [];

    // Run structural validator functions
    if (!telemetry) {
      const marketErrors = validateMarketData({
        symbol,
        currentPrice: tech.currentPrice,
        ohlcv: candles
      }, symbol, timeframe);
      dataErrors.push(...marketErrors);
    }

    const indicatorErrors = validateIndicators({
      rsi: tech.rsi,
      macd: { macd: tech.macdValue, signal: tech.macdSignal },
      ema9: tech.currentPrice,
      ema21: tech.currentPrice,
      atr: tech.atr
    });
    dataErrors.push(...indicatorErrors);

    const levelErrors = validateLevels({
      support: tech.support,
      resistance: tech.resistance
    }, tech.currentPrice);
    dataErrors.push(...levelErrors);

    if (!tech.currentPrice || isNaN(tech.currentPrice) || tech.currentPrice <= 0) {
      dataErrors.push("Market data not ready — price is invalid or N/A");
    }
    if (tech.rsi === undefined || isNaN(tech.rsi)) {
      dataErrors.push("Indicators not ready — RSI is NaN");
    }
    if (!tech.support || isNaN(tech.support) || tech.support <= 0) {
      dataErrors.push("Levels not ready — support level is NaN");
    }
    if (!tech.resistance || isNaN(tech.resistance) || tech.resistance <= 0) {
      dataErrors.push("Levels not ready — resistance level is NaN");
    }

    if (dataErrors.length > 0) {
      console.error(`[ANALYSIS REJECTED] Telemetry validation failed for ${symbol} ${timeframe}:`, dataErrors);
      return errorResponse(
        "UPSTREAM_UNAVAILABLE",
        "Market telemetry is still synchronizing. Please wait for indicator pipeline to finish.",
        503
      );
    }

    // Cache lookup: check if user or system pre-warm cache is available for instant response
    if (!bypassCache) {
      let cachedRecord = await prisma.conversationMemory.findFirst({
        where: {
          userId: user.id,
          role: "cached_analysis",
          chatId: `${symbol}-${timeframe}`,
        }
      });

      // Fallback to system pre-warm cache if user hasn't analyzed this asset before
      if (!cachedRecord) {
        cachedRecord = await prisma.conversationMemory.findFirst({
          where: {
            role: "cached_analysis",
            chatId: `${symbol}-${timeframe}`,
          }
        });
      }

      if (cachedRecord) {
        try {
          const cachedData = JSON.parse(cachedRecord.content);
          let analysis = cachedData;
          let isCacheValid = false;

          if (cachedData.analysis && cachedData.analyzedAt && cachedData.analyzedPrice) {
            analysis = cachedData.analysis;
            const analyzedAt = new Date(cachedData.analyzedAt).getTime();
            const ageMs = Date.now() - analyzedAt;
            const ageThresholdMs = 15 * 60 * 1000; // 15 minutes window for instant UX
            
            const priceDiffPercent = Math.abs(tech.currentPrice - cachedData.analyzedPrice) / cachedData.analyzedPrice;
            const priceThresholdPercent = 0.005; // 0.5% price variance window (replaces 2%)
            
            isCacheValid = ageMs < ageThresholdMs && priceDiffPercent < priceThresholdPercent;
          } else {
            isCacheValid = false; // Legacy/un-timestamped entries are invalid
          }
          if (isCacheValid) {
            console.log(`[STEP 11: Response returned] INSTANT CACHE HIT | duration=${Date.now() - t0}ms`);

            let narrative = analysis.coachNarrative || "";
            const expectedHeader = `Symbol: ${symbol}`;
            if (!narrative.includes(expectedHeader)) {
              const headerLine = `Analysis Source: TradePilot Telemetry | Symbol: ${symbol} | Exchange: ${exchangeName} | TF: ${timeframe} | Price: $${tech.currentPrice.toLocaleString()} | Status: Synchronized`;
              narrative = narrative.replace(/^Analysis Source:[^\n]*\n?/, "");
              narrative = `${headerLine}\n\n${narrative.trim()}`;
            }

            // Append metadata block
            narrative = appendTelemetryMetadata(
              narrative,
              cachedData.analyzedAt,
              cachedData.lastCandleTime || new Date().toISOString(),
              cachedData.analyzedPrice,
              tech.currentPrice,
              exchangeName
            );

            return successResponse({
              ...analysis,
              symbol,
              timeframe,
              coachNarrative: narrative,
              support: tech.support,
              resistance: tech.resistance,
              invalidationLevel: tech.invalidationLevel,
              rsi: tech.rsi,
              rsiLabel: tech.rsiLabel,
              currentPrice: tech.currentPrice,
              sourceMetadata: tech.sourceMetadata,
              cached: true,
            });
          }
        } catch (parseErr) {
          console.warn("Failed to parse cached analysis JSON", parseErr);
        }
      }
    }
    
    // Reserve one analysis slot atomically (race-condition safe)
    // The slot is reserved BEFORE the AI call to prevent exceeding the limit
    // If the AI call fails, the slot is released
    const usageReserved = await recordUsage(user.id, "analyses", user.email);
    if (!usageReserved) {
      const limitResult = await checkUsageLimit(user.id, "analyses", user.email);
      const entitlement = getEntitlementForUser(user.id, user.email);
      const limitError = getAnalysisLimitError(entitlement, limitResult.analysesUsed);
      return errorResponse(limitError.error as any, limitError.message, 403, {
        cta: limitError.cta,
        ctaLink: limitError.ctaLink,
      });
    }
    reservedUserId = user.id;

    // 3. Formulate Prompts
    const systemPrompt = getAnalyzeChartSystemPrompt();

    const budget = checkTokenBudget("chart analysis", systemPrompt, [], "FREE");
    if (!budget.isWithinLimit) {
      return successResponse({
        ...buildFallbackAnalysis(symbol, timeframe, tech, userName, behavioralContext),
        budget,
        _aiSkipped: true,
      });
    }

    const userPrompt = `Conduct an elite chart analysis on ${symbol} on the ${timeframe} timeframe.

LIVE CHART TECHNICAL DATA (from real-time exchange telemetry — use as primary data source):
- Symbol: ${symbol}
- Exchange: ${exchangeName}
- Timeframe: ${timeframe}
- Telemetry Status: CONNECTED
- Current Price: $${tech.currentPrice.toLocaleString()}
- Volume: ${tech.volume.toLocaleString()}
- ATR (14): ${tech.atr.toFixed(4)}
- Trend Regime: ${tech.trend}
- RSI(14): ${tech.rsi.toFixed(2)} (${tech.rsiLabel})
- MACD Value: ${tech.macdValue.toFixed(4)}, Signal: ${tech.macdSignal.toFixed(4)}, Histogram: ${tech.macdHistogram.toFixed(4)}
- Local Support: $${tech.support.toLocaleString()}
- Local Resistance: $${tech.resistance.toLocaleString()}
- Volatility: ${tech.volatility.toFixed(2)}% (Spike: ${tech.isVolatilitySpike})
- Indicated Bias: ${tech.bias}
- Setup Grade: ${tech.setupQuality}
- Calculated Confidence: ${tech.confidence}
- Volume Surge: ${tech.volumeSurgeRatio.toFixed(2)}x
- Lost VWAP: ${tech.lostVWAP}
- EMA Cross: ${tech.emaCrossover || "None"}
- MACD Cross: ${tech.macdCrossover || "None"}
- Liquidity Sweep: ${tech.liquiditySweep}
- Fake Breakout: ${tech.fakeBreakout}
- Active Session: ${tech.activeSession || "None"}

TRADER BEHAVIORAL CONTEXT (Use this to personalize the analysis):
${behavioralContext}

RSI INTERPRETATION RULES (Follow EXACTLY):
- RSI < 30: "Oversold — potential bounce zone"
- RSI 30-40: "Weak — approaching oversold"
- RSI 40-50: "Bearish momentum — below neutral"
- RSI 50-60: "Bullish momentum — above neutral"
- RSI 60-70: "Strong bullish momentum"
- RSI 70-80: "Overbought — strong momentum, tighten stops"
- RSI >= 80: "Extremely overbought — reversal likely"
- NEVER state "neutral" when RSI > 60.

TELEMETRY USAGE RULE:
- You HAVE live real-time market data. The LIVE CHART TECHNICAL DATA above is from the exchange feed.
- Never say "I don't have real-time market data" or "I cannot see the chart."
- If asked about live data, respond with the current price and indicators from the data above.
- Tag every specific data point with [CONFIRMED] (from telemetry), [ESTIMATED] (calculated), or [UNVERIFIED] (historical knowledge — avoid).
- If unsure about a historical price or date, respond "VERIFICATION NEEDED" rather than guessing.

LEVEL TRACEABILITY MANDATE:
- Support & Resistance MUST come from the swing-low and swing-high detector.
- Cite support as $${tech.support.toLocaleString()} and resistance as $${tech.resistance.toLocaleString()}.

REQUIRED JSON RESPONSE SCHEMA:
{
  "marketRegime": "string (e.g. Bullish Trend / Range-bound)",
  "bias": "BULLISH" | "BEARISH" | "NEUTRAL",
  "support": "${tech.support}",
  "resistance": "${tech.resistance}",
  "invalidationLevel": "${tech.invalidationLevel}",
  "setupQuality": "A+ SET UP" | "HIGH GRADE" | "SPECULATIVE" | "NO TRADE ZONE",
  "riskLevel": "Low" | "Medium" | "High",
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "whyItMatters": "string (1-2 sentences)",
  "entryIdeas": "string",
  "stopLossIdea": "string",
  "takeProfitIdea": "string",
  "shortTermScenario": "string",
  "coachNarrative": "Analysis Source: TradePilot Telemetry | Symbol: ${symbol} | Exchange: ${exchangeName} | TF: ${timeframe} | Price: $${tech.currentPrice.toLocaleString()} | Status: Synchronized\\n\\n## Market Structure\\n[Provide institutional discretionary analysis of structure]\\n\\n## Momentum\\n[Synthesize RSI, MACD, volume, and trend together - no indicator lists]\\n\\n## Key Levels\\n[Explain importance of support/resistance pivots]\\n\\n## Trade Thesis\\n[Step-by-step thesis with telemetry backup]\\n\\n## Invalidation\\n[Exact structural invalidation close event]\\n\\n## Risk Assessment\\n[Detail uncertainties, conflicting signals, volatility risk]\\n\\n## Bottom Line\\n[Concise firm-level summary of highest probability path]"
}`;
    console.log(`[STEP 7: Prompt generated] userPromptLength=${userPrompt.length}B`);

    // 4. Multi-model race
    console.log(`[STEP 8: NVIDIA request sent] Dispatching AI race...`);
    let raceResult;
    const raceStart = Date.now();
    try {
      raceResult = await Promise.race([
        callFastestModel([
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ], {
          temperature: 0.25,
          maxTokens: 600,
        }),
        new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error("AI analysis timed out after 55s")), 55000)
        ),
      ]);
      console.log(`[STEP 9: AI response received] Provider=${raceResult.provider.toUpperCase()} Model=${raceResult.model} in ${Date.now() - raceStart}ms`);
    } catch (raceErr: any) {
      console.error(`[STEP 9 FAILED] Race error | duration=${Date.now() - raceStart}ms | err=${raceErr?.message}`);

      // Fallback: compute indicator-based analysis when all AI providers are unavailable
      console.log(`[STEP 9 FALLBACK] Returning indicator-derived analysis for ${symbol} ${timeframe}`);
      const fallbackAnalysis = buildFallbackAnalysis(symbol, timeframe, tech, userName, behavioralContext);
      await recordUsage(user.id, "analyses", user.email).catch(() => {});
      reservedUserId = null;

      console.log(`[STEP 11: Response returned] FALLBACK ANALYSIS SUCCESSFUL | totalDuration=${Date.now() - t0}ms`);
      return successResponse(fallbackAnalysis);
    }

    // 5. Parse & repair AI output with safe parsing engine
    const { parsed: parsedData, isRepaired, isFallback } = safeParseAIResponse(
      raceResult.content,
      {
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
      }
    );
    console.log(`[STEP 10: JSON parsed] repaired=${isRepaired} | fallback=${isFallback}`);

    const analyzedAtStr = new Date().toISOString();
    const formattedNarrative = appendTelemetryMetadata(
      parsedData.coachNarrative || "",
      analyzedAtStr,
      lastCandleTime,
      tech.currentPrice,
      tech.currentPrice,
      exchangeName
    );

    const finalResponse = {
      ...parsedData,
      coachNarrative: formattedNarrative,
      symbol,
      timeframe,
      support: tech.support,
      resistance: tech.resistance,
      invalidationLevel: tech.invalidationLevel,
      rsi: tech.rsi,
      rsiLabel: tech.rsiLabel,
      currentPrice: tech.currentPrice,
      sourceMetadata: tech.sourceMetadata,
      indicators: {
        rsi: tech.rsi,
        rsiLabel: tech.rsiLabel,
        macd: { macd: tech.macdValue, signal: tech.macdSignal },
      },
      levels: {
        support: tech.support,
        resistance: tech.resistance,
        invalidation: tech.invalidationLevel,
      },
    };

    validateAnalysisConsistency(finalResponse);
    reservedUserId = null; // Analysis completed successfully — keep the reservation

    // Save fresh analysis to cache
    try {
      const cachePayload = {
        analyzedAt: new Date().toISOString(),
        analyzedPrice: tech.currentPrice,
        lastCandleTime,
        analysis: finalResponse
      };

      const existingCache = await prisma.conversationMemory.findFirst({
        where: {
          userId: user.id,
          role: "cached_analysis",
          chatId: `${symbol}-${timeframe}`,
        }
      });
      if (existingCache) {
        await prisma.conversationMemory.update({
          where: { id: existingCache.id },
          data: { content: JSON.stringify(cachePayload) }
        });
      } else {
        await prisma.conversationMemory.create({
          data: {
            userId: user.id,
            chatId: `${symbol}-${timeframe}`,
            role: "cached_analysis",
            content: JSON.stringify(cachePayload),
          }
        });
      }
    } catch (cacheErr) {
      console.warn("Failed to update cache", cacheErr);
    }

    // Add debug logs and validation checks
    const telemetryPrice = tech.currentPrice;
    const aiPrice = finalResponse.currentPrice;
    let chartPrice = telemetryPrice;

    try {
      const binanceSymbol = symbol.replace("/USD", "USDT");
      const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data = await res.json();
        if (data && data.price) {
          chartPrice = parseFloat(data.price);
        }
      }
    } catch (_) {}

    const diff = Math.abs(chartPrice - telemetryPrice);
    const diffPercent = telemetryPrice > 0 ? (diff / telemetryPrice) * 100 : 0;

    console.log(`[VALIDATION]
Chart Price: ${chartPrice.toFixed(4)}
Telemetry Price: ${telemetryPrice.toFixed(4)}
AI Price: ${aiPrice.toFixed(4)}
Timestamp: ${new Date().toISOString()}
Exchange: ${exchangeName}
Timeframe: ${timeframe}
Symbol: ${symbol}
`);

    if (diffPercent > 0.01) {
      console.warn(`⚠ PRICE MISMATCH DETECTED
Chart: ${chartPrice.toFixed(4)}
Telemetry: ${telemetryPrice.toFixed(4)}
Difference: ${diff.toFixed(4)} (${diffPercent.toFixed(4)}%)
Source: ${exchangeName}
Timestamp: ${new Date().toISOString()}
`);
    }

    console.log(`[STEP 11: Response returned] FRESH ANALYSIS SUCCESSFUL | totalDuration=${Date.now() - t0}ms`);
    return successResponse(finalResponse);

  } catch (err: any) {
    console.error("Critical error in analyze-chart route:", err);
    await releaseReservation();
    return aiUnavailableError();
  }
}
