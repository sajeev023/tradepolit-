import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  paginatedResponse,
  notFoundError,
  errorResponse,
} from "@/lib/api-helpers";
import { isDemoUser, getDemoFeatureLockedError } from "@/lib/demo-limits";
import { createHandler } from "@/lib/route-handler";

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

// Query params arrive as strings; z.coerce.number() replaces the hand-rolled
// parseInt and validates the range in one step.
const journalQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  tradeId: z.string().uuid().optional(),
});

export const POST = createHandler({
  rateLimit: { prefix: "journal", max: 30, windowMs: 60_000 },
  schema: journalEntrySchema,
  async handler({ user, body }) {
    // Demo users can't use the journal (per entitlements).
    if (isDemoUser(user.id, user.email ?? undefined)) {
      return demoJournalLocked();
    }

    const { title, body: entryBody, mood, tradeId } = body;

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
        body: entryBody,
        mood: mood ?? null,
        tradeId: tradeId ?? null,
      },
    });

    return successResponse(entry, 201);
  },
});

export const GET = createHandler({
  rateLimit: { prefix: "journal", max: 60, windowMs: 60_000 },
  querySchema: journalQuerySchema,
  async handler({ user, query }) {
    if (isDemoUser(user.id, user.email ?? undefined)) {
      return demoJournalLocked();
    }

    const { page, limit, tradeId } = query;

    const where: Record<string, unknown> = { userId: user.id };
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
  },
});