import { prisma } from "@/lib/prisma";
import { getEntitlementForUser, getRemainingAnalyses, getRemainingAlerts } from "@/lib/entitlements";

export interface LimitCheckResult {
  allowed: boolean;
  remaining: number;
  isPro: boolean;
  isDemo: boolean;
  analysesUsed: number;
  alertsUsed: number;
  limit: number;
  plan: string;
}

interface UserWithReset {
  id: string;
  analysesCountToday: number;
  alertsCountToday: number;
  lastUsageReset: Date;
  email: string | null;
  profilePlan: string | null;
  profileSubscriptionStatus: string | null;
  profileSubscriptionExpiresAt: Date | null;
}

async function getDbUserWithReset(userId: string): Promise<UserWithReset | null> {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      analysesCountToday: true,
      alertsCountToday: true,
      lastUsageReset: true,
      email: true,
      profile: {
        select: {
          plan: true,
          subscriptionStatus: true,
          subscriptionExpiresAt: true,
        },
      },
    },
  });
  if (!dbUser) return null;
  return {
    ...dbUser,
    profilePlan: dbUser.profile?.plan ?? null,
    profileSubscriptionStatus: dbUser.profile?.subscriptionStatus ?? null,
    profileSubscriptionExpiresAt: dbUser.profile?.subscriptionExpiresAt ?? null,
  };
}

async function ensureDailyReset(
  userId: string,
  dbUser: Pick<UserWithReset, "analysesCountToday" | "alertsCountToday" | "lastUsageReset">
): Promise<{ analysesCount: number; alertsCount: number }> {
  const now = new Date();
  const lastReset = new Date(dbUser.lastUsageReset);
  const isSameDay =
    now.getUTCFullYear() === lastReset.getUTCFullYear() &&
    now.getUTCMonth() === lastReset.getUTCMonth() &&
    now.getUTCDate() === lastReset.getUTCDate();

  if (isSameDay) {
    return {
      analysesCount: dbUser.analysesCountToday,
      alertsCount: dbUser.alertsCountToday,
    };
  }

  // New UTC day. Atomically reset ONLY rows whose lastUsageReset is still from a
  // prior day. Two concurrent requests both observing isSameDay=false (from a
  // stale in-memory read) are serialized at the row level by this conditional
  // updateMany: exactly one resets (count === 1) and the other observes count
  // === 0 and re-reads the fresh counters. This replaces the prior
  // unconditional update that let concurrent requests both reset-and-increment,
  // double-counting usage around the day boundary.
  const startOfTodayUTC = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const result = await prisma.user.updateMany({
    where: { id: userId, lastUsageReset: { lt: startOfTodayUTC } },
    data: {
      analysesCountToday: 0,
      alertsCountToday: 0,
      lastUsageReset: now,
    },
  });

  if (result.count === 0) {
    // Another request already performed today's reset — re-read the fresh
    // counters so this request reports accurate usage.
    const fresh = await prisma.user.findUnique({
      where: { id: userId },
      select: { analysesCountToday: true, alertsCountToday: true },
    });
    return {
      analysesCount: fresh?.analysesCountToday ?? 0,
      alertsCount: fresh?.alertsCountToday ?? 0,
    };
  }

  return { analysesCount: 0, alertsCount: 0 };
}

