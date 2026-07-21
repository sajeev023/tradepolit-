import {
  isDemoUser as checkIsDemo,
  getEntitlement,
  DEMO_USER_EMAILS,
  DEMO_USER_IDS,
  getRemainingAnalyses as calcRemainingAnalyses,
  getRemainingAlerts as calcRemainingAlerts,
  isSessionExpired as checkSessionExpired,
  getSessionExpiry as calcSessionExpiry,
  getAnalysisLimitError as calcAnalysisLimitError,
  getAlertLimitError as calcAlertLimitError,
} from "./entitlements";

export const DEMO_LIMITS = {
  maxAnalyses: 3,
  maxAlerts: 1,
  maxSessionMinutes: 15,
  allowJournal: false,
  allowWatchlistEdit: false,
  allowDashboard: false,
  allowMarketOverview: false,
  allowSavedAnalyses: false,
  saveChatHistory: false,
  isPreviewMode: true,
} as const;

export const DEMO_USER_EMAILS_LIST = DEMO_USER_EMAILS;
export const DEMO_USER_IDS_LIST = DEMO_USER_IDS;

export function isDemoUser(userId: string, email?: string): boolean {
  return checkIsDemo(userId, email);
}

export function getDemoLimits() {
  return DEMO_LIMITS;
}

export function getRemainingAnalyses(demoAnalysesUsed: number): number {
  return calcRemainingAnalyses(getEntitlement("YC_DEMO"), demoAnalysesUsed);
}

export function getRemainingAlerts(demoAlertsUsed: number): number {
  return calcRemainingAlerts(getEntitlement("YC_DEMO"), demoAlertsUsed);
}

export function isDemoSessionExpired(sessionCreatedAt: Date): boolean {
  return checkSessionExpired(sessionCreatedAt, getEntitlement("YC_DEMO"));
}

export function getDemoSessionExpiry(sessionCreatedAt: Date): Date {
  return calcSessionExpiry(sessionCreatedAt, getEntitlement("YC_DEMO"));
}

export function getDemoAnalysisLimitError(analysesUsed: number) {
  return calcAnalysisLimitError(getEntitlement("YC_DEMO"), analysesUsed);
}

export function getDemoAlertLimitError() {
  return calcAlertLimitError(getEntitlement("YC_DEMO"));
}

export function getDemoSessionExpiredError() {
  return {
    error: "DEMO_SESSION_EXPIRED" as const,
    message: "Your 15-minute preview session has expired. Create a free account to continue.",
    cta: "Create Free Account",
    ctaLink: "/signup?expired=demo",
  };
}

export function getDemoFeatureLockedError(feature: string) {
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
