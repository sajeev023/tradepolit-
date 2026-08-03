import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Verifies the weekly-report endpoint is rate-limited per user (3 / 10 min)
// and remains PRO-gated. The endpoint runs a 2000-token AI race and had NO
// rate limit, so a PRO user could loop it to burn AI budget.

vi.mock("@/lib/auth", () => ({
  getAuthenticatedUser: vi.fn(async () => ({ user: { id: "u1", email: "free@example.com" }, error: null })),
}));
vi.mock("@/lib/rate-limit", () => ({
  checkUserRateLimit: vi.fn(() => ({
    result: { allowed: true, limit: 3, remaining: 2, resetAt: Date.now() + 600_000 },
    identifier: "u1",
  })),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    userProfile: {
      findUnique: vi.fn(async () => ({ plan: "PRO", subscriptionStatus: "ACTIVE" })),
    },
    trade: { findMany: vi.fn(async () => []) },
    behavioralEvent: { findMany: vi.fn(async () => []) },
    journalEntry: { findMany: vi.fn(async () => []) },
  },
}));
vi.mock("@/lib/ai-providers", () => ({
  callFastestAIModel: vi.fn(async () => ({ content: "# Weekly Report\n\nAll good.", provider: "groq", model: "x", duration: 1 } as any)),
}));
vi.mock("@/lib/nvidia-ai", () => ({
  handleNvidiaError: vi.fn(() => null),
}));

import { POST } from "@/app/api/v1/ai/weekly-report/route";
import { checkUserRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { callFastestAIModel } from "@/lib/ai-providers";

const req = () => new NextRequest("http://localhost/api/v1/ai/weekly-report", { method: "POST" });

describe("weekly-report rate limit + PRO gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkUserRateLimit).mockReturnValue({
      result: { allowed: true, limit: 3, remaining: 2, resetAt: Date.now() + 600_000 },
      identifier: "u1",
    });
    vi.mocked(prisma.userProfile.findUnique).mockResolvedValue({ plan: "PRO", subscriptionStatus: "ACTIVE" } as any);
  });

  it("returns 429 when the per-user rate limit is exceeded", async () => {
    vi.mocked(checkUserRateLimit).mockReturnValueOnce({
      result: { allowed: false, limit: 3, remaining: 0, resetAt: Date.now() + 60_000 },
      identifier: "u1",
    });
    const res = await POST(req());
    expect(res.status).toBe(429);
    // Must not reach the AI provider when rate-limited.
    expect(callFastestAIModel).not.toHaveBeenCalled();
  });

  it("returns 403 for a non-PRO user even when rate limit allows", async () => {
    vi.mocked(prisma.userProfile.findUnique).mockResolvedValueOnce({ plan: "FREE", subscriptionStatus: null } as any);
    const res = await POST(req());
    expect(res.status).toBe(403);
    expect(callFastestAIModel).not.toHaveBeenCalled();
  });

  it("generates the report for a PRO user within the rate limit", async () => {
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(callFastestAIModel).toHaveBeenCalledTimes(1);
    const body = await res.json();
    expect(body.data.report).toContain("Weekly Report");
  });
});