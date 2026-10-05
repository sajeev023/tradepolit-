import { create } from "zustand";

interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  notificationPanelOpen: boolean;
  setNotificationPanelOpen: (open: boolean) => void;

  /** Global Copilot dock (route-aware AI drawer). */
  copilotOpen: boolean;
  setCopilotOpen: (open: boolean) => void;
  /** Prompt queued by another surface (e.g. a dashboard insight) for the dock to send. */
  copilotSeed: string | null;
  askCopilot: (prompt?: string) => void;
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

  copilotOpen: false,
  setCopilotOpen: (open) => set({ copilotOpen: open }),
  copilotSeed: null,
  askCopilot: (prompt) => set({ copilotOpen: true, copilotSeed: prompt ?? null }),
}));
