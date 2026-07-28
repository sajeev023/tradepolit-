import { create } from "zustand";
import type { MarketRegion } from "@/lib/supported-symbols";
import { getDefaultSymbolForMarket } from "@/lib/supported-symbols";

interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  notificationPanelOpen: boolean;
  setNotificationPanelOpen: (open: boolean) => void;

  selectedMarket: MarketRegion;
  setSelectedMarket: (market: MarketRegion) => void;

  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;

  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (completed: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  notificationPanelOpen: false,
  setNotificationPanelOpen: (open) => set({ notificationPanelOpen: open }),

  selectedMarket: "US",
  setSelectedMarket: (market) =>
    set({
      selectedMarket: market,
      selectedSymbol: getDefaultSymbolForMarket(market),
    }),

  selectedSymbol: "AAPL",
  setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),

  hasCompletedOnboarding: false,
  setHasCompletedOnboarding: (completed) => set({ hasCompletedOnboarding: completed }),
}));
