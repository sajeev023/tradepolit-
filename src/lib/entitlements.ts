export type Plan = "YC_DEMO" | "FREE" | "PRO";

export interface Entitlement {
  plan: Plan;
  analysisLimit: number;
  alertLimit: number;
  isUnlimitedAnalyses: boolean;
  isUnlimitedAlerts: boolean;
  canSaveAnalyses: boolean;
  canUseJournal: boolean;
  canUseDashboard: boolean;
  canUseMarketOverview: boolean;
  canEditWatchlist: boolean;
  canSaveChatHistory: boolean;
  sessionDurationMinutes: number | null;
}

export const ENTITLEMENTS: Record<Plan, Entitlement> = {
  YC_DEMO: {
    plan: "YC_DEMO",
    analysisLimit: 2,
    alertLimit: 1,
    isUnlimitedAnalyses: false,
    isUnlimitedAlerts: false,
    canSaveAnalyses: false,
    canUseJournal: false,
    canUseDashboard: false,
    canUseMarketOverview: false,
    canEditWatchlist: false,
    canSaveChatHistory: false,
    sessionDurationMinutes: 15,
  },
  FREE: {
    plan: "FREE",
    analysisLimit: 5,
    alertLimit: 3,
    isUnlimitedAnalyses: false,
    isUnlimitedAlerts: false,
    canSaveAnalyses: true,
    canUseJournal: true,
    canUseDashboard: false,
    canUseMarketOverview: false,
    canEditWatchlist: true,
    canSaveChatHistory: true,
    sessionDurationMinutes: null,
  },
  PRO: {
    plan: "PRO",
    analysisLimit: Infinity,
    alertLimit: Infinity,
    isUnlimitedAnalyses: true,
    isUnlimitedAlerts: true,
    canSaveAnalyses: true,
    canUseJournal: true,
    canUseDashboard: true,
    canUseMarketOverview: true,
    canEditWatchlist: true,
    canSaveChatHistory: true,
    sessionDurationMinutes: null,
  },
};

export const DEMO_USER_EMAILS = ["partner@tradcopilot.com", "trader@tradcopilot.com"] as const;
export const DEMO_USER_IDS = ["partner-1234-1234-1234-123456789012", "12345678-1234-1234-1234-123456789012"] as const;

export const PRO_USER_EMAILS = [
  "sajeevajay683@gmail.com",
  "vanimadari123@gmail.com",
  "ashokmummini.msc@gmail.com",
] as const;

export function isProEmail(email?: string): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  return PRO_USER_EMAILS.includes(normalized as any);
}

export function isDemoUser(userId: string, email?: string): boolean {
  if (DEMO_USER_IDS.includes(userId as any)) return true;
  if (email && DEMO_USER_EMAILS.includes(email as any)) return true;
  return false;
}

/**
 * Resolve the effective plan for a user. Pro can come from: a permanent PRO
 * email (PRO_USER_EMAILS), a `plan: "PRO"` profile, or an `ACTIVE`/`PRO_ACTIVE`
 * subscription status written by the Stripe webhook.
 *
 * The Stripe webhook writes `subscriptionStatus = "ACTIVE"` together with
 * `subscriptionExpiresAt = current_period_end`, and Stripe sends
 * `customer.subscription.deleted` on expiry (→ INACTIVE). Verified: the
 * webhook only sets ACTIVE for Stripe `status === "active" | "trialing"`, so
 * treating "ACTIVE" as PRO is correct. As a defensive guard against a missed
 * or dropped `subscription.deleted` event leaving a stale ACTIVE row, when an
 * expiry is recorded we refuse to grant PRO past that expiry. Callers that
 * don't pass an expiry (legacy paths, tests) preserve the prior behavior and
 * trust the status as-is.
 */
