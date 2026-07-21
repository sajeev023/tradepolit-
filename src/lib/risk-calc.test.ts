/**
 * Legacy API-based risk calculator tests � now delegates to risk-engine.ts.
 * Kept for backward-compatibility of the HTTP route.
 */
import { POST } from "../app/api/v1/risk/calculate/route";
import { NextRequest } from "next/server";
import { describe, it, expect } from "vitest";

describe("Risk Calculator API � HTTP route integration", () => {
  it("BTC/USD: correct position, dollar risk, margin, R:R", async () => {
    const req = new NextRequest("http://localhost/api/v1/risk/calculate", {
      method: "POST",
      body: JSON.stringify({
        balance: 10000, riskPercent: 1,
        entryPrice: 62000, stopLoss: 61000, takeProfit: 65000,
        leverage: 1, direction: "LONG",
        assetClass: "CRYPTO", symbol: "BTC/USD",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.data.dollarRisk).toBeCloseTo(100, 1);
    expect(body.data.positionSize).toBeCloseTo(0.1, 3);
    expect(body.data.rMultiple).toBeCloseTo(3, 1);
  });

  it("EUR/USD Forex: correct units, lots, margin with 30x leverage", async () => {
    const req = new NextRequest("http://localhost/api/v1/risk/calculate", {
      method: "POST",
      body: JSON.stringify({
        balance: 10000, riskPercent: 1,
        entryPrice: 1.0850, stopLoss: 1.0800,
        leverage: 30, direction: "LONG",
        assetClass: "FOREX", symbol: "EUR/USD",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.dollarRisk).toBeCloseTo(100, 1);
    expect(body.data.standardLots).toBeCloseTo(0.2, 2);
    expect(body.data.marginRequired).toBeCloseTo(723.33, 0);
  });

  it("USD/JPY: correct JPY-formula, never NaN", async () => {
    const req = new NextRequest("http://localhost/api/v1/risk/calculate", {
      method: "POST",
      body: JSON.stringify({
        balance: 100000, riskPercent: 1,
        entryPrice: 150.00, stopLoss: 149.00,
        leverage: 10, direction: "LONG",
        assetClass: "FOREX", symbol: "USD/JPY",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(isNaN(body.data.positionSize)).toBe(false);
    expect(isNaN(body.data.pipValue)).toBe(false);
    expect(body.data.standardLots).not.toBeNull();
  });

  it("rejects stop loss above entry for LONG", async () => {
    const req = new NextRequest("http://localhost/api/v1/risk/calculate", {
      method: "POST",
      body: JSON.stringify({
        balance: 10000, riskPercent: 1,
        entryPrice: 62000, stopLoss: 63000,
        leverage: 1, direction: "LONG",
        assetClass: "CRYPTO", symbol: "BTC/USD",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("rejects riskPercent below 0.1", async () => {
    const req = new NextRequest("http://localhost/api/v1/risk/calculate", {
      method: "POST",
      body: JSON.stringify({
        balance: 10000, riskPercent: 0.05,
        entryPrice: 62000, stopLoss: 61000,
        leverage: 1, direction: "LONG",
        assetClass: "CRYPTO", symbol: "BTC/USD",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("MAX mode: never exceeds buying power", async () => {
    const req = new NextRequest("http://localhost/api/v1/risk/calculate", {
      method: "POST",
      body: JSON.stringify({
        balance: 5000, riskPercent: 1,
        entryPrice: 62000, stopLoss: 61000,
        leverage: 2, direction: "LONG",
        assetClass: "CRYPTO", symbol: "BTC/USD",
        mode: "MAX",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.marginRequired).toBeLessThanOrEqual(5001);
    expect(body.data.positionSize).toBeGreaterThan(0);
  });

  it("MIN mode: returns minimum tradable unit", async () => {
    const req = new NextRequest("http://localhost/api/v1/risk/calculate", {
      method: "POST",
      body: JSON.stringify({
        balance: 10000, riskPercent: 1,
        entryPrice: 62000, stopLoss: 61000,
        leverage: 1, direction: "LONG",
        assetClass: "CRYPTO", symbol: "BTC/USD",
        mode: "MIN",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.positionSize).toBeCloseTo(0.001, 4);
  });

  it("leverage=0 handled gracefully (no 500 error)", async () => {
    const req = new NextRequest("http://localhost/api/v1/risk/calculate", {
      method: "POST",
      body: JSON.stringify({
        balance: 10000, riskPercent: 1,
        entryPrice: 62000, stopLoss: 61000,
        leverage: 0, direction: "LONG",
        assetClass: "CRYPTO", symbol: "BTC/USD",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(isFinite(body.data.marginRequired)).toBe(true);
  });
});
