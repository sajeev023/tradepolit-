import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Verifies the alert-creation quota fix: the daily alert slot is reserved
// atomically (recordUsage) BEFORE the alert row is created, and released
// (releaseUsage) if the create subsequently fails. The prior check→create→
// record sequence allowed two concurrent requests to both pass the
// read-only check and both create an alert, exceeding the daily limit.
//
// Dependencies are mocked so the test asserts orchestration/ordering
// (the actual fix) without coupling to Prisma's updateMany internals.

vi.mock("@/lib/auth", () => ({
  getAuthenticatedUser: vi.fn(async () => ({ user: { id: "u1", email: "a@b.com" }, error: null })),
}));
vi.mock("@/lib/limit-checker", () => ({
  checkUsageLimit: vi.fn(async () => ({ allowed: true, isDemo: false, remaining: 5 })),
  recordUsage: vi.fn(async () => true),
  releaseUsage: vi.fn(async () => undefined),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    alert: {
      create: vi.fn(async () => ({
        id: "alert-1",
        userId: "u1",
        instrument: "BTC/USD",
        type: "PRICE",
        condition: { operator: "gt", value: 100000 },
        isActive: true,
      })),
    },
  },
}));

import { POST } from "@/app/api/v1/alerts/route";
import { getAuthenticatedUser } from "@/lib/auth";
import { checkUsageLimit, recordUsage, releaseUsage } from "@/lib/limit-checker";
import { prisma } from "@/lib/prisma";

function makeRequest(body: any) {
  return new NextRequest("http://localhost/api/v1/alerts", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const validBody = {
  instrument: "BTC/USD",
  type: "PRICE",
  condition: { operator: "gt", value: 100000 },
};

describe("alerts POST quota race fix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: "u1", email: "a@b.com" }, error: null });
    vi.mocked(checkUsageLimit).mockResolvedValue({ allowed: true, isDemo: false, remaining: 5 } as any);
    vi.mocked(recordUsage).mockResolvedValue(true);
    vi.mocked(releaseUsage).mockResolvedValue(undefined);
    vi.mocked(prisma.alert.create).mockResolvedValue({ id: "alert-1" } as any);
  });

  it("reserves the slot before creating and returns 201 on success", async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(201);
    expect(recordUsage).toHaveBeenCalledTimes(1);
    expect(prisma.alert.create).toHaveBeenCalledTimes(1);
    // Successful create must NOT release the reservation.
    expect(releaseUsage).not.toHaveBeenCalled();
  });

  it("releases the reservation when alert creation fails", async () => {
    vi.mocked(prisma.alert.create).mockRejectedValueOnce(new Error("db write failed"));
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(500); // dispatchCaughtError surfaces the failure
    expect(recordUsage).toHaveBeenCalledTimes(1);
    expect(prisma.alert.create).toHaveBeenCalledTimes(1);
    // The reserved slot is returned so the user is not charged for an alert
    // that was never persisted.
    expect(releaseUsage).toHaveBeenCalledTimes(1);
    expect(releaseUsage).toHaveBeenCalledWith("u1", "alerts");
  });

  it("refuses with 403 (and never creates) when the reservation loses the race", async () => {
    vi.mocked(recordUsage).mockResolvedValueOnce(false);
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(403);
    expect(recordUsage).toHaveBeenCalledTimes(1);
    expect(prisma.alert.create).not.toHaveBeenCalled();
    expect(releaseUsage).not.toHaveBeenCalled();
  });

  it("never reserves when the usage check already reports the limit reached", async () => {
    vi.mocked(checkUsageLimit).mockResolvedValueOnce({ allowed: false, isDemo: false, remaining: 0 } as any);
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(403);
    expect(recordUsage).not.toHaveBeenCalled();
    expect(prisma.alert.create).not.toHaveBeenCalled();
  });

  it("surfaces the demo preview-limit error when a demo user is at the limit", async () => {
    vi.mocked(checkUsageLimit).mockResolvedValueOnce({ allowed: false, isDemo: true, remaining: 0 } as any);
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(403);
    const body = await res.json();
    // Demo users get the upgrade-to-account CTA, not the generic FORBIDDEN.
    expect(body.error.message).toMatch(/free AI analyses|Create a Free Account|free account/i);
    expect(recordUsage).not.toHaveBeenCalled();
  });

  it("does not reserve on a validation error (malformed body)", async () => {
    const res = await POST(makeRequest({ instrument: "BTC/USD" /* missing type/condition */ }));
    expect(res.status).toBe(400);
    expect(recordUsage).not.toHaveBeenCalled();
    expect(prisma.alert.create).not.toHaveBeenCalled();
  });
});