import {
  resolvePlan,
  getEntitlement,
  getRemainingAnalyses,
  isDemoUser,
  isSessionExpired,
  getAnalysisLimitError,
  getAlertLimitError,
} from "../lib/entitlements";
import { describe, it, expect } from "vitest";

describe("resolvePlan", () => {
  it("returns YC_DEMO for known demo email", () => {
    expect(resolvePlan("any-id", "partner@tradepilot.ai")).toBe("YC_DEMO");
    expect(resolvePlan("any-id", "trader@tradepilot.app")).toBe("YC_DEMO");
  });

  it("returns YC_DEMO for known demo user ID", () => {
    expect(resolvePlan("partner-1234-1234-1234-123456789012")).toBe("YC_DEMO");
    expect(resolvePlan("12345678-1234-1234-1234-123456789012")).toBe("YC_DEMO");
  });

  it("returns PRO for PRO_ACTIVE subscription", () => {
    expect(resolvePlan("any-id", "user@example.com", "FREE", "PRO_ACTIVE")).toBe("PRO");
  });

  it("returns PRO for ACTIVE subscription", () => {
    expect(resolvePlan("any-id", "user@example.com", "FREE", "ACTIVE")).toBe("PRO");
  });

  it("returns PRO when dbPlan is PRO", () => {
    expect(resolvePlan("any-id", "user@example.com", "PRO", "INACTIVE")).toBe("PRO");
  });

  it("returns FREE for regular users", () => {
    expect(resolvePlan("any-id", "user@example.com", "FREE", "INACTIVE")).toBe("FREE");
  });
});

describe("YC_DEMO entitlement", () => {
  const demoEntitlement = getEntitlement("YC_DEMO");

  it("has exactly 3 analysis limit", () => {
    expect(demoEntitlement.analysisLimit).toBe(3);
  });

  it("has exactly 1 alert limit", () => {
    expect(demoEntitlement.alertLimit).toBe(1);
  });

  it("is not unlimited", () => {
    expect(demoEntitlement.isUnlimitedAnalyses).toBe(false);
    expect(demoEntitlement.isUnlimitedAlerts).toBe(false);
  });

  it("blocks feature access", () => {
    expect(demoEntitlement.canSaveAnalyses).toBe(false);
    expect(demoEntitlement.canUseJournal).toBe(false);
    expect(demoEntitlement.canUseDashboard).toBe(false);
    expect(demoEntitlement.canEditWatchlist).toBe(false);
    expect(demoEntitlement.canSaveChatHistory).toBe(false);
  });

  it("has 15-minute session duration", () => {
    expect(demoEntitlement.sessionDurationMinutes).toBe(15);
  });
});

describe("FREE entitlement", () => {
  const freeEntitlement = getEntitlement("FREE");

  it("has 5 analysis limit", () => {
    expect(freeEntitlement.analysisLimit).toBe(5);
  });

  it("has 3 alert limit", () => {
    expect(freeEntitlement.alertLimit).toBe(3);
  });

  it("allows journal, watchlist, chat history", () => {
    expect(freeEntitlement.canUseJournal).toBe(true);
    expect(freeEntitlement.canEditWatchlist).toBe(true);
    expect(freeEntitlement.canSaveChatHistory).toBe(true);
  });

  it("does not allow dashboard or market overview", () => {
    expect(freeEntitlement.canUseDashboard).toBe(false);
    expect(freeEntitlement.canUseMarketOverview).toBe(false);
  });

  it("has no session limit", () => {
    expect(freeEntitlement.sessionDurationMinutes).toBeNull();
  });
});

describe("PRO entitlement", () => {
  const proEntitlement = getEntitlement("PRO");

  it("is unlimited", () => {
    expect(proEntitlement.isUnlimitedAnalyses).toBe(true);
    expect(proEntitlement.isUnlimitedAlerts).toBe(true);
    expect(proEntitlement.analysisLimit).toBe(Infinity);
  });

  it("allows all features", () => {
    expect(proEntitlement.canSaveAnalyses).toBe(true);
    expect(proEntitlement.canUseJournal).toBe(true);
    expect(proEntitlement.canUseDashboard).toBe(true);
    expect(proEntitlement.canUseMarketOverview).toBe(true);
    expect(proEntitlement.canEditWatchlist).toBe(true);
    expect(proEntitlement.canSaveChatHistory).toBe(true);
  });
});

