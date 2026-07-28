import { describe, it, expect } from "vitest";
import { getLivePrice, getOHLCV, normalizeSymbol } from "./market";
import { UnsupportedSymbolError } from "./typed-errors";

/**
 * Fail-fast contract for the market-data layer: an *unsupported* symbol must
 * never silently receive fabricated (SIMULATED) prices. This is the most
 * dangerous defect for a trading app, so we lock it in with a regression test.
 * A *supported* symbol whose providers are down legitimately falls back to
 * labelled SIMULATED data — that path is not under test here (it touches the
 * network + cache) and is covered by the provider-down banner in the UI.
 */
describe("market.ts — unsupported symbol fail-fast", () => {
  it("getLivePrice throws UnsupportedSymbolError for an unknown symbol", async () => {
    await expect(getLivePrice("FAKE/XYZ")).rejects.toBeInstanceOf(UnsupportedSymbolError);
  });

  it("getOHLCV throws UnsupportedSymbolError for an unknown symbol", async () => {
    await expect(getOHLCV("FAKE/XYZ", "1h", 100)).rejects.toBeInstanceOf(UnsupportedSymbolError);
  });

  it("getLivePrice rejects with a 422-shaped error for unknown symbols", async () => {
    try {
      await getLivePrice("NOPE");
      throw new Error("expected getLivePrice to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(UnsupportedSymbolError);
      expect((err as UnsupportedSymbolError).status).toBe(422);
      expect((err as UnsupportedSymbolError).symbol).toBe("NOPE");
    }
  });
});

describe("market.ts — normalizeSymbol", () => {
  it("resolves legacy crypto shorthand to canonical registry symbols", () => {
    expect(normalizeSymbol("btcusdt")).toBe("BTC/USD");
    expect(normalizeSymbol("BTC-USD")).toBe("BTC/USD");
    expect(normalizeSymbol("ETH")).toBe("ETH/USD");
    expect(normalizeSymbol("solusdt")).toBe("SOL/USD");
  });

  it("returns canonical registry symbols unchanged (case-insensitive)", () => {
    expect(normalizeSymbol("btc/usd")).toBe("BTC/USD");
    expect(normalizeSymbol("aapl")).toBe("AAPL");
    expect(normalizeSymbol("shel.l")).toBe("SHEL.L");
    expect(normalizeSymbol("s&p500")).toBe("S&P500");
  });

  it("does NOT mangle dash-bearing or USDT-bearing tickers", () => {
    // BRK-B must not be rewritten to BRK/B (would fabricate a fake instrument).
    expect(normalizeSymbol("BRK-B")).toBe("BRK-B");
    // An unknown USDT-containing symbol must not be rewritten to "/USD".
    expect(normalizeSymbol("DOGEUSDT")).toBe("DOGEUSDT");
  });

  it("uppercases unknown symbols without fabricating a canonical form", () => {
    expect(normalizeSymbol("nonsense")).toBe("NONSENSE");
  });
});