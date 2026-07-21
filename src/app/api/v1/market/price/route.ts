import { NextRequest } from "next/server";
import { z } from "zod";
import { MarketDataService } from "@/lib/market-data-service";
import { successResponse, validationError, internalError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

const priceQuerySchema = z.object({
  symbol: z.string().min(1, "Symbol is required"),
});

export async function GET(request: NextRequest) {
  try {
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
    return internalError("Failed to fetch live price");
  }
}
