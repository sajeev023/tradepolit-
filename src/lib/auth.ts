import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { unauthorizedError } from "@/lib/api-helpers";
import { isProEmail } from "@/lib/entitlements";
import { verifyDemoSession } from "@/lib/demo-session";

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

  if (!error && user) {
    return { user, error: null };
  }

  // Signed demo-session fallback for YC Instant Demo mode. The demo identity
  // comes from a server-issued HMAC-signed cookie — never from a client-set
  // email cookie — so a visitor cannot escalate to PRO by supplying a PRO
  // email. See src/lib/demo-session.ts.
  try {
    const demo = await verifyDemoSession();
    if (demo) {
      return {
        user: {
          id: demo.uid,
          email: demo.email,
          user_metadata: { full_name: "YC Demo Trader" },
          app_metadata: { role: "USER" },
          aud: "authenticated",
          created_at: new Date().toISOString(),
        } as any,
        error: null,
      };
    }
  } catch (_) {}

  return { user: null, error: unauthorizedError() };
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

  const userIsPro = isProEmail(supabaseUser.email);
  const proUpdates = userIsPro ? { plan: "PRO", subscriptionStatus: "PRO_ACTIVE" } : {};

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
    ...proUpdates,
  };

  try {
    await prisma.userProfile.upsert({
      where: { userId: dbUser.id },
      update: proUpdates,
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
        update: proUpdates,
        create: {
          userId: dbUser.id,
          ...profileData,
        },
      });
    } else {
      throw error;
    }
  }

  // Seed only a default watchlist for new users. No fabricated trades, journal
  // entries, behavioral events, or cached analyses — those destroy product
  // integrity for YC demos and early users.
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
