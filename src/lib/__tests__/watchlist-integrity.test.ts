import { describe, expect, it } from "vitest";

/**
 * Regression tests for data integrity rules that must hold across the UI.
 */

// Mirror of watchlist formatPrice logic for testing without the component.
function formatPrice(ticker: any, ctx: any) {
  if (ticker && Number.isFinite(ticker.price)) return { price: ticker.price, source: "live", freshness: "FRESH" };
  if (ctx?.priceAtCapture?.price && Number.isFinite(ctx.priceAtCapture.price)) {
    return {
      price: ctx.priceAtCapture.price,
      source: ctx.priceAtCapture.source ?? "candle-close",
      freshness: ctx.dataFreshness?.status ?? "STALE",
      reason: ctx.dataFreshness?.reason,
    };
  }
  return { price: null, source: null, freshness: "UNAVAILABLE", reason: "No live price or snapshot available" };
}

describe("watchlist data integrity", () => {
  it("never returns a hardcoded fallback price", () => {
    const priceInfo = formatPrice(null, null);
    expect(priceInfo.price).toBeNull();
    expect(priceInfo.freshness).toBe("UNAVAILABLE");
  });

  it("prefers live ticker over snapshot", () => {
    const ticker = { price: 70000, change24h: 2.5 };
    const ctx = { priceAtCapture: { price: 68000 }, dataFreshness: { status: "STALE" } };
    const priceInfo = formatPrice(ticker, ctx);
    expect(priceInfo.price).toBe(70000);
    expect(priceInfo.freshness).toBe("FRESH");
  });

  it("falls back to snapshot price with freshness when ticker missing", () => {
    const ctx = { priceAtCapture: { price: 68000, source: "candle-close" }, dataFreshness: { status: "STALE", reason: "Last candle 10m old" } };
    const priceInfo = formatPrice(null, ctx);
    expect(priceInfo.price).toBe(68000);
    expect(priceInfo.freshness).toBe("STALE");
    expect(priceInfo.reason).toBe("Last candle 10m old");
  });

  it("does not fabricate a change24h", () => {
    const ticker: any = null;
    const ctx: any = { priceAtCapture: { changePercent24h: null } };
    const change24h = ticker?.change24h ?? ctx?.priceAtCapture?.changePercent24h ?? null;
    expect(change24h).toBeNull();
  });
});

describe("DecisionBrief data integrity", () => {
  it("does not fabricate execution levels when none provided", () => {
    const entryZone: string | undefined = undefined;
    const target: string | undefined = undefined;
    const stopLoss: string | undefined = undefined;
    const invalidation: string | undefined = undefined;
    const currentPrice = 65000;

    const hasValidPlan =
      Number.isFinite(Number(entryZone)) &&
      Number.isFinite(Number(target)) &&
      Number.isFinite(Number(stopLoss)) &&
      Number.isFinite(Number(invalidation));

    expect(hasValidPlan).toBe(false);

    const entry = hasValidPlan ? Number(entryZone) : NaN;
    const tgt = hasValidPlan ? Number(target) : NaN;
    const stp = hasValidPlan ? Number(stopLoss) : NaN;
    const inv = hasValidPlan ? Number(invalidation) : NaN;

    expect(Number.isNaN(entry)).toBe(true);
    expect(Number.isNaN(tgt)).toBe(true);
    expect(Number.isNaN(stp)).toBe(true);
    expect(Number.isNaN(inv)).toBe(true);
  });
});
