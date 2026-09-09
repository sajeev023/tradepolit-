import { NextRequest } from "next/server";
import { z } from "zod";
import { isRegisteredSymbol, getLivePrice, getOHLCV } from "@/lib/market";
import { buildMarketAnalysis, type AnalysisResult } from "@/lib/analysis-engine";
import { buildMarketSnapshot } from "@/lib/market-snapshot";
import { successResponse, validationError } from "@/lib/api-helpers";
import { checkIpRateLimit } from "@/lib/rate-limit";
import { rateLimitedError, dispatchCaughtError, upstreamError } from "@/lib/typed-errors";

export const dynamic = "force-dynamic";

const contextQuerySchema = z.object({
  symbol: z.string().min(1, "Symbol is required").refine(isRegisteredSymbol, {
    message: "Unsupported symbol",
  }),
  tf: z.enum(["1m", "5m", "15m", "1h", "4h", "1d", "1W"]).default("1h"),
  depth: z.enum(["snapshot", "analysis"]).default("snapshot"),
  bias: z.enum(["LONG", "SHORT", "NEUTRAL"]).optional(),
});

/**
 * GET /api/v1/market/context?symbol=BTC/USD&tf=4h&depth=analysis&bias=LONG
 *
 * Returns a deterministic, timestamped market snapshot with freshness
 * metadata. With depth=analysis, returns the full V5 analysis engine
 * output: market state, MTF structure, contradictions, hypotheses,
 * invalidation, classified evidence, and what-changed support.
 * Does NOT call AI.
 */
export async function GET(request: NextRequest) {
  try {
    const rl = checkIpRateLimit(request, "market-context", 60, 60_000);
    if (!rl.allowed) {
      return rateLimitedError((rl.resetAt - Date.now()), "Too many context requests. Please slow down.");
    }

    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");
    const tf = searchParams.get("tf") || undefined;
    const depth = searchParams.get("depth") || undefined;
    const bias = searchParams.get("bias") || undefined;

    const validation = contextQuerySchema.safeParse({ symbol, tf, depth, bias });
    if (!validation.success) {
      return validationError(validation.error);
    }

    const { symbol: validSymbol, tf: validTf, depth: validDepth, bias: validBias } = validation.data;

    // Legacy snapshot path remains for backward compatibility.
    if (validDepth === "snapshot") {
      const result = await buildMarketSnapshot(validSymbol, validTf);
      if (result.freshness === "UNAVAILABLE" || !result.snapshot) {
        return upstreamError(
          "market_data",
          result.error || "Live market context unavailable",
          30_000,
          { preserved: { symbol: validSymbol, timeframe: validTf } }
        );
      }
      return successResponse(result.snapshot);
    }

    // V5 analysis path.
    const [priceData, candles] = await Promise.all([
      getLivePrice(validSymbol).catch(() => null),
      getOHLCV(validSymbol, validTf, 100).catch(() => []),
    ]);

    const direction: "LONG" | "SHORT" | null =
      validBias === "LONG" ? "LONG" : validBias === "SHORT" ? "SHORT" : null;

    const analysis = await buildMarketAnalysis({
      symbol: validSymbol,
      timeframe: validTf,
      candles,
      priceData: priceData
        ? {
            price: priceData.price,
            change24h: priceData.change24h ?? 0,
            changePercent24h: priceData.changePercent24h ?? 0,
            source: priceData.source,
          }
        : undefined,
      direction,
      fetchHigherTF: (s, tf, limit) => getOHLCV(s, tf, limit),
    });

    if (analysis.freshness === "UNAVAILABLE" || !analysis.marketState) {
      return upstreamError(
        "market_data",
        analysis.freshnessReason || "Live market context unavailable",
        30_000,
        { preserved: { symbol: validSymbol, timeframe: validTf } }
      );
    }

    return successResponse(analysis);
  } catch (error) {
    console.error("Market context API route error:", error);
    return dispatchCaughtError("Failed to build market context", error);
  }
}

export type { AnalysisResult };