export function resolvePlan(
  userId: string,
  email?: string,
  dbPlan?: string,
  dbSubscriptionStatus?: string,
  dbSubscriptionExpiresAt?: string | Date | null
): Plan {
  if (isDemoUser(userId, email)) return "YC_DEMO";
  if (isProEmail(email)) return "PRO";
  const isProFromDb =
    dbPlan === "PRO" || dbSubscriptionStatus === "PRO_ACTIVE" || dbSubscriptionStatus === "ACTIVE";
  if (isProFromDb) {
    if (dbSubscriptionExpiresAt != null) {
      const exp =
        dbSubscriptionExpiresAt instanceof Date
          ? dbSubscriptionExpiresAt.getTime()
          : new Date(dbSubscriptionExpiresAt).getTime();
      if (!Number.isNaN(exp) && exp < Date.now()) return "FREE";
    }
    return "PRO";
  }
  return "FREE";
}

export function getEntitlement(plan: Plan): Entitlement {
  return ENTITLEMENTS[plan];
}

export function getEntitlementForUser(
  userId: string,
  email?: string,
  dbPlan?: string,
  dbSubscriptionStatus?: string,
  dbSubscriptionExpiresAt?: string | Date | null
): Entitlement {
  const plan = resolvePlan(userId, email, dbPlan, dbSubscriptionStatus, dbSubscriptionExpiresAt);
  return getEntitlement(plan);
}

export function getRemainingAnalyses(entitlement: Entitlement, usedCount: number): number {
  if (entitlement.isUnlimitedAnalyses) return Infinity;
  return Math.max(0, entitlement.analysisLimit - usedCount);
}

export function getRemainingAlerts(entitlement: Entitlement, usedCount: number): number {
  if (entitlement.isUnlimitedAlerts) return Infinity;
  return Math.max(0, entitlement.alertLimit - usedCount);
}

export function isSessionExpired(sessionCreatedAt: Date, entitlement: Entitlement): boolean {
  if (!entitlement.sessionDurationMinutes) return false;
  const elapsedMinutes = (Date.now() - sessionCreatedAt.getTime()) / 1000 / 60;
  return elapsedMinutes > entitlement.sessionDurationMinutes;
}

export function getSessionExpiry(sessionCreatedAt: Date, entitlement: Entitlement): Date {
  const duration = entitlement.sessionDurationMinutes ?? 15;
  return new Date(sessionCreatedAt.getTime() + duration * 60 * 1000);
}

export function getAnalysisLimitError(entitlement: Entitlement, _analysesUsed: number) {
  if (entitlement.plan === "YC_DEMO") {
    return {
      error: "PREVIEW_LIMIT_REACHED" as const,
      message: `You've used your 2 free AI analyses. Create a free account to continue.`,
      cta: "Create Free Account",
      ctaLink: "/signup",
    };
  }
  return {
    error: "FORBIDDEN" as const,
    message: "Daily analysis limit reached. Upgrade to Pro for unlimited analyses.",
    cta: "Upgrade to Pro",
    ctaLink: "/pricing",
  };
}

export function getAlertLimitError(entitlement: Entitlement) {
  if (entitlement.plan === "YC_DEMO") {
    return {
      error: "PREVIEW_LIMIT_REACHED" as const,
      message: "Preview mode allows 1 alert. Create a free account for 3 alerts per day.",
      cta: "Create Free Account",
      ctaLink: "/signup",
    };
  }
  return {
    error: "FORBIDDEN" as const,
    message: "Daily alert limit reached. Upgrade to Pro for unlimited alerts.",
    cta: "Upgrade to Pro",
    ctaLink: "/pricing",
  };
}

export function getSessionExpiredError() {
  return {
    error: "DEMO_SESSION_EXPIRED" as const,
    message: "Your 15-minute preview session has expired. Create a free account to continue.",
    cta: "Create Free Account",
    ctaLink: "/signup?expired=demo",
  };
}

export function getFeatureLockedError(feature: string) {
  const featureMessages: Record<string, string> = {
    journal: "Journal is available with a free account.",
    dashboard: "Performance dashboard is available with Pro.",
    marketOverview: "Market overview is available with Pro.",
    savedAnalyses: "Saved analyses are available with a free account.",
    watchlistEdit: "Customize your watchlist with a free account.",
    chatHistory: "Chat history is saved with a free account.",
  };
  return {
    error: "FEATURE_LOCKED" as const,
    message: featureMessages[feature] || "This feature requires a free account.",
    cta: "Create Free Account",
    ctaLink: "/signup",
  };
}