export async function checkUsageLimit(
  userId: string,
  type: "analyses" | "alerts",
  userEmail?: string
): Promise<LimitCheckResult> {
  const dbUser = await getDbUserWithReset(userId);
  if (!dbUser) {
    return {
      allowed: false,
      remaining: 0,
      isPro: false,
      isDemo: false,
      analysesUsed: 0,
      alertsUsed: 0,
      limit: 0,
      plan: "FREE",
    };
  }

  const entitlement = getEntitlementForUser(
    userId,
    userEmail,
    dbUser.profilePlan ?? undefined,
    dbUser.profileSubscriptionStatus ?? undefined,
    dbUser.profileSubscriptionExpiresAt
  );
  const { analysesCount, alertsCount } = await ensureDailyReset(userId, dbUser);
  const isPro = entitlement.isUnlimitedAnalyses;
  const isDemo = entitlement.plan === "YC_DEMO";

  if (type === "analyses") {
    const remaining = getRemainingAnalyses(entitlement, analysesCount);
    return {
      allowed: remaining > 0,
      remaining,
      isPro,
      isDemo,
      analysesUsed: analysesCount,
      alertsUsed: alertsCount,
      limit: entitlement.analysisLimit,
      plan: entitlement.plan,
    };
  }

  const remaining = getRemainingAlerts(entitlement, alertsCount);
  return {
    allowed: remaining > 0,
    remaining,
    isPro,
    isDemo,
    analysesUsed: analysesCount,
    alertsUsed: alertsCount,
    limit: entitlement.alertLimit,
    plan: entitlement.plan,
  };
}

export async function recordUsage(
  userId: string,
  type: "analyses" | "alerts",
  userEmail?: string
): Promise<boolean> {
  const dbUser = await getDbUserWithReset(userId);
  if (!dbUser) return false;

  const entitlement = getEntitlementForUser(
    userId,
    userEmail,
    dbUser.profilePlan ?? undefined,
    dbUser.profileSubscriptionStatus ?? undefined,
    dbUser.profileSubscriptionExpiresAt
  );

  // Pro users: no tracking needed
  if (entitlement.isUnlimitedAnalyses && entitlement.isUnlimitedAlerts) return true;

  // Reset day if needed (idempotent across concurrent requests)
  const { analysesCount, alertsCount } = await ensureDailyReset(userId, dbUser);

  const limit = type === "analyses" ? entitlement.analysisLimit : entitlement.alertLimit;
  const currentCount = type === "analyses" ? analysesCount : alertsCount;

  // Fast path: if already over limit, skip the conditional update.
  if (currentCount >= limit) return false;

  // Atomic conditional increment — only increments if the current DB value is
  // still below the limit. Two concurrent requests that both passed the
  // fast-path check above are serialized at the row level by Prisma's
  // updateMany; only one will see count === 1 when the limit is exactly hit.
  // This replaces the prior read-then-write pattern that allowed concurrent
  // requests to both pass the check and both increment, bypassing the quota.
  const countField = type === "analyses" ? "analysesCountToday" : "alertsCountToday";
  const result = await prisma.user.updateMany({
    where: {
      id: userId,
      [countField]: { lt: limit },
    },
    data: {
      [countField]: { increment: 1 },
    },
  });

  return result.count === 1;
}

export async function getCurrentUsage(
  userId: string,
  userEmail?: string
): Promise<{
  analysesUsed: number;
  alertsUsed: number;
  analysesRemaining: number;
  alertsRemaining: number;
  limit: number;
  alertLimit: number;
  plan: string;
  isDemo: boolean;
  isPro: boolean;
}> {
  const dbUser = await getDbUserWithReset(userId);
  if (!dbUser) {
    return {
      analysesUsed: 0,
      alertsUsed: 0,
      analysesRemaining: 0,
      alertsRemaining: 0,
      limit: 0,
      alertLimit: 0,
      plan: "FREE",
      isDemo: false,
      isPro: false,
    };
  }

  const entitlement = getEntitlementForUser(
    userId,
    userEmail,
    dbUser.profilePlan ?? undefined,
    dbUser.profileSubscriptionStatus ?? undefined,
    dbUser.profileSubscriptionExpiresAt
  );
  const { analysesCount, alertsCount } = await ensureDailyReset(userId, dbUser);

  return {
    analysesUsed: analysesCount,
    alertsUsed: alertsCount,
    analysesRemaining: getRemainingAnalyses(entitlement, analysesCount),
    alertsRemaining: getRemainingAlerts(entitlement, alertsCount),
    limit: entitlement.analysisLimit,
    alertLimit: entitlement.alertLimit,
    plan: entitlement.plan,
    isDemo: entitlement.plan === "YC_DEMO",
    isPro: entitlement.isUnlimitedAnalyses,
  };
}
