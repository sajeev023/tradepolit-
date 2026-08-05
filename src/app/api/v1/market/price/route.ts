import { NextRequest } from "next/server";
import { z } from "zod";
import { MarketDataService } from "@/lib/market-data-service";
import { successResponse, validationError } from "@/lib/api-helpers";
import { checkIpRateLimit } from "@/lib/rate-limit";
import { rateLimitedError, dispatchCaughtError } from "@/lib/typed-errors";

export const dynamic = "force-dynamic";

const priceQuerySchema = z.object({
  symbol: z.string().min(1, "Symbol is required"),
});

export async function GET(request: NextRequest) {
  try {
    // IP rate limit: 60 / min. Market price proxies expensive upstream
    // API calls (Binance / TwelveData); an unauthenticated scraper loop
    // would burn our quota and degrade the service for real users.
    const rl = checkIpRateLimit(request, "market-price", 60, 60_000);
    if (!rl.allowed) {
      return rateLimitedError((rl.resetAt - Date.now()), "Too many price requests. Please slow down.");
    }

    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");

    const validation = priceQuerySchema.safeParse({ symbol });
    if (!validation.success) {
      return validationError(validation.error);
    }

    const price = await MarketDataService.getLivePrice(validation.data.symbol);
    return successResponse(price);
  } catch (error) {
    console.error("Live price API route error:", error);
    return dispatchCaughtError("Failed to fetch live price", error);
  }
}
