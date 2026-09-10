import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  getAuthenticatedUser: vi.fn().mockResolvedValue({
    user: {
      id: "test-user-id",
      email: "pro-trader@example.com",
    },
    error: null,
  }),
}));

vi.mock("@/lib/limit-checker", () => ({
  recordUsage: vi.fn().mockResolvedValue(true),
  checkUsageLimit: vi.fn().mockResolvedValue({ allowed: true, analysesUsed: 1 }),
}));

vi.mock("@/lib/entitlements", () => ({
  getEntitlementForUser: vi.fn().mockReturnValue({
    tier: "PRO",
    isUnlimitedAnalyses: true,
    maxAnalysesPerDay: 9999,
  }),
  getAnalysisLimitError: vi.fn().mockReturnValue(null),
}));

import { POST } from "@/app/api/v1/ai/analyze-chart/route";

describe("Direct route call to analyze-chart with auth mocked", () => {
  it("calls POST /api/v1/ai/analyze-chart with auth and unlimited usage", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/ai/analyze-chart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: "BTC/USD",
        timeframe: "4h",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.data.symbol).toBe("BTC/USD");
    expect(body.data.timeframe).toBe("4h");
    expect(body.data.entryIdeas).toBeDefined();
    expect(body.data.stopLossIdea).toBeDefined();
    expect(body.data.marketRegime).toBeDefined();
  }, 60000);
});
