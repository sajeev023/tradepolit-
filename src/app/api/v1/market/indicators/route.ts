import { NextRequest } from "next/server";
import { z } from "zod";
import { MarketDataService } from "@/lib/market-data-service";
import { compileTechnicalContext } from "@/lib/indicators";
import { successResponse, validationError, serverTimingHeader } from "@/lib/api-helpers";
import { checkIpRateLimit } from "@/lib/rate-limit";
import { rateLimitedError, dispatchCaughtError, upstreamError } from "@/lib/typed-errors";

export const dynamic = "force-dynamic";

const indicatorsQuerySchema = z.object({
  symbol: z.string().min(1, "Symbol is required"),
  tf: z.enum(["1m", "5m", "15m", "1h", "4h", "1d", "1W"]).default("1h"),
});

export async function GET(request: NextRequest) {
  const apiStart = performance.now();
  try {
    // IP rate limit: 60 / min. Indicators run the same fetch + calc path
    // as OHLCV plus heavy math; the charts page polls this every 20s.
    const rl = checkIpRateLimit(request, "market-indicators", 60, 60_000);
    if (!rl.allowed) {
      return rateLimitedError((rl.resetAt - Date.now()), "Too many indicator requests. Please slow down.");
    }

    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");
    const tf = searchParams.get("tf") || undefined;

    const validation = indicatorsQuerySchema.safeParse({ symbol, tf });
    if (!validation.success) {
      return validationError(validation.error);
    }

    const { symbol: validSymbol, tf: validTf } = validation.data;

    const fetchStart = performance.now();
    const candles = await MarketDataService.getOHLCV(validSymbol, validTf, 100);
    const fetchDuration = performance.now() - fetchStart;

    if (!candles || candles.length === 0) {
      return upstreamError("market_data", "No candle data available for selected asset");
    }

    const calcStart = performance.now();
    const tech = compileTechnicalContext(validSymbol, validTf, candles);
    const calcDuration = performance.now() - calcStart;

    const apiDuration = performance.now() - apiStart;
    // Server-Timing is emitted only in non-production (see serverTimingHeader).
    const headers = serverTimingHeader(
      { name: "fetch", durMs: fetchDuration, desc: "OHLCV Fetch" },
      { name: "calc", durMs: calcDuration, desc: "Indicator Calc" },
      { name: "api", durMs: apiDuration, desc: "API Execution" },
    );

    return successResponse(tech, 200, headers);
  } catch (error) {
    console.error("Indicators API route error:", error);
    return dispatchCaughtError("Failed to fetch indicators context", error);
  }
}
