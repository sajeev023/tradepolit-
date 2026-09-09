import { describe, it, expect, vi } from "vitest";
import { buildMarketSnapshot } from "@/lib/market-snapshot";

// Mocks must stay minimal so the snapshot builder can exercise its full path.
vi.mock("@/lib/market", () => ({
  getLivePrice: vi.fn().mockResolvedValue({
    symbol: "BTC/USD",
    price: 65000,
    change24h: 1200,
    changePercent24h: 1.88,
    high24h: 66000,
    low24h: 63000,
    volume24h: 1_000_000,
    updatedAt: new Date().toISOString(),
    source: "LIVE" as const,
  }),
  getOHLCV: vi.fn().mockResolvedValue(
    Array.from({ length: 100 }, (_, i) => ({
      timestamp: Date.now() - (99 - i) * 60 * 1000,
      open: 64000 + i * 10,
      high: 64100 + i * 10,
      low: 63900 + i * 10,
      close: 64050 + i * 10,
      volume: 100 + i,
      source: "LIVE" as const,
    }))
  ),
  normalizeSymbol: vi.fn((s: string) => s),
}));

describe("buildMarketSnapshot", () => {
  it("returns a snapshot with freshness, technical context, and confidence", async () => {
    const result = await buildMarketSnapshot("BTC/USD", "1h");

    expect(result.error).toBeNull();
    expect(result.freshness).toBe("FRESH");
    expect(result.snapshot).not.toBeNull();

    const snap = result.snapshot!;
    expect(snap.symbol).toBe("BTC/USD");
    expect(snap.timeframe).toBe("1h");
    expect(snap.priceAtCapture.price).toBe(65000);
    expect(snap.dataFreshness.status).toBe("FRESH");
    expect(snap.technicalContext.rsi).toBeDefined();
    expect(snap.marketContext.regime).toBeDefined();
    expect(snap.confidence.score).toBeGreaterThanOrEqual(0);
    expect(snap.confidence.score).toBeLessThanOrEqual(100);
    expect(snap.evidence.for.length).toBeGreaterThanOrEqual(0);
    expect(snap.evidence.for[0]).toHaveProperty("text");
    expect(snap.evidence.for[0]).toHaveProperty("source");
  });

  it("detects simulated candles as unavailable", async () => {
    const { getOHLCV } = await import("@/lib/market");
    vi.mocked(getOHLCV).mockResolvedValueOnce(
      Array.from({ length: 100 }, (_, i) => ({
        timestamp: Date.now() - (99 - i) * 60 * 1000,
        open: 64000,
        high: 64100,
        low: 63900,
        close: 64050,
        volume: 100,
        source: "SIMULATED" as const,
      }))
    );

    const result = await buildMarketSnapshot("BTC/USD", "1h");
    expect(result.freshness).toBe("UNAVAILABLE");
    expect(result.error).toContain("simulated");
  });
});
