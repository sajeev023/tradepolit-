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
        },
      },
    },
  });
  if (!dbUser) return null;
  return {
    ...dbUser,
    profilePlan: dbUser.profile?.plan ?? null,
    profileSubscriptionStatus: dbUser.profile?.subscriptionStatus ?? null,
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

  if (!isSameDay) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        analysesCountToday: 0,
        alertsCountToday: 0,
        lastUsageReset: now,
      },
    });
    return { analysesCount: 0, alertsCount: 0 };
  }

  return {
    analysesCount: dbUser.analysesCountToday,
    alertsCount: dbUser.alertsCountToday,
  };
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
    dbUser.profileSubscriptionStatus ?? undefined
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
    dbUser.profileSubscriptionStatus ?? undefined
  );

  // Pro users: no tracking needed
  if (entitlement.isUnlimitedAnalyses && entitlement.isUnlimitedAlerts) return true;

  // Check limit before recording
  const { analysesCount, alertsCount } = await ensureDailyReset(userId, dbUser);

  const currentCount = type === "analyses" ? analysesCount : alertsCount;
  const limit = type === "analyses" ? entitlement.analysisLimit : entitlement.alertLimit;

  if (currentCount >= limit) return false;

  // Atomic increment (race-condition safe)
  if (type === "analyses") {
    await prisma.user.update({
      where: { id: userId },
      data: { analysesCountToday: { increment: 1 } },
    });
  } else {
    await prisma.user.update({
      where: { id: userId },
      data: { alertsCountToday: { increment: 1 } },
    });
  }

  return true;
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
    dbUser.profileSubscriptionStatus ?? undefined
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
