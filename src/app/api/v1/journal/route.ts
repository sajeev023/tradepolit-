import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  successResponse,
  paginatedResponse,
  unauthorizedError,
  validationError,
  notFoundError,
  errorResponse,
} from "@/lib/api-helpers";
import { isDemoUser, getDemoFeatureLockedError } from "@/lib/demo-limits";
import { dispatchCaughtError } from "@/lib/typed-errors";

function demoJournalLocked() {
  const e = getDemoFeatureLockedError("journal");
  return errorResponse(e.error, e.message, 403, { cta: e.cta, ctaLink: e.ctaLink });
}

export const dynamic = "force-dynamic";

const journalEntrySchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  body: z.string().min(1, "Body is required").max(10000),
  mood: z.enum([
    "CONFIDENT",
    "FEARFUL",
    "GREEDY",
    "REVENGE",
    "FOMO",
    "DISCIPLINED",
    "NEUTRAL",
  ]).optional(),
  tradeId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    // Demo users can't use the journal (per entitlements).
    if (isDemoUser(user.id, user.email ?? undefined)) {
      return demoJournalLocked();
    }

    const json = await request.json();
    const validation = journalEntrySchema.safeParse(json);
    if (!validation.success) {
      return validationError(validation.error);
    }

    const { title, body, mood, tradeId } = validation.data;

    // If a tradeId is provided, ensure the trade belongs to the user.
    if (tradeId) {
      const trade = await prisma.trade.findFirst({
        where: { id: tradeId, userId: user.id },
      });
      if (!trade) {
        return notFoundError("Trade");
      }
    }

    const entry = await prisma.journalEntry.create({
      data: {
        userId: user.id,
        title,
        body,
        mood: mood ?? null,
        tradeId: tradeId ?? null,
      },
    });

    return successResponse(entry, 201);
  } catch (error) {
    console.error("Create journal entry API error:", error);
    return dispatchCaughtError("Failed to create journal entry", error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    // Demo users can't use the journal (per entitlements).
    if (isDemoUser(user.id, user.email ?? undefined)) {
      return demoJournalLocked();
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const tradeId = searchParams.get("tradeId");

    const where: Record<string, any> = { userId: user.id };
    if (tradeId) {
      where.tradeId = tradeId;
    }

    const [entries, total] = await Promise.all([
      prisma.journalEntry.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          trade: {
            select: {
              instrument: true,
              direction: true,
              entryPrice: true,
              exitPrice: true,
              pnl: true,
            },
          },
        },
      }),
      prisma.journalEntry.count({ where }),
    ]);

    return paginatedResponse(entries, page, limit, total);
  } catch (error) {
    console.error("List journal entries API error:", error);
    return dispatchCaughtError("Failed to list journal entries", error);
  }
}
