import { NextRequest } from "next/server";
import { z } from "zod";
import { calculate, validateInputs, type CalculationMode } from "@/lib/risk-engine";
import { successResponse, validationError, internalError } from "@/lib/api-helpers";

const calculateSchema = z.object({
  balance:     z.number().positive("Account balance must be positive"),
  riskPercent: z.number().min(0.1, "Risk % min 0.1").max(100, "Risk % max 100").optional(),
  riskAmount:  z.number().positive("Risk amount must be positive").optional(),
  entryPrice:  z.number().positive("Entry price must be positive"),
  stopLoss:    z.number().positive("Stop loss must be positive"),
  takeProfit:  z.number().positive("Take profit must be positive").optional(),
  leverage:    z.number().min(0, "Leverage must be >= 0").default(1),
  direction:   z.enum(["LONG", "SHORT"]),
  assetClass:  z.enum(["CRYPTO", "FOREX", "COMMODITY"]).default("CRYPTO"),
  symbol:      z.string().min(1).default("BTC/USD"),
  mode:        z.enum(["STANDARD", "MAX", "MIN"]).default("STANDARD"),
});

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const validation = calculateSchema.safeParse(json);
    if (!validation.success) {
      return validationError(validation.error);
    }

    // Normalize XAU/USD assetClass — legacy callers may send FOREX for XAU
    const rawParams = validation.data;
    if (rawParams.symbol === "XAU/USD" && rawParams.assetClass === "FOREX") {
      rawParams.assetClass = "COMMODITY";
    }
    const params = rawParams;

    // Run engine-level validation
    const engineErrors = validateInputs({
      ...params,
      mode: params.mode as CalculationMode,
    });

    if (engineErrors.length > 0) {
      return validationError({
        issues: engineErrors.map(e => ({ path: [e.field], message: e.message })),
      } as any);
    }

    const result = calculate({
      ...params,
      mode: params.mode as CalculationMode,
    });

    return successResponse(result);
  } catch (error) {
    console.error("Risk calculator API error:", error);
    const msg = error instanceof Error ? error.message : "Failed to calculate position size";
    return internalError(msg);
  }
}
