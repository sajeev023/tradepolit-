import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { runAIChat } from "@/lib/ai";
import { isDemoUser } from "@/lib/demo-limits";
import {
  successResponse,
  unauthorizedError,
  validationError,
  errorResponse,
  rateLimitError as rateLimitResponse,
  serverTimingHeader,
} from "@/lib/api-helpers";
import { MarketDataService } from "@/lib/market-data-service";
import { compileTechnicalContext, validateAnalysisConsistency, appendTelemetryMetadata, calculateEMA } from "@/lib/indicators";
import { callFastestModel } from "@/lib/nvidia-ai";
import { getAnalyzeChartSystemPrompt } from "@/lib/prompt-cache";
import { safeParseAIResponse } from "@/lib/ai-response-parser";
import { validateMarketData, validateIndicators, validateLevels, isDataFresh } from "@/lib/validate-market-data";
import { checkTokenBudget } from "@/lib/token-budget";
import { getEntitlementForUser } from "@/lib/entitlements";
import { checkUserRateLimit } from "@/lib/rate-limit";
import { dispatchCaughtError } from "@/lib/typed-errors";
import { getExchangeName } from "@/lib/market-registry";

const chartStateSchema = z.object({
  symbol: z.string().max(20).optional(),
  timeframe: z.string().max(10).optional(),
  currentPrice: z.number().optional(),
  volume: z.number().optional(),
  atr: z.number().optional(),
  trend: z.string().max(20).optional(),
  rsi: z.number().optional(),
  rsiLabel: z.string().max(30).optional(),
  macdValue: z.number().optional(),
  macdSignal: z.number().optional(),
  macdHistogram: z.number().optional(),
  support: z.number().optional(),
  resistance: z.number().optional(),
  invalidationLevel: z.number().optional(),
  bias: z.string().max(20).optional(),
  setupQuality: z.string().max(20).optional(),
  confidence: z.string().max(20).optional(),
  whyItMatters: z.string().max(500).optional(),
}).strict().optional();

const chatMessageSchema = z.object({
  chatId: z.string().uuid().optional(),
  message: z.string().min(1, "Message is required").max(2000, "Message must be 2000 characters or fewer"),
  symbol: z.string().max(20).optional(),
  timeframe: z.string().max(10).optional(),
  chartState: chartStateSchema,
});

