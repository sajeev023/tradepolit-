import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  successResponse,
  unauthorizedError,
  validationError,
  internalError,
} from "@/lib/api-helpers";

const strategySchema = z.object({
  name: z.string().min(1, "Strategy name is required"),
  description: z.string().optional(),
  rulesConfig: z.object({
    entry: z.object({
      indicatorA: z.enum(["EMA20", "EMA50", "PRICE"]),
      operator: z.enum(["CROSSES_ABOVE", "CROSSES_BELOW", "GREATER_THAN", "LESS_THAN"]),
      indicatorB: z.enum(["EMA20", "EMA50", "PRICE"]),
    }),
    exit: z.object({
      indicatorA: z.enum(["EMA20", "EMA50", "PRICE"]),
      operator: z.enum(["CROSSES_ABOVE", "CROSSES_BELOW", "GREATER_THAN", "LESS_THAN"]),
      indicatorB: z.enum(["EMA20", "EMA50", "PRICE"]),
    }),
  }),
});

export async function GET(_request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const strategies = await prisma.strategy.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(strategies);
  } catch (error) {
    console.error("List strategies API error:", error);
    return internalError("Failed to list strategies");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const json = await request.json();
    const validation = strategySchema.safeParse(json);
    if (!validation.success) {
      return validationError(validation.error);
    }

    const { name, description, rulesConfig } = validation.data;

    const strategy = await prisma.strategy.create({
      data: {
        userId: user.id,
        name,
        description,
        rulesConfig: rulesConfig as any,
      },
    });

    return successResponse(strategy, 201);
  } catch (error) {
    console.error("Create strategy API error:", error);
    return internalError("Failed to create strategy");
  }
}
