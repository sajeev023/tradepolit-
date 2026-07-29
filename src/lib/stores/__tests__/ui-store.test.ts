import { describe, it, expect, beforeEach } from "vitest";
import { useUIStore } from "../ui-store";
import { getDefaultSymbolForMarket } from "@/lib/supported-symbols";

/**
 * Phase 6 — UI store state-invariant tests.
 *
 * The brief's stress workflows (rapid market switching, page refresh, multiple
 * tabs) all reduce at the unit level to the store's invariants: switching a
 * market must reset the symbol to that market's default; the hydrator must be
 * idempotent so a profile refetch (window focus / second tab) can never clobber
 * an in-flight user selection; and a stale `lastSymbol` from a different market
 * must be discarded (the "Bitcoin appears after selecting a stock market" bug).
 */
describe("useUIStore — market switching", () => {
  beforeEach(() => {
    // Reset the singleton store to the pre-hydration default between tests.
    useUIStore.setState({
      selectedMarket: "US",
      selectedSymbol: getDefaultSymbolForMarket("US"),
      selectedTimeframe: "4h",
      hydrated: false,
    });
  });

  it("switchMarket resets the symbol to the new market's default (deliberate UI action)", () => {
    useUIStore.getState().setSelectedSymbol("MSFT");
    useUIStore.getState().switchMarket("INDIA");
    expect(useUIStore.getState().selectedMarket).toBe("INDIA");
    expect(useUIStore.getState().selectedSymbol).toBe("RELIANCE");
  });

  it("setSelectedMarket does NOT clobber the symbol (the Phase 2 split that killed the two-write-path race)", () => {
    useUIStore.getState().setSelectedSymbol("MSFT");
    useUIStore.getState().setSelectedMarket("INDIA");
    expect(useUIStore.getState().selectedMarket).toBe("INDIA");
    // Symbol survives the market change — only switchMarket resets it.
    expect(useUIStore.getState().selectedSymbol).toBe("MSFT");
  });

  it("rapid repeated switchMarket calls settle deterministically on the last market's default", () => {
    const { switchMarket } = useUIStore.getState();
    switchMarket("INDIA");
    switchMarket("JAPAN");
    switchMarket("CRYPTO");
    switchMarket("US");
    const state = useUIStore.getState();
    expect(state.selectedMarket).toBe("US");
    expect(state.selectedSymbol).toBe("AAPL");
  });
});

describe("useUIStore — hydration (page refresh / multi-tab race fix)", () => {
  beforeEach(() => {
    useUIStore.setState({
      selectedMarket: "US",
      selectedSymbol: getDefaultSymbolForMarket("US"),
      selectedTimeframe: "4h",
      hydrated: false,
    });
  });

  it("hydrateFromProfile restores market → symbol → timeframe and flips hydrated", () => {
    useUIStore.getState().hydrateFromProfile({
      preferredMarket: "INDIA",
      lastSymbol: "TCS",
      lastTimeframe: "1d",
    });
    const state = useUIStore.getState();
    expect(state.selectedMarket).toBe("INDIA");
    expect(state.selectedSymbol).toBe("TCS");
    expect(state.selectedTimeframe).toBe("1d");
    expect(state.hydrated).toBe(true);
  });

  it("is idempotent: a second hydration (profile refetch / second tab) cannot clobber an in-flight user selection", () => {
    useUIStore.getState().hydrateFromProfile({
      preferredMarket: "US",
      lastSymbol: "AAPL",
      lastTimeframe: "1h",
    });
    // User then switches symbol while online.
    useUIStore.getState().setSelectedSymbol("TSLA");

    // A background profile refetch fires hydration again with the OLD profile.
    useUIStore.getState().hydrateFromProfile({
      preferredMarket: "INDIA",
      lastSymbol: "RELIANCE",
      lastTimeframe: "1d",
    });

    const state = useUIStore.getState();
    expect(state.selectedSymbol).toBe("TSLA"); // user's in-flight selection preserved
    expect(state.selectedMarket).toBe("US"); // not overwritten by the stale refetch
  });

  it("discards a stale lastSymbol from a different market in favor of the market default (Bitcoin-on-stocks fix)", () => {
    useUIStore.getState().hydrateFromProfile({
      preferredMarket: "INDIA",
      lastSymbol: "BTC/USD", // saved from a prior Crypto session — not an Indian equity
      lastTimeframe: "4h",
    });
    const state = useUIStore.getState();
    expect(state.selectedMarket).toBe("INDIA");
    expect(state.selectedSymbol).toBe("RELIANCE"); // BTC/USD rejected, market default used
  });

  it("falls back to the registry default symbol when lastSymbol is absent", () => {
    useUIStore.getState().hydrateFromProfile({ preferredMarket: "CRYPTO" });
    expect(useUIStore.getState().selectedSymbol).toBe("BTC/USD");
  });

  it("falls back to the current timeframe when lastTimeframe is unparseable", () => {
    useUIStore.getState().hydrateFromProfile({
      preferredMarket: "US",
      lastTimeframe: "garbage",
    });
    expect(useUIStore.getState().selectedTimeframe).toBe("4h");
  });
});