// Allow up to 60s for AI model race — overrides Next.js default 10s timeout
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log("[STEP 1] Receive request to AI Chat endpoint");

  let totalDbTime = 0;
  const db = async <T>(promise: Promise<T>): Promise<T> => {
    const start = performance.now();
    const res = await promise;
    totalDbTime += (performance.now() - start);
    return res;
  };

  try {
    // Auth-gate first so the rate limit can use the user ID (stable across
    // IP rotation) instead of just IP — an attacker rotating IPs cannot
    // bypass this limit.
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const rl = checkUserRateLimit(user.id, request, "ai-chat", 20, 60_000);
    if (!rl.result.allowed) {
      const retryAfterSec = Math.ceil((rl.result.resetAt - Date.now()) / 1000);
      return rateLimitResponse(`AI chat rate limit exceeded. Please slow down. Retry in ${retryAfterSec}s.`);
    }

    const json = await request.json();
    const validation = chatMessageSchema.safeParse(json);
    if (!validation.success) {
      return validationError(validation.error);
    }

    const { chatId, message, symbol, timeframe, chartState } = validation.data;

    // STEP 2: Resolve effective symbol & timeframe (Profile fallback)
    const userProfile: any = (!symbol || !timeframe)
      ? await db(prisma.userProfile.findUnique({ where: { userId: user.id } }))
      : null;
    const resolvedSymbol: string = symbol || userProfile?.lastSymbol || "BTC/USD";
    const resolvedTimeframe: string = timeframe || userProfile?.lastTimeframe || "4h";

    // Exchange name comes from the market registry so new markets are
    // picked up automatically without touching this route.
    const exchangeName = getExchangeName(resolvedSymbol);

    console.log(`[STEP 2] Check telemetry cache for asset: ${resolvedSymbol}, timeframe: ${resolvedTimeframe}`);
    
    // Fetch live market data
    const candles = await MarketDataService.getOHLCV(resolvedSymbol, resolvedTimeframe, 100).catch(() => []);
    const lastCandle = candles[candles.length - 1];
    const livePrice = lastCandle ? lastCandle.close : null;
    let staleNotice = "";

    // chartState from the client is validated by chartStateSchema (optional).
    // We explicitly widen to include null because we reset it to null whenever
    // the symbol mismatches or the price goes stale.
    let activeChartState: (typeof chartState) | null = chartState;
    if (activeChartState && activeChartState.symbol && activeChartState.symbol !== resolvedSymbol) {
      console.warn(`[CHAT ROUTE] Mismatched chartState symbol (${activeChartState.symbol}) vs resolvedSymbol (${resolvedSymbol}). Discarding stale state.`);
      activeChartState = null;
    }

    if (!activeChartState) {
      const cachedRecord: any = await db(prisma.conversationMemory.findFirst({
        where: {
          userId: user.id,
          role: "cached_analysis",
          chatId: `${resolvedSymbol}-${resolvedTimeframe}`,
        }
      }));
      if (cachedRecord) {
        try {
          const cachedData = JSON.parse(cachedRecord.content);
          activeChartState = cachedData.analysis || cachedData;
          if (activeChartState) activeChartState.symbol = resolvedSymbol;
        } catch (_) {}
      }
    }

    // Telemetry validation: Check if active market price differs materially (>0.5%)
    if (activeChartState && livePrice && activeChartState.currentPrice) {
      const analyzedPrice = activeChartState.currentPrice;
      const priceDiffPercent = Math.abs(livePrice - analyzedPrice) / analyzedPrice;
      if (priceDiffPercent > 0.005) {
        console.warn(`[CHAT ROUTE] Price variance detected (livePrice=${livePrice} vs analyzedPrice=${analyzedPrice}, diff=${(priceDiffPercent*100).toFixed(2)}%). Discarding stale state.`);
        activeChartState = null;
        staleNotice = "The previous analysis was generated using older telemetry and cannot be updated by changing only the displayed price. Refreshing market data...\n\n";
      }
    }

    let isAnalysisSkipped = !!activeChartState;

    if (!activeChartState && candles.length > 0) {
      console.log(`[CHAT ROUTE] Recalculating indicators for ${resolvedSymbol} ${resolvedTimeframe}...`);
      const tech = compileTechnicalContext(resolvedSymbol, resolvedTimeframe, candles);
      validateAnalysisConsistency(tech);

      // Verify data freshness and reject stale data
      const dataIsFresh = isDataFresh(lastCandle ? lastCandle.timestamp : Date.now(), resolvedTimeframe);
      if (!dataIsFresh) {
        return errorResponse(
          "UPSTREAM_UNAVAILABLE",
          "Market telemetry is stale. Please refresh chart data and try again.",
          503
        );
      }

      // Run validators
      const marketErrors = validateMarketData({
        symbol: resolvedSymbol,
        currentPrice: tech.currentPrice,
        ohlcv: candles
      }, resolvedSymbol, resolvedTimeframe);

      const closes = candles.map(c => c.close);
      const indicatorErrors = validateIndicators({
        rsi: tech.rsi,
        macd: { macd: tech.macdValue, signal: tech.macdSignal },
        ema9: closes.length >= 9 ? calculateEMA(closes, 9).pop() ?? NaN : NaN,
        ema21: closes.length >= 21 ? calculateEMA(closes, 21).pop() ?? NaN : NaN,
        atr: tech.atr
      });

      const levelErrors = validateLevels({
        support: tech.support,
        resistance: tech.resistance
      }, tech.currentPrice);

      const allErrors = [...marketErrors, ...indicatorErrors, ...levelErrors];

      if (allErrors.length === 0 && tech.currentPrice && tech.rsi && tech.support && tech.resistance) {
        const systemPrompt = getAnalyzeChartSystemPrompt();
        // Resolve the user's actual entitlement tier for token budgeting.
        const userEntitlement = getEntitlementForUser(
          user.id,
          user.email ?? undefined,
          userProfile?.plan ?? undefined,
          userProfile?.subscriptionStatus ?? undefined
        );
        const tier = userEntitlement.isUnlimitedAnalyses ? "PRO" : "FREE";
        const budget = checkTokenBudget(message, systemPrompt, [], tier);
        if (!budget.isWithinLimit) {
          // Server-Timing is emitted only in non-production (see serverTimingHeader).
          const headers = serverTimingHeader(
            { name: "db", durMs: totalDbTime, desc: "Prisma queries" },
            { name: "api", durMs: Date.now() - startTime, desc: "API Total" },
          );
          return successResponse({
            reply: `Not financial advice — for educational purposes.\n\n${budget.warning}`,
            budget,
          }, 200, headers);
        }
        const userPrompt = `Conduct an elite chart analysis on ${resolvedSymbol} on the ${resolvedTimeframe} timeframe.

LIVE CHART TECHNICAL DATA (from real-time exchange telemetry — use as primary data source):
- Symbol: ${resolvedSymbol}
- Exchange: ${exchangeName}
- Timeframe: ${resolvedTimeframe}
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
- Fake Breakout: ${tech.fakeBreakout}
- Active Session: ${tech.activeSession || "None"}

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
  "coachNarrative": "Analysis Source: TradCopilot Telemetry | Symbol: ${resolvedSymbol} | Exchange: ${exchangeName} | TF: ${resolvedTimeframe} | Price: $${tech.currentPrice.toLocaleString()} | Status: Synchronized\\n\\n## Market Structure\\n[Provide institutional discretionary analysis of structure]\\n\\n## Momentum\\n[Synthesize RSI, MACD, volume, and trend together - no indicator lists]\\n\\n## Key Levels\\n[Explain importance of support/resistance pivots]\\n\\n## Trade Thesis\\n[Step-by-step thesis with telemetry backup]\\n\\n## Invalidation\\n[Exact structural invalidation close event]\\n\\n## Risk Assessment\\n[Detail uncertainties, conflicting signals, volatility risk]\\n\\n## Bottom Line\\n[Concise firm-level summary of highest probability path]"
}`;

        try {
          const raceResult = await Promise.race([
            callFastestModel([
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ], { temperature: 0.25, maxTokens: 600 }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("AI model race timed out after 55s")), 55000)
            ),
          ]);

          const { parsed: parsedData } = safeParseAIResponse(raceResult.content, {
            symbol: resolvedSymbol,
            timeframe: resolvedTimeframe,
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
          });

          // Server-computed analysis object — cast because the analysis shape
          // (with indicators/levels/sourceMetadata) extends the client
          // chartState schema. The cast is safe: every field here is derived
          // from server-side telemetry, not client input.
          activeChartState = {
            ...parsedData,
            symbol: resolvedSymbol,
            timeframe: resolvedTimeframe,
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
          } as typeof chartState;

          const lastCandleTime = lastCandle ? new Date(lastCandle.timestamp).toISOString() : new Date().toISOString();
          const cachePayload = {
            analyzedAt: new Date().toISOString(),
            analyzedPrice: tech.currentPrice,
            lastCandleTime,
            analysis: activeChartState
          };

          const existingCache: any = await db(prisma.conversationMemory.findFirst({
            where: {
              userId: user.id,
              role: "cached_analysis",
              chatId: `${resolvedSymbol}-${resolvedTimeframe}`,
            }
          }));
          if (existingCache) {
            await db(prisma.conversationMemory.update({
              where: { id: existingCache.id },
              data: { content: JSON.stringify(cachePayload) }
            }));
          } else {
            await db(prisma.conversationMemory.create({
              data: {
                userId: user.id,
                chatId: `${resolvedSymbol}-${resolvedTimeframe}`,
                role: "cached_analysis",
                content: JSON.stringify(cachePayload),
              }
            }));
          }

          isAnalysisSkipped = true;
        } catch (err) {
          console.error("[CHAT ROUTE] Dynamic analysis recalculation failed:", err);
        }
      }
    }

    // STEP 3: Determine whether analysis required
    if (isAnalysisSkipped) {
      console.log("[STEP 3] Determine whether analysis required: NO. Telemetry cache is valid.");
      console.log("[STEP 4] Using telemetry chart context.");
    } else {
      console.log("[STEP 3] Telemetry cached context not found. Using profile defaults.");
    }

    let chat: any;

    if (chatId) {
      chat = await db(prisma.aIChat.findFirst({
        where: { id: chatId, userId: user.id },
      }));
      if (!chat) {
        return validationError({
          issues: [{ path: ["chatId"], message: "AI Chat session not found" }],
        } as any);
      }
    } else {
      // Demo users can chat in-memory (chat history not persisted to DB)
      if (isDemoUser(user.id, user.email)) {
        chat = {
          id: "demo-chat",
          userId: user.id,
          title: "Demo AI Coach Session",
          symbol: resolvedSymbol,
          timeframe: resolvedTimeframe,
          messages: [],
        };
      } else {
        // Create new chat — store symbol/timeframe for history sidebar
        const wordLimit = 4;
        const title = message.split(" ").slice(0, wordLimit).join(" ") + "...";
        chat = await db(prisma.aIChat.create({
          data: {
            userId: user.id,
            title: title || "New AI Coach Session",
            symbol: resolvedSymbol,
            timeframe: resolvedTimeframe,
            messages: [],
          },
        }));
      }
    }

    // Append user message
    const messageList = Array.isArray(chat.messages) ? (chat.messages as any[]) : [];
    const updatedMessages = [
      ...messageList,
      { role: "user", content: message, createdAt: new Date().toISOString() },
    ];

    // STEP 5: Generate conversational response with timeout
    console.log("[STEP 5] Generate conversational response (calling runAIChat)");
    const apiStartTime = Date.now();
    const assistantReply = await Promise.race([
      runAIChat(
        user.id,
        updatedMessages as any,
        // activeChartState is server-computed analysis (or null). Cast to the
        // runAIChat chartState shape; runAIChat treats a missing/partial
        // chartState as "no chart context" and falls back to profile defaults.
        { symbol: resolvedSymbol, timeframe: resolvedTimeframe, chartState: activeChartState as any },
        user.email
      ),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("AI chat timed out after 55s")), 55000)
      ),
    ]);
    const apiDuration = Date.now() - apiStartTime;
    console.log(`[STEP 5 COMPLETE] NVIDIA API request finished in ${apiDuration}ms`);

    // Append stale notice and telemetry metadata block
    let finalReply = assistantReply;
    if (staleNotice) {
      finalReply = staleNotice + finalReply;
    }

    if (activeChartState && activeChartState.currentPrice) {
      let analyzedAtStr = new Date().toISOString();
      let lastCandleTimeStr = new Date().toISOString();
      try {
        const cachedRecord: any = await db(prisma.conversationMemory.findFirst({
          where: {
            userId: user.id,
            role: "cached_analysis",
            chatId: `${resolvedSymbol}-${resolvedTimeframe}`,
          }
        }));
        if (cachedRecord) {
          const cachedData = JSON.parse(cachedRecord.content);
          analyzedAtStr = cachedData.analyzedAt || analyzedAtStr;
          lastCandleTimeStr = cachedData.lastCandleTime || lastCandleTimeStr;
        }
      } catch (_) {}

      finalReply = appendTelemetryMetadata(
        finalReply,
        analyzedAtStr,
        lastCandleTimeStr,
        activeChartState.currentPrice,
        livePrice || activeChartState.currentPrice,
        exchangeName
      );
    }

    const finalMessages = [
      ...updatedMessages,
      { role: "assistant", content: finalReply, createdAt: new Date().toISOString() },
    ];

    // Demo users: don't save chat history
    if (isDemoUser(user.id, user.email)) {
      const totalDuration = Date.now() - startTime;
      // Server-Timing is emitted only in non-production (see serverTimingHeader).
      const headers = serverTimingHeader(
        { name: "db", durMs: totalDbTime, desc: "Prisma queries" },
        { name: "ai", durMs: apiDuration, desc: "AI Model Latency" },
        { name: "api", durMs: totalDuration, desc: "API Total" },
      );
      console.log(`[STEP 6] Return response to client (demo mode - no DB save). Total: ${totalDuration}ms`);
      return successResponse({
        chat: { ...chat, messages: finalMessages },
        reply: finalReply,
      }, 200, headers);
    }

    // Update database
    const updatedChat = await db(prisma.aIChat.update({
      where: { id: chat.id },
      data: {
        messages: finalMessages as any,
        title: chat.title === "New AI Coach Session" || chat.title.startsWith("New Chat")
          ? message.split(" ").slice(0, 4).join(" ") + "..."
          : chat.title,
      },
    }));

    const totalDuration = Date.now() - startTime;
    // Server-Timing is emitted only in non-production (see serverTimingHeader).
    const headers = serverTimingHeader(
      { name: "db", durMs: totalDbTime, desc: "Prisma queries" },
      { name: "ai", durMs: apiDuration, desc: "AI Model Latency" },
      { name: "api", durMs: totalDuration, desc: "API Total" },
    );
    // STEP 6: Return response
    console.log(`[STEP 6] Return response to client. Total processing time: ${totalDuration}ms | NVIDIA API Latency: ${apiDuration}ms`);

    return successResponse({
      chat: updatedChat,
      reply: finalReply,
    }, 200, headers);
  } catch (error) {
    console.error("AI chat assistant endpoint error:", error);
    return dispatchCaughtError("Failed to communicate with AI Coach", error);
  }
}
