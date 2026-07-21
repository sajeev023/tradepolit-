import { NextRequest } from "next/server";
import { z } from "zod";
import { MarketDataService } from "@/lib/market-data-service";
import { compileTechnicalContext } from "@/lib/indicators";
import { successResponse, validationError, internalError } from "@/lib/api-helpers";

const indicatorsQuerySchema = z.object({
  symbol: z.string().min(1, "Symbol is required"),
  tf: z.enum(["1m", "5m", "15m", "1h", "4h", "1d", "1W"]).default("1h"),
});

export async function GET(request: NextRequest) {
  const apiStart = performance.now();
  try {
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
      return internalError("No candle data available for selected asset");
    }

    const calcStart = performance.now();
    const tech = compileTechnicalContext(validSymbol, validTf, candles);
    const calcDuration = performance.now() - calcStart;

    const apiDuration = performance.now() - apiStart;
    const headers = {
      "Server-Timing": `fetch;dur=${fetchDuration.toFixed(2)};desc="OHLCV Fetch", calc;dur=${calcDuration.toFixed(2)};desc="Indicator Calc", api;dur=${apiDuration.toFixed(2)};desc="API Execution"`,
    };

    return successResponse(tech, 200, headers);
  } catch (error) {
    console.error("Indicators API route error:", error);
    return internalError("Failed to fetch indicators context");
  }
}
