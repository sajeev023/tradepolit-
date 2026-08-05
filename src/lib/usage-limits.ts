import { prisma } from "@/lib/prisma";
import { getEntitlementForUser } from "@/lib/entitlements";

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
