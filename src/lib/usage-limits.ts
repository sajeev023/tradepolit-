import { prisma } from "@/lib/prisma";
import { getEntitlementForUser, getRemainingAnalyses as calcRemaining, getRemainingAlerts as calcRemainingAlerts } from "@/lib/entitlements";

export const FREE_LIMITS = {
  dailyAnalyses: 5,
  dailyAlerts: 3,
  chatHistoryDays: 7,
  journalEntries: 20,
};

export async function checkAnalysisLimit(userId: string, userEmail?: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { analysesCountToday: true, lastUsageReset: true, subscriptionStatus: true },
  });
  if (!user) return false;

  const entitlement = getEntitlementForUser(userId, userEmail, user.subscriptionStatus, user.subscriptionStatus);
  if (entitlement.isUnlimitedAnalyses) return true;

  const now = new Date();
  const lastReset = new Date(user.lastUsageReset);
  const isSameDay =
    now.getUTCFullYear() === lastReset.getUTCFullYear() &&
    now.getUTCMonth() === lastReset.getUTCMonth() &&
    now.getUTCDate() === lastReset.getUTCDate();

  const count = isSameDay ? user.analysesCountToday : 0;

  if (!isSameDay) {
    await prisma.user.update({
      where: { id: userId },
      data: { analysesCountToday: 0, alertsCountToday: 0, lastUsageReset: now },
    });
  }

  return count < entitlement.analysisLimit;
}

export async function incrementAnalysisCount(userId: string, userEmail?: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { analysesCountToday: true, subscriptionStatus: true },
  });
  if (!user) return;

  const entitlement = getEntitlementForUser(userId, userEmail, user.subscriptionStatus, user.subscriptionStatus);
  if (entitlement.isUnlimitedAnalyses) return;

  if (user.analysesCountToday < entitlement.analysisLimit) {
    await prisma.user.update({
      where: { id: userId },
      data: { analysesCountToday: { increment: 1 } },
    });
  }
}

export async function checkAlertLimit(userId: string, userEmail?: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { alertsCountToday: true, lastUsageReset: true, subscriptionStatus: true },
  });
  if (!user) return false;

  const entitlement = getEntitlementForUser(userId, userEmail, user.subscriptionStatus, user.subscriptionStatus);
  if (entitlement.isUnlimitedAlerts) return true;

  const now = new Date();
  const lastReset = new Date(user.lastUsageReset);
  const isSameDay =
    now.getUTCFullYear() === lastReset.getUTCFullYear() &&
    now.getUTCMonth() === lastReset.getUTCMonth() &&
    now.getUTCDate() === lastReset.getUTCDate();

  const count = isSameDay ? user.alertsCountToday : 0;

  if (!isSameDay) {
    await prisma.user.update({
      where: { id: userId },
      data: { analysesCountToday: 0, alertsCountToday: 0, lastUsageReset: now },
    });
  }

  return count < entitlement.alertLimit;
}

export async function incrementAlertCount(userId: string, userEmail?: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { alertsCountToday: true, subscriptionStatus: true },
  });
  if (!user) return;

  const entitlement = getEntitlementForUser(userId, userEmail, user.subscriptionStatus, user.subscriptionStatus);
  if (entitlement.isUnlimitedAlerts) return;

  if (user.alertsCountToday < entitlement.alertLimit) {
    await prisma.user.update({
      where: { id: userId },
      data: { alertsCountToday: { increment: 1 } },
    });
  }
}

export function getRemainingAnalyses(profile: any): number {
  if (!profile) return 0;
  if (profile.plan === "PRO") return Infinity;
  const limit = profile.plan === "YC_DEMO" ? 3 : FREE_LIMITS.dailyAnalyses;
  return Math.max(0, limit - (profile.dailyAnalysisCount ?? 0));
}

export function getRemainingAlerts(profile: any): number {
  if (!profile) return 0;
  if (profile.plan === "PRO") return Infinity;
  const limit = profile.plan === "YC_DEMO" ? 1 : FREE_LIMITS.dailyAlerts;
  return Math.max(0, limit - (profile.dailyAlertCount ?? 0));
}
