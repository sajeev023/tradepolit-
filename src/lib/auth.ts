import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { unauthorizedError } from "@/lib/api-helpers";

/**
 * Get the authenticated user from the Supabase session.
 * Use in API routes to enforce authentication.
 * Always uses getUser() (server-verified) instead of getSession() (JWT-only).
 */
export async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, error: unauthorizedError() };
  }

  return { user, error: null };
}

/**
 * Ensure the authenticated user exists in our Prisma User table.
 * Creates the user record if it doesn't exist (first login after Supabase signup).
 */
export async function ensurePrismaUser(supabaseUser: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}) {
  const userData = {
    email: supabaseUser.email ?? "",
    displayName:
      (supabaseUser.user_metadata?.full_name as string) ??
      (supabaseUser.user_metadata?.name as string) ??
      null,
    avatarUrl:
      (supabaseUser.user_metadata?.avatar_url as string) ?? null,
  };

  let dbUser;
  // Atomic User upsert with P2002 retry handling
  try {
    dbUser = await prisma.user.upsert({
      where: { id: supabaseUser.id },
      update: userData,
      create: {
        id: supabaseUser.id,
        ...userData,
      },
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      await new Promise(resolve => setTimeout(resolve, 100));
      dbUser = await prisma.user.upsert({
        where: { id: supabaseUser.id },
        update: userData,
        create: {
          id: supabaseUser.id,
          ...userData,
        },
      });
    } else {
      throw error;
    }
  }

  // Atomic UserProfile upsert with P2002 retry handling
  const profileData = {
    accountSize: 10000.0,
    maxRiskPercent: 1.0,
    preferredRR: 2.0,
    maxDrawdown: 10.0,
    winRate: 35.0,
    profitFactor: 0.85,
    avgWinLoss: 0.6,
    totalTrades: 12,
  };

  try {
    await prisma.userProfile.upsert({
      where: { userId: dbUser.id },
      update: {},
      create: {
        userId: dbUser.id,
        ...profileData,
      },
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      await new Promise(resolve => setTimeout(resolve, 100));
      await prisma.userProfile.upsert({
        where: { userId: dbUser.id },
        update: {},
        create: {
          userId: dbUser.id,
          ...profileData,
        },
      });
    } else {
      throw error;
    }
  }

  // Pre-seed sample database records if they haven't been seeded yet
  // Guard on trades count (not cache) so journal+trades are always seeded on first real login
  const tradeCount = await prisma.trade.count({ where: { userId: dbUser.id } });

  if (tradeCount === 0) {
    // 1. Seed Default Watchlist
    const existingWatchlist = await prisma.watchlist.findFirst({
      where: { userId: dbUser.id },
    });
    if (!existingWatchlist) {
      try {
        await prisma.watchlist.create({
          data: {
            userId: dbUser.id,
            name: "My Watchlist",
            instruments: ["BTC/USD", "ETH/USD", "SOL/USD"],
          },
        });
      } catch (e: any) {
        if (e.code !== "P2002") throw e;
      }
    }

    // 2. Pre-seed specific losing trades to test memory-awareness
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    await prisma.trade.createMany({
      data: [
        {
          userId: dbUser.id,
          instrument: "ETH/USD",
          assetClass: "CRYPTO",
          direction: "LONG",
          entryPrice: 3500.0,
          exitPrice: 3200.0,
          size: 1.5,
          pnl: -450.0,
          status: "CLOSED",
          openedAt: twoDaysAgo,
          closedAt: twoDaysAgo,
          emotionTag: "FOMO",
          mistakeTags: ["entered before confirmation", "moved stop loss"],
          notes: "Chased the bounce on ETH before MACD crossed bullish. Moved my stop loss lower when it went against me, making the loss 50% larger than planned.",
        },
        {
          userId: dbUser.id,
          instrument: "SOL/USD",
          assetClass: "CRYPTO",
          direction: "SHORT",
          entryPrice: 142.0,
          exitPrice: 148.0,
          size: 10.0,
          pnl: -60.0,
          status: "CLOSED",
          openedAt: oneDayAgo,
          closedAt: oneDayAgo,
          emotionTag: "REVENGE",
          mistakeTags: ["no stop loss", "revenge trading"],
          notes: "Shorted resistance at $142 on SOL because I was angry about the ETH loss. Did not set a hard stop. It broke higher to $148 before I manually cut it. Complete discipline failure.",
        }
      ]
    });

    // 3. Seed behavioral history events
    await prisma.behavioralEvent.createMany({
      data: [
        {
          userId: dbUser.id,
          eventType: "revenge_trade",
          description: "Opened new trade immediately after taking a loss on ETH/USD. No setup confirmation — pure emotional response.",
          instrument: "SOL/USD",
          createdAt: oneDayAgo,
        },
        {
          userId: dbUser.id,
          eventType: "overtrading",
          description: "Took 6 trades in a single session on ETH/USD, exceeding the 3-trade daily limit. Equity dropped 4.5% in one day.",
          instrument: "ETH/USD",
          createdAt: twoDaysAgo,
        },
        {
          userId: dbUser.id,
          eventType: "revenge_trade",
          description: "Second revenge attempt: re-entered ETH/USD long immediately after exiting the first losing trade.",
          instrument: "ETH/USD",
          createdAt: twoDaysAgo,
        }
      ]
    });

    // 4. Seed Journal Entries linked to the above trades
    await prisma.journalEntry.createMany({
      data: [
        {
          userId: dbUser.id,
          title: "ETH/USD Long — Confirmation Trap & Stop Loss Moved",
          mood: "FEARFUL",
          body: "Entered ETH/USD long at $3,500 before MACD crossed bullish. The setup wasn't confirmed — I was chasing the bounce after a big green candle. When price started reversing, instead of accepting the loss at my planned stop, I moved my stop from $3,400 down to $3,200 and held. That one decision turned a -$150 controlled loss into a -$450 disaster. Lesson: never move a stop wider to avoid being stopped out.",
          lessonsLearned: "Never enter before confirmation. Never move a stop loss wider. The stop IS the plan.",
          createdAt: twoDaysAgo,
        },
        {
          userId: dbUser.id,
          title: "SOL/USD Revenge Short — No Stop Loss, Full Discipline Failure",
          mood: "REVENGE",
          body: "After the ETH loss I was furious. I saw SOL at $142 resistance and shorted it without a plan, without a stop loss, just to 'make back' the ETH loss. It squeezed up to $148 before I manually cut the position. This was textbook revenge trading. I knew better and still did it.",
          lessonsLearned: "Never trade angry. Every trade needs a hard stop before entry — non-negotiable. Revenge trading compounds losses, it never recovers them.",
          createdAt: oneDayAgo,
        }
      ]
    });

    const btcUsdAnalysis = {
      marketRegime: "Consolidating above local support with bullish trend continuation favored.",
      bias: "BUY/LONG",
      support: "92000",
      resistance: "94800",
      setupQuality: "A+ SELECT",
      riskLevel: "Low",
      confidence: "HIGH",
      invalidationLevel: "91500",
      rsi: 62.4,
      rsiLabel: "Strong bullish momentum",
      whyItMatters: "Defended key consolidation zone at $92,000 with strong volume backing trend continuation.",
      entryIdeas: "Limit orders in the $92,200 to $92,800 zone.",
      stopLossIdea: "91500",
      takeProfitIdea: "98000",
      shortTermScenario: "Minor consolidation above $92,000 followed by a breakout drive towards $95,000.",
      coachNarrative: "Analysis Source: TradePilot Telemetry | Symbol: BTC/USD | TF: 4h | Price: $92,450.50 | Status: Synchronized\n\nSUMMARY\nBTC/USD is consolidating above local support with bullish trend continuation favored.\n\nTECHNICALS\n- RSI(14): 62.4 — Strong bullish momentum\n- MACD: Bullish crossover confirmed, histogram expanding\n- EMA 9/21: Bullish structure holding on 4H candles\n\nKEY LEVELS\n- Support: $92,000 (Swing-low detector, pivot touch)\n- Resistance: $94,800 (Swing-high detector, pivot touch)\n\nWHAT TO WATCH\n- Volume remains steady. Wait for the 4H close above $93,000 to confirm entry conviction.",
      sourceMetadata: {
        symbolSource: "User watchlist / active selection (BTC/USD)",
        timeframeSource: "Selected chart interval (4h)",
        priceSource: "Binance spot real-time ticker ($92,450.50)",
        rsiSource: "RSI(14) calculated from close prices (62.40)",
        supportSource: "Swing-low detector ($92,000)",
        resistanceSource: "Swing-high detector ($94,800)",
        entrySource: "Fibonacci retracement zone between $92,000 & $94,800",
        stopLossSource: "Structural invalidation level below support ($91,500)",
        takeProfitSource: "Target liquidity zone near resistance ($98,000)",
        confidenceSource: "RSI (62.40) + MACD + EMA alignment score",
        aiModelSource: "NVIDIA NIM Multi-Model Early-Return Race",
      },
      indicators: {
        rsi: 62.4,
        rsiLabel: "Strong bullish momentum",
        macd: { macd: 145.2, signal: 120.1 },
      },
      levels: {
        support: 92000,
        resistance: 94800,
        invalidation: 91500,
      },
    };

    try {
      await prisma.conversationMemory.createMany({
        data: [
          {
            userId: dbUser.id,
            chatId: "BTC/USD-4h",
            role: "cached_analysis",
            content: JSON.stringify(btcUsdAnalysis),
          },
          {
            userId: dbUser.id,
            chatId: "BTC/USDT-4h",
            role: "cached_analysis",
            content: JSON.stringify({
              ...btcUsdAnalysis,
              coachNarrative: btcUsdAnalysis.coachNarrative.replace(/BTC\/USD/g, "BTC/USDT")
            }),
          }
        ]
      });
    } catch (e: any) {
      if (e.code !== "P2002") throw e;
    }
  }

  // Journal backfill: existing users who have trades but NO journal entries (covers prior demo accounts)
  if (tradeCount > 0) {
    const journalCount = await prisma.journalEntry.count({ where: { userId: dbUser.id } });
    if (journalCount === 0) {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      try {
        await prisma.journalEntry.createMany({
          data: [
            {
              userId: dbUser.id,
              title: "ETH/USD Long — Confirmation Trap & Stop Loss Moved",
              mood: "FEARFUL",
              body: "Entered ETH/USD long at $3,500 before MACD crossed bullish. The setup wasn't confirmed — I was chasing the bounce after a big green candle. When price started reversing, instead of accepting the loss at my planned stop, I moved my stop from $3,400 down to $3,200 and held. That one decision turned a -$150 controlled loss into a -$450 disaster.\n\nLessons Learned: Never enter before confirmation. Never move a stop loss wider. The stop IS the plan.",
              createdAt: twoDaysAgo,
            },
            {
              userId: dbUser.id,
              title: "SOL/USD Revenge Short — No Stop Loss, Full Discipline Failure",
              mood: "REVENGE",
              body: "After the ETH loss I was furious. I saw SOL at $142 resistance and shorted it without a plan, without a stop loss, just to 'make back' the ETH loss. It squeezed up to $148 before I manually cut the position. This was textbook revenge trading. I knew better and still did it.\n\nLessons Learned: Never trade angry. Every trade needs a hard stop before entry — non-negotiable.",
              createdAt: oneDayAgo,
            },
          ],
        });
      } catch (e: any) {
        if (e.code !== "P2002") console.error("Journal backfill failed:", e);
      }
    }
  }

  return dbUser;
}

/**
 * Combined helper: authenticate + ensure DB user exists.
 * Returns the Prisma User record or an error NextResponse.
 */
export async function getAuthenticatedUser() {
  const { user: supabaseUser, error } = await getAuthUser();
  if (error || !supabaseUser) {
    return { user: null, error: error ?? unauthorizedError() };
  }

  const dbUser = await ensurePrismaUser(supabaseUser);
  return { user: dbUser, error: null };
}
