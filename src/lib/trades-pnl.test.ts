import { POST } from "../app/api/v1/trades/route";
import { PATCH } from "../app/api/v1/trades/[id]/route";
import { NextRequest } from "next/server";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { memoryDb } from "./prisma-mock";
import { MOCK_USER } from "./supabase/mock";

vi.mock("@/lib/auth", async () => {
  const { MOCK_USER } = await vi.importActual("@/lib/supabase/mock");
  return {
    getAuthenticatedUser: vi.fn(async () => ({ user: MOCK_USER, error: null })),
    getAuthUser: vi.fn(async () => ({ user: MOCK_USER, error: null })),
    ensurePrismaUser: vi.fn(async () => MOCK_USER),
  };
});

vi.mock("@/lib/prisma", async () => ({
  prisma: (await vi.importActual("./prisma-mock")).prismaMock,
}));

describe("Trades P/L Calculation & Quote Conversion", () => {
  beforeEach(() => {
    // Clear in-memory trades before each test
    memoryDb.trades = [];
    vi.clearAllMocks();
  });

  it("calculates BTC/USD LONG trade P/L correctly", async () => {
    const req = new NextRequest("http://localhost/api/v1/trades", {
      method: "POST",
      body: JSON.stringify({
        instrument: "BTC/USD",
        assetClass: "CRYPTO",
        direction: "LONG",
        entryPrice: 60000,
        exitPrice: 65000,
        size: 0.1,
        leverage: 10,
        stopLoss: 58000,
        openedAt: new Date().toISOString(),
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data).toBeDefined();
    // P/L = 1 * (65000 - 60000) * 0.1 * 10 = 5000 USD
    expect(Number(body.data.pnl)).toBeCloseTo(5000);
    // R:R = (65000 - 60000) / (60000 - 58000) = 5000 / 2000 = 2.5R
    expect(Number(body.data.rMultiple)).toBeCloseTo(2.5);
  });

  it("calculates EUR/USD SHORT trade P/L correctly (standard quote)", async () => {
    const req = new NextRequest("http://localhost/api/v1/trades", {
      method: "POST",
      body: JSON.stringify({
        instrument: "EUR/USD",
        assetClass: "FOREX",
        direction: "SHORT",
        entryPrice: 1.0850,
        exitPrice: 1.0800,
        size: 100000, // 1 Standard lot
        leverage: 1,
        stopLoss: 1.0900,
        openedAt: new Date().toISOString(),
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data).toBeDefined();
    // P/L = -1 * (1.0800 - 1.0850) * 100000 * 1 = 500 USD
    expect(Number(body.data.pnl)).toBeCloseTo(500);
    // R:R = (1.0850 - 1.0800) / (1.0900 - 1.0850) = 0.0050 / 0.0050 = 1R
    expect(Number(body.data.rMultiple)).toBeCloseTo(1);
  });

  it("calculates USD/JPY LONG trade P/L correctly with JPY quote conversion", async () => {
    const req = new NextRequest("http://localhost/api/v1/trades", {
      method: "POST",
      body: JSON.stringify({
        instrument: "USD/JPY",
        assetClass: "FOREX",
        direction: "LONG",
        entryPrice: 150.00,
        exitPrice: 151.00,
        size: 15000, // Position size in USD
        leverage: 10,
        stopLoss: 149.00,
        openedAt: new Date().toISOString(),
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data).toBeDefined();
    // JPY Profit = 1 * (151 - 150) * 15000 * 10 = 150,000 JPY
    // USD Profit = 150,000 / 151 = $993.377
    expect(Number(body.data.pnl)).toBeCloseTo(993.377, 2);
  });

  it("calculates USD/JPY PATCH update trade P/L correctly", async () => {
    // 1. First insert a trade with open status (no exit price)
    const seedTrade = {
      id: "t_test_jpy",
      userId: MOCK_USER.id,
      instrument: "USD/JPY",
      assetClass: "FOREX",
      direction: "LONG",
      entryPrice: 150.00,
      size: 15000,
      leverage: 10,
      stopLoss: 149.00,
      status: "OPEN",
      openedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryDb.trades.push(seedTrade);

    // 2. PATCH the trade to close it with an exit price
    const req = new NextRequest("http://localhost/api/v1/trades/t_test_jpy", {
      method: "PATCH",
      body: JSON.stringify({
        exitPrice: 151.00,
        status: "CLOSED",
        closedAt: new Date().toISOString(),
      }),
    });

    const params = Promise.resolve({ id: "t_test_jpy" });
    const res = await PATCH(req, { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
    // JPY Profit = 1 * (151 - 150) * 15000 * 10 = 150,000 JPY
    // USD Profit = 150,000 / 151 = $993.377
    expect(Number(body.data.pnl)).toBeCloseTo(993.377, 2);
  });
});