describe("getRemainingAnalyses", () => {
  it("returns correct remaining for YC_DEMO", () => {
    const entitlement = getEntitlement("YC_DEMO");
    expect(getRemainingAnalyses(entitlement, 0)).toBe(3);
    expect(getRemainingAnalyses(entitlement, 1)).toBe(2);
    expect(getRemainingAnalyses(entitlement, 2)).toBe(1);
    expect(getRemainingAnalyses(entitlement, 3)).toBe(0);
    expect(getRemainingAnalyses(entitlement, 5)).toBe(0);
  });

  it("returns Infinity for PRO", () => {
    expect(getRemainingAnalyses(getEntitlement("PRO"), 999)).toBe(Infinity);
  });

  it("returns correct remaining for FREE", () => {
    const entitlement = getEntitlement("FREE");
    expect(getRemainingAnalyses(entitlement, 0)).toBe(5);
    expect(getRemainingAnalyses(entitlement, 3)).toBe(2);
    expect(getRemainingAnalyses(entitlement, 5)).toBe(0);
  });
});

describe("isDemoUser", () => {
  it("identifies demo users by email", () => {
    expect(isDemoUser("any-id", "partner@tradepilot.ai")).toBe(true);
    expect(isDemoUser("any-id", "trader@tradepilot.app")).toBe(true);
  });

  it("identifies demo users by ID", () => {
    expect(isDemoUser("partner-1234-1234-1234-123456789012")).toBe(true);
    expect(isDemoUser("12345678-1234-1234-1234-123456789012")).toBe(true);
  });

  it("rejects regular users", () => {
    expect(isDemoUser("regular-user-id", "user@example.com")).toBe(false);
    expect(isDemoUser("regular-user-id")).toBe(false);
  });
});

describe("isSessionExpired", () => {
  const demoEntitlement = getEntitlement("YC_DEMO");

  it("returns false for recent session", () => {
    const recent = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
    expect(isSessionExpired(recent, demoEntitlement)).toBe(false);
  });

  it("returns true for expired session", () => {
    const old = new Date(Date.now() - 20 * 60 * 1000); // 20 minutes ago
    expect(isSessionExpired(old, demoEntitlement)).toBe(true);
  });

  it("returns false when no session limit", () => {
    const old = new Date(Date.now() - 999 * 60 * 1000);
    expect(isSessionExpired(old, getEntitlement("FREE"))).toBe(false);
    expect(isSessionExpired(old, getEntitlement("PRO"))).toBe(false);
  });
});

describe("getAnalysisLimitError", () => {
  it("returns PREVIEW_LIMIT_REACHED for YC_DEMO", () => {
    const error = getAnalysisLimitError(getEntitlement("YC_DEMO"), 3);
    expect(error.error).toBe("PREVIEW_LIMIT_REACHED");
    expect(error.cta).toBe("Create Free Account");
    expect(error.ctaLink).toBe("/signup");
  });

  it("returns FORBIDDEN for FREE", () => {
    const error = getAnalysisLimitError(getEntitlement("FREE"), 5);
    expect(error.error).toBe("FORBIDDEN");
    expect(error.cta).toBe("Upgrade to Pro");
  });
});

describe("getAlertLimitError", () => {
  it("returns PREVIEW_LIMIT_REACHED for YC_DEMO alerts", () => {
    const error = getAlertLimitError(getEntitlement("YC_DEMO"));
    expect(error.error).toBe("PREVIEW_LIMIT_REACHED");
  });

  it("returns FORBIDDEN for FREE alerts", () => {
    const error = getAlertLimitError(getEntitlement("FREE"));
    expect(error.error).toBe("FORBIDDEN");
  });
});
