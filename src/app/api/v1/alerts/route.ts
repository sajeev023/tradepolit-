import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { checkUsageLimit, recordUsage, releaseUsage } from "@/lib/limit-checker";
import {
  successResponse,
  unauthorizedError,
  validationError,
  errorResponse,
} from "@/lib/api-helpers";
import { getDemoAlertLimitError } from "@/lib/demo-limits";
import { dispatchCaughtError } from "@/lib/typed-errors";

const alertSchema = z.object({
  instrument: z.string().min(1, "Asset symbol is required"),
  type: z.enum(["PRICE", "RSI", "MACD", "EMA_CROSS", "SUPPORT_BREAK", "RESISTANCE_BREAK", "TREND_CHANGE"]),
  condition: z.object({
    operator: z.enum(["gt", "lt", "crosses_above", "crosses_below"]),
    value: z.number("Threshold value must be a number"),
  }),
});

export async function GET(_request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const alerts = await prisma.alert.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(alerts);
  } catch (error) {
    console.error("List alerts API error:", error);
    return dispatchCaughtError("Failed to list alerts", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    // Check demo limits for alert creation
    const limitCheck = await checkUsageLimit(user.id, "alerts", user.email);
    if (!limitCheck.allowed) {
      if (limitCheck.isDemo) {
        const demoError = getDemoAlertLimitError();
        return errorResponse(demoError.error, demoError.message, 403, {
          cta: demoError.cta,
          ctaLink: demoError.ctaLink,
        });
      }
      return errorResponse("FORBIDDEN", "Daily alert limit reached. Upgrade to Pro.", 403);
    }

    const json = await request.json();
    const validation = alertSchema.safeParse(json);
    if (!validation.success) {
      return validationError(validation.error);
    }

    const { instrument, type, condition } = validation.data;

    if (condition.value < 0 && type === "PRICE") {
      return validationError({
        issues: [{ path: ["condition", "value"], message: "Price trigger value cannot be negative" }],
      } as any);
    }

    // Reserve the alert quota atomically BEFORE creating the row. The prior
    // check→create→record sequence allowed two concurrent requests to both
    // pass the read-only check and both create an alert, then both increment
    // — exceeding the daily limit by one under concurrency. recordUsage is a
    // conditional increment (race-safe); if it returns false another request
    // took the last slot between our check and our reservation, so we refuse
    // without creating the row. On a create failure we release the slot so
    // the user is not charged for an alert that was never persisted.
    const reserved = await recordUsage(user.id, "alerts", user.email);
    if (!reserved) {
      return errorResponse("FORBIDDEN", "Daily alert limit reached. Upgrade to Pro.", 403);
    }

    try {
      const alert = await prisma.alert.create({
        data: {
          userId: user.id,
          instrument,
          type,
          condition: condition as any,
          isActive: true,
        },
      });

      return successResponse(alert, 201);
    } catch (createErr) {
      await releaseUsage(user.id, "alerts");
      throw createErr;
    }
  } catch (error) {
    console.error("Create alert API error:", error);
    return dispatchCaughtError("Failed to create alert", error);
  }
}
