import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { unauthorizedError, forbiddenError } from "@/lib/api-helpers";
import { cookies } from "next/headers";
import { decodeDemoCookie } from "@/lib/demo-session";
import { CRYPTO_SYMBOLS } from "@/lib/market-registry";

/**
 * Single source of truth for admin authorization (M-1 fix).
 *
 * Previously the middleware checked Supabase `app_metadata.role` while API
 * routes checked the Prisma `User.role` column — two stores that could
 * diverge. Now both read the Prisma DB, fetched once here. Demo sessions are
 * never admin.
 */
export async function requireAdmin(
  supabaseUserId: string,
  isDemo: boolean
): Promise<{ ok: true } | { ok: false; response: ReturnType<typeof forbiddenError | typeof unauthorizedError> }> {
  if (isDemo) return { ok: false, response: forbiddenError() };
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: supabaseUserId },
      select: { role: true },
    });
    if (!dbUser) return { ok: false, response: unauthorizedError() };
    if (dbUser.role !== "ADMIN") return { ok: false, response: forbiddenError() };
    return { ok: true };
  } catch {
    return { ok: false, response: unauthorizedError() };
  }
}

/**
 * Get the authenticated user from the Supabase session.
 * Use in API routes to enforce authentication.
 * Always uses getUser() (server-verified) instead of getSession() (JWT-only).
 *
 * Demo sessions are validated via a server-signed HMAC cookie (lib/demo-session.ts).
 * The email from a demo cookie is never used for plan resolution — demo plan
 * is always YC_DEMO regardless of the (random, non-meaningful) demo email.
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

  // Demo session fallback — only if the signed cookie validates.
  try {
    const cookieStore = await cookies();
    const demoCookie = cookieStore.get("tp-demo-session")?.value;
    const demoSession = demoCookie ? await decodeDemoCookie(demoCookie) : null;
    if (demoSession) {
      return {
        user: {
          id: demoSession.id,
          email: demoSession.email,
          user_metadata: { full_name: "Demo Trader" },
          app_metadata: { role: "USER" },
          aud: "authenticated",
          created_at: new Date(demoSession.issuedAt).toISOString(),
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

  // IMPORTANT: Plan is NEVER derived from the user's email. The PRO email
  // allowlist (if any) is a beta-access tool resolved separately in
  // entitlements — it must never be written here from client-influenced
  // input. New signups always start FREE; upgrades happen via Stripe webhook.
  const proUpdates = {};

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
          // Seed the default watchlist with crypto symbols from the registry.
          instruments: CRYPTO_SYMBOLS.length > 0 ? CRYPTO_SYMBOLS.slice(0, 3) : ["BTC/USD", "ETH/USD", "SOL/USD"],
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

  try {
    const dbUser = await ensurePrismaUser(supabaseUser);
    return { user: dbUser, error: null };
  } catch (err) {
    console.warn("[AUTH] Failed to sync Prisma user record (non-fatal, proceeding with session user):", err);
    return {
      user: {
        id: supabaseUser.id,
        email: supabaseUser.email ?? "",
        displayName:
          (supabaseUser.user_metadata?.full_name as string) ??
          (supabaseUser.user_metadata?.name as string) ??
          "Trader",
        role: "USER",
        analysesCountToday: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any,
      error: null,
    };
  }
}
