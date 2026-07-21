import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  successResponse,
  paginatedResponse,
  unauthorizedError,
  validationError,
  internalError,
} from "@/lib/api-helpers";

// Zod schema for trade creation
const createTradeSchema = z.object({
  instrument: z.string().min(1, "Instrument symbol is required"),
  assetClass: z.enum(["CRYPTO", "FOREX"]),
  direction: z.enum(["LONG", "SHORT"]),
  entryPrice: z.number().positive("Entry price must be positive"),
  exitPrice: z.number().positive("Exit price must be positive").optional(),
  size: z.number().positive("Size must be positive"),
  leverage: z.number().positive().default(1),
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
  openedAt: z.string().transform((val) => new Date(val)),
  closedAt: z.string().transform((val) => new Date(val)).optional(),
  strategyId: z.string().uuid().optional(),
  emotionTag: z
    .enum([
      "CONFIDENT",
      "FEARFUL",
      "GREEDY",
      "REVENGE",
      "FOMO",
      "DISCIPLINED",
      "NEUTRAL",
    ])
    .optional(),
  mistakeTags: z.array(z.string()).default([]),
  lessonsLearned: z.string().optional(),
  notes: z.string().optional(),
  screenshots: z.array(z.string()).default([]),
});

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const json = await request.json();
    const validation = createTradeSchema.safeParse(json);
    if (!validation.success) {
      return validationError(validation.error);
    }

    const data = validation.data;

    // Calculate auto-computed fields
    let pnl: number | null = null;
    let rMultiple: number | null = null;
    let status: "OPEN" | "CLOSED" = "OPEN";

    if (data.exitPrice !== undefined && data.exitPrice !== null) {
      status = "CLOSED";
      const mult = data.direction === "LONG" ? 1 : -1;
      // pnl = mult * (exitPrice - entryPrice) * size * leverage
      let computedPnl = mult * (data.exitPrice - data.entryPrice) * data.size * data.leverage;
      
      // USD/JPY quote conversion (convert JPY profit to USD)
      const isJpyQuote = data.instrument.toUpperCase().replace("-", "").replace("/", "") === "USDJPY";
      if (isJpyQuote) {
        computedPnl = computedPnl / data.exitPrice;
      }
      
      pnl = computedPnl;

      // rMultiple calculation
      if (data.stopLoss !== undefined && data.stopLoss !== null) {
        const risk = data.direction === "LONG"
          ? data.entryPrice - data.stopLoss
          : data.stopLoss - data.entryPrice;

        if (risk > 0) {
          const reward = data.direction === "LONG"
            ? data.exitPrice - data.entryPrice
            : data.entryPrice - data.exitPrice;
          rMultiple = reward / risk;
        }
      }
    }

    const trade = await prisma.trade.create({
      data: {
        userId: user.id,
        instrument: data.instrument,
        assetClass: data.assetClass,
        direction: data.direction,
        entryPrice: data.entryPrice,
        exitPrice: data.exitPrice !== undefined ? data.exitPrice : null,
        size: data.size,
        leverage: data.leverage,
        stopLoss: data.stopLoss !== undefined ? data.stopLoss : null,
        takeProfit: data.takeProfit !== undefined ? data.takeProfit : null,
        pnl,
        rMultiple,
        status,
        openedAt: data.openedAt,
        closedAt: data.closedAt || null,
        strategyId: data.strategyId || null,
        emotionTag: data.emotionTag || null,
        mistakeTags: data.mistakeTags,
        lessonsLearned: data.lessonsLearned || null,
        notes: data.notes || null,
        screenshots: data.screenshots,
      },
    });

    return successResponse(trade, 201);
  } catch (error) {
    console.error("Create trade API error:", error);
    return internalError("Failed to create trade");
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as "OPEN" | "CLOSED" | null;
    const instrument = searchParams.get("instrument");
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
      select: { plan: true },
    });

    const isPro = userProfile?.plan === "PRO";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    
    const limitToTake = isPro ? limit : Math.min(limit, 20);
    const skip = isPro ? (page - 1) * limit : (page === 1 ? 0 : 20); // free tier can only see page 1 (first 20)
    
    const where: Record<string, any> = {
      userId: user.id,
    };

    if (status) where.status = status;
    if (instrument) {
      where.instrument = {
        contains: instrument,
        mode: "insensitive",
      };
    }

    const [trades, rawTotal] = await Promise.all([
      prisma.trade.findMany({
        where,
        orderBy: { openedAt: "desc" },
        skip,
        take: limitToTake,
        include: {
          strategy: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.trade.count({ where }),
    ]);

    const total = isPro ? rawTotal : Math.min(rawTotal, 20);

    return paginatedResponse(trades, page, limit, total);
  } catch (error) {
    console.error("List trades API error:", error);
    return internalError("Failed to list trades");
  }
}
