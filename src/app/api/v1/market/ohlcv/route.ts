import { NextRequest } from "next/server";
import { z } from "zod";
import { getOHLCV } from "@/lib/market";
import { successResponse, validationError, internalError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const ohlcvQuerySchema = z.object({
  symbol: z.string().min(1, "Symbol is required"),
  tf: z.enum(["1m", "5m", "15m", "1h", "4h", "1d", "1W"]).default("1h"),
  limit: z.preprocess(
    (val) => (val ? parseInt(val as string, 10) : undefined),
    z.number().min(1).max(500).default(100)
  ),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");
    const tf = searchParams.get("tf") || undefined;
    const limit = searchParams.get("limit") || undefined;

    const validation = ohlcvQuerySchema.safeParse({ symbol, tf, limit });
    if (!validation.success) {
      return validationError(validation.error);
    }

    const { symbol: validSymbol, tf: validTf, limit: validLimit } = validation.data;
    const candles = await getOHLCV(validSymbol, validTf, validLimit);
    return successResponse(candles);
  } catch (error) {
    console.error("OHLCV API route error:", error);
    return internalError("Failed to fetch historical candles");
  }
}
