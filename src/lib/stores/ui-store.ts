import { create } from "zustand";
import type { MarketRegion } from "@/lib/supported-symbols";
import {
  getDefaultSymbolForMarket,
  getSymbolsForMarket,
} from "@/lib/supported-symbols";
import type { Timeframe } from "@/lib/timeframes";
import { normalizeTimeframe } from "@/lib/timeframes";

/**
 * The single in-memory source of truth for global chart selection.
 *
 * `selectedSymbol` / `selectedMarket` / `selectedTimeframe` live HERE and only
 * here. They are hydrated from the server profile exactly once (via
 * `hydrateFromProfile`) and then owned by user actions. No page keeps a
 * parallel `useState` copy, no localStorage mirror — those were the root
 * cause of the two-write-path race where the layout's market hydration wiped
 * the symbol the charts page was simultaneously restoring from `lastSymbol`.
 */
interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  notificationPanelOpen: boolean;
  setNotificationPanelOpen: (open: boolean) => void;

  // ── Global chart selection (single source of truth) ─────────────────────
  selectedMarket: MarketRegion;
  selectedSymbol: string;
  selectedTimeframe: Timeframe;
  /**
   * True once `hydrateFromProfile` has run. Until then the selection is the
   * registry default; the hydrator is idempotent so profile refetches (window
   * focus, mutations) can never clobber an in-flight user selection. Consumers
   * that persist selection (the charts page save effect) gate on this to avoid
   * writing the default over the user's saved value before hydration lands.
   */
  hydrated: boolean;

  /** Set the market WITHOUT touching the symbol. Used by the hydrator. */
  setSelectedMarket: (market: MarketRegion) => void;
  setSelectedSymbol: (symbol: string) => void;
  setSelectedTimeframe: (tf: Timeframe) => void;
  /**
   * Switch market AND reset the symbol to that market's default. A deliberate
   * UI action only (onboarding submit, settings market change) — never the
   * hydrator, which restores the user's saved symbol separately.
   */
  switchMarket: (market: MarketRegion) => void;
  /**
   * One-shot hydrate from the server profile. Writes market → symbol →
   * timeframe in order, validating the restored symbol against the market's
   * symbol set (a stale `lastSymbol` from a different market is discarded in
   * favor of the market default — the structural fix for "Bitcoin appears
   * after selecting a stock market"). No-op once already hydrated.
   */
  hydrateFromProfile: (data: {
    preferredMarket?: MarketRegion;
    lastSymbol?: string;
    lastTimeframe?: string;
  }) => void;

  // ── Onboarding (pure mirror of the server profile; not a gate) ──────────
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (completed: boolean) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarCollapsed: false,
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  notificationPanelOpen: false,
  setNotificationPanelOpen: (open) => set({ notificationPanelOpen: open }),

  // Initial selection is the US market default. The hydrator overwrites this
  // from the server profile on first load; until then a deterministic default
  // is correct (and `hydrated: false` stops anyone from persisting it).
  selectedMarket: "US",
  selectedSymbol: getDefaultSymbolForMarket("US"),
  selectedTimeframe: "4h",
  hydrated: false,

  setSelectedMarket: (market) => set({ selectedMarket: market }),
  setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),
  setSelectedTimeframe: (tf) => set({ selectedTimeframe: tf }),
  switchMarket: (market) =>
    set({
      selectedMarket: market,
      selectedSymbol: getDefaultSymbolForMarket(market),
    }),

  hydrateFromProfile: (data) => {
    // Idempotent: once hydrated, refetches must not wipe an in-flight
    // selection. This guard is the core race-condition fix.
    if (get().hydrated) return;

    const market = data.preferredMarket ?? get().selectedMarket;
    const marketSymbols = new Set(
      getSymbolsForMarket(market).map((s) => s.symbol)
    );
    // Restore lastSymbol ONLY if it belongs to the active market. A stale
    // symbol from a different market (e.g. BTC/USD saved from a Crypto session
    // but preferredMarket is now INDIA) is discarded in favor of the market
    // default — never a hardcoded crypto fallback.
    const symbol =
      data.lastSymbol && marketSymbols.has(data.lastSymbol)
        ? data.lastSymbol
        : getDefaultSymbolForMarket(market);
    const timeframe = normalizeTimeframe(data.lastTimeframe ?? "") ?? get().selectedTimeframe;

    set({
      selectedMarket: market,
      selectedSymbol: symbol,
      selectedTimeframe: timeframe,
      hydrated: true,
    });
  },

  hasCompletedOnboarding: false,
  setHasCompletedOnboarding: (completed) =>
    set({ hasCompletedOnboarding: completed }),
}));