import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { successResponse, unauthorizedError, internalError } from "@/lib/api-helpers";

const ALL_SYMBOLS = [
  "BTC/USD", "ETH/USD", "SOL/USD",
  "EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD",
  "NASDAQ", "S&P500",
];

// GET /api/v1/ai/market-overview
// Reads cached analyses from ConversationMemory for all watched symbols.
// Returns a compact one-liner per symbol for the watchlist panel.
export async function GET(_request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    if (error || !user) return error ?? unauthorizedError();

    const userProfile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
      select: { plan: true },
    });
    if (userProfile?.plan !== "PRO") {
      return new Response(JSON.stringify({ error: { message: "Upgrade to Pro to access this feature" } }), { status: 403, headers: { "Content-Type": "application/json" } });
    }

    const caches = await prisma.conversationMemory.findMany({
      where: {
        userId: user.id,
        role: "cached_analysis",
      },
    });

    const overview: Record<string, {
      symbol: string;
      bias: string;
      confidence: string;
      oneLiner: string;
      support: string;
      resistance: string;
      analyzedAt: string | null;
    }> = {};

    for (const record of caches) {
      try {
        const parsed = JSON.parse(record.content);
        const analysis = parsed.analysis ?? parsed;
        const symbolKey = record.chatId?.replace(/-[^-]+$/, "") ?? "";

        // chatId format is "BTC/USD-4h" — extract symbol
        const parts = record.chatId?.split("-") ?? [];
        const tfPart = parts[parts.length - 1];
        // symbol is everything except the last hyphen segment
        const sym = record.chatId?.slice(0, record.chatId.lastIndexOf("-")) ?? "";

        if (!sym || !ALL_SYMBOLS.includes(sym)) continue;

        const bias: string = analysis.bias ?? "NEUTRAL";
        const whyItMatters: string = analysis.whyItMatters ?? "";
        const confidence: string = analysis.confidence ?? "MEDIUM";
        const support: string = String(analysis.support ?? "");
        const resistance: string = String(analysis.resistance ?? "");

        // Build one-liner: "Bullish above $67K, watching for breakout"
        const oneLiner = whyItMatters
          ? whyItMatters.slice(0, 80) + (whyItMatters.length > 80 ? "..." : "")
          : `${bias} — ${confidence} confidence`;

        overview[sym] = {
          symbol: sym,
          bias,
          confidence,
          oneLiner,
          support,
          resistance,
          analyzedAt: parsed.analyzedAt ?? null,
        };
      } catch (_) {
        // malformed cache — skip
      }
    }

    return successResponse(overview);
  } catch (err) {
    console.error("Market overview error:", err);
    return internalError("Failed to load market overview");
  }
}
