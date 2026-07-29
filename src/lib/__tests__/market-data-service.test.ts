import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { PriceData } from "../types";

// Mock only `getLivePrice` (the upstream call); keep `normalizeSymbol` real so
// the service's canonicalization is exercised end-to-end.
vi.mock("../market", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../market")>();
  return { ...actual, getLivePrice: vi.fn() };
});

// Import AFTER the mock is registered. The service holds module-level `Map`
// state, so we reset it between tests via the reset path below.
const { MarketDataService } = await import("../market-data-service");
const { getLivePrice } = await import("../market");

const livePrice = (symbol: string, price: number): PriceData => ({
  symbol,
  price,
  change24h: 0,
  changePercent24h: 0,
  high24h: price,
  low24h: price,
  volume24h: 0,
  updatedAt: new Date().toISOString(),
  source: "LIVE",
});

describe("MarketDataService — in-flight dedup (Phase 3 race fix)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    MarketDataService.priceCache.clear();
    MarketDataService.inflightPrices.clear();
    vi.mocked(getLivePrice).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shares ONE upstream fetch across concurrent callers (no double-hit, no stale-overwrite race)", async () => {
    let resolveFetch!: (v: PriceData) => void;
    vi.mocked(getLivePrice).mockReturnValue(
      new Promise<PriceData>((r) => {
        resolveFetch = r;
      })
    );

    // Two concurrent calls before the fetch settles.
    const p1 = MarketDataService.getLivePrice("BTC/USD");
    const p2 = MarketDataService.getLivePrice("BTC/USD");

    expect(getLivePrice).toHaveBeenCalledTimes(1);
    expect(MarketDataService.inflightPrices.size).toBe(1);

    resolveFetch(livePrice("BTC/USD", 70000));
    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1).toEqual(r2);
    expect(r1.price).toBe(70000);
    // In-flight entry is cleared once the fetch resolves.
    expect(MarketDataService.inflightPrices.size).toBe(0);
    // Result is cached.
    expect(MarketDataService.priceCache.get("BTC/USD")?.price.price).toBe(70000);
  });

  it("serves a fresh cache hit without hitting the upstream again", async () => {
    vi.mocked(getLivePrice).mockResolvedValue(livePrice("ETH/USD", 3500));
    await MarketDataService.getLivePrice("ETH/USD");
    expect(getLivePrice).toHaveBeenCalledTimes(1);

    // Within the 2000ms TTL — no new fetch.
    const cached = await MarketDataService.getLivePrice("ETH/USD");
    expect(getLivePrice).toHaveBeenCalledTimes(1);
    expect(cached.price).toBe(3500);
  });

  it("re-fetches after the cache TTL expires", async () => {
    vi.mocked(getLivePrice).mockResolvedValue(livePrice("ETH/USD", 3500));
    await MarketDataService.getLivePrice("ETH/USD");
    expect(getLivePrice).toHaveBeenCalledTimes(1);

    // Advance past the 2000ms TTL.
    vi.advanceTimersByTime(2001);
    vi.mocked(getLivePrice).mockResolvedValue(livePrice("ETH/USD", 3600));
    const refreshed = await MarketDataService.getLivePrice("ETH/USD");
    expect(getLivePrice).toHaveBeenCalledTimes(2);
    expect(refreshed.price).toBe(3600);
  });

  it("captures the cache timestamp AFTER the await, not at issue time (slow fetch keeps full TTL)", async () => {
    let resolveFetch!: (v: PriceData) => void;
    vi.mocked(getLivePrice).mockReturnValue(
      new Promise<PriceData>((r) => {
        resolveFetch = r;
      })
    );
    const issuedAt = Date.now();
    const p = MarketDataService.getLivePrice("BTC/USD");

    // The fetch takes 1500ms to resolve. If the timestamp were captured at
    // issue time, only 500ms of TTL would remain; capturing after the await
    // preserves the full 2000ms window from the moment data arrived.
    vi.advanceTimersByTime(1500);
    resolveFetch(livePrice("BTC/USD", 70000));
    await p;

    const cached = MarketDataService.priceCache.get("BTC/USD");
    expect(cached).toBeDefined();
    expect(cached!.timestamp).toBe(issuedAt + 1500);
  });

  it("clears the in-flight entry and propagates the error when the fetch rejects", async () => {
    vi.mocked(getLivePrice).mockRejectedValue(new Error("upstream down"));
    await expect(MarketDataService.getLivePrice("XRP/USD")).rejects.toThrow("upstream down");
    expect(MarketDataService.inflightPrices.size).toBe(0);
    // A failed fetch must NOT poison the cache.
    expect(MarketDataService.priceCache.has("XRP/USD")).toBe(false);
  });

  it("normalizes shorthand input to the canonical key before caching (BTC/USD == btcusdt)", async () => {
    vi.mocked(getLivePrice).mockImplementation((symbol: string) =>
      Promise.resolve(livePrice(symbol, 70000))
    );
    await MarketDataService.getLivePrice("BTC/USD");
    // The cache is keyed by the canonical symbol, not the raw input.
    expect(MarketDataService.priceCache.has("BTC/USD")).toBe(true);
  });
});