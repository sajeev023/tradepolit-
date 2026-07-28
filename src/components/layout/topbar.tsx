"use client";

import { useUIStore } from "@/lib/stores/ui-store";
import { Search, Bell, LogOut, ChevronDown, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useBinanceStream, useBinanceStreamStatus } from "@/hooks/useBinanceStream";

import { MARKETS } from "@/lib/supported-symbols";

interface TopbarProps {
  userEmail?: string;
  userName?: string;
  avatarUrl?: string;
}

export function Topbar({ userEmail, userName, avatarUrl }: TopbarProps) {
  const { sidebarCollapsed, setNotificationPanelOpen, notificationPanelOpen, setCommandPaletteOpen, selectedMarket, selectedSymbol } =
    useUIStore();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Notifications
  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/v1/notifications");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to load notifications");
      return body.data;
    },
    refetchInterval: 15000,
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Active Symbol Ticker via shared WebSocket stream or REST fallback
  const webSocketPrice = useBinanceStream(selectedSymbol);
  const wsStatus = useBinanceStreamStatus(selectedSymbol);
  const isWsDisconnected = wsStatus === "disconnected" || wsStatus === "reconnecting";

  const { data: restPrice } = useQuery<any>({
    queryKey: ["topbar-ticker", selectedSymbol],
    queryFn: async () => {
      const res = await fetch(`/api/v1/market/price?symbol=${encodeURIComponent(selectedSymbol)}`);
      const body = await res.json();
      if (!res.ok) return null;
      return body.data;
    },
    refetchInterval: isWsDisconnected ? 5000 : 30000,
    enabled: !webSocketPrice || isWsDisconnected,
  });

  const activeBtcPrice = webSocketPrice || restPrice;
  const isBtcProfit = activeBtcPrice ? (activeBtcPrice.changePercent24h ?? 0) >= 0 : true;

  // Resize handler
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ── Profile dropdown — close on outside CLICK (not mousedown) ─────────────
  // Fix: mousedown fires before the button's click, causing the menu to close
  // before selection registers. Using 'click' prevents this.
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileOpen(false);
      }
    }
    // Use 'click' not 'mousedown' so dropdown items can register their click first
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Cmd+K shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [setCommandPaletteOpen]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const getInitials = () => {
    if (userName) {
      const parts = userName.trim().split(/\s+/);
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      if (userName.length >= 2) return userName.slice(0, 2).toUpperCase();
    }
    if (userEmail) {
      const prefix = userEmail.split("@")[0];
      return prefix.slice(0, 2).toUpperCase();
    }
    return "US";
  };

  const initials = getInitials();

  return (
    <header
      className="fixed top-0 right-0 z-30 flex items-center justify-between gap-3 px-4 sm:px-5 border-b transition-all select-none"
      style={{
        left: isMobile ? "0px" : sidebarCollapsed ? "var(--spacing-sidebar-collapsed)" : "var(--spacing-sidebar)",
        height: "var(--spacing-topbar)",
        backgroundColor: "var(--color-bg-deepest)",
        borderColor: "var(--color-border-subtle)",
        backdropFilter: "blur(16px) saturate(150%)",
        transitionDuration: "200ms",
        transitionTimingFunction: "var(--ease-out-expo)",
      }}
    >
      {/* ── Left: Market & Symbol Ticker ── */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          onClick={() => router.push("/settings")}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)] hover:border-emerald-500/40 text-xs font-semibold text-white transition-colors cursor-pointer"
          title="Change Primary Market in Settings"
        >
          <span>{MARKETS[selectedMarket]?.flag || "🌐"}</span>
          <span className="text-[11px] font-bold">{MARKETS[selectedMarket]?.countryName || selectedMarket}</span>
        </button>

        {isWsDisconnected && !activeBtcPrice && (
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[10px] font-medium text-amber-400/80">Reconnecting...</span>
          </div>
        )}
        {activeBtcPrice && (
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)]">
            <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--color-text-quaternary)]">{selectedSymbol}</span>
            <span className="text-[12px] font-mono font-medium text-[var(--color-text-primary)] tabular-nums">
              ${activeBtcPrice.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`text-[11px] font-mono font-medium ${isBtcProfit ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]"}`}>
              {isBtcProfit ? "+" : ""}{(activeBtcPrice.changePercent24h ?? 0).toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {/* ── Right: Actions ── */}
      <div className="flex shrink-0 items-center gap-1">
        {/* Search */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="icon-button group relative"
          aria-label="Search"
        >
          <Search size={16} />
          <span className="absolute -bottom-0.5 -right-0.5 text-[8px] font-mono font-medium text-[var(--color-text-quaternary)] bg-[var(--color-bg-tertiary)] border border-[var(--color-border-default)] rounded px-1 py-px hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            ⌘K
          </span>
        </button>

        {/* Notifications */}
        <button
          onClick={() => setNotificationPanelOpen(!notificationPanelOpen)}
          className="icon-button relative"
          aria-label="Notifications"
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[var(--color-loss)]" />
          )}
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-[var(--color-border-subtle)] mx-1 hidden sm:block" />

        {/* Avatar dropdown */}
        <div ref={profileRef} className="relative">
          <button
            onClick={(e) => {
              // stopPropagation prevents the document click handler from immediately
              // closing the menu on the same event that opened it.
              e.stopPropagation();
              setProfileOpen((prev) => !prev);
            }}
            className="flex items-center gap-1.5 rounded-md p-1 transition-colors hover:bg-[var(--color-bg-hover)] cursor-pointer"
            aria-label="Open profile menu"
            aria-expanded={profileOpen}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold overflow-hidden"
              style={{
                backgroundColor: "var(--color-accent-primary-muted)",
                color: "var(--color-accent-primary)",
                border: "1px solid rgba(30, 212, 168, 0.1)",
              }}
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={userName || "Avatar"} className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <ChevronDown
              size={12}
              className={`text-[var(--color-text-quaternary)] transition-transform duration-150 ${profileOpen ? "rotate-180" : ""}`}
            />
          </button>

          {/* Dropdown */}
          {profileOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-52 rounded-lg py-1 glass shadow-xl animate-enter">
              <div className="px-4 py-2.5 border-b border-[var(--color-border-default)]">
                <p className="text-[13px] font-semibold truncate text-[var(--color-text-primary)]">
                  {userName || "Trader"}
                </p>
                <p className="text-[11px] truncate text-[var(--color-text-quaternary)]">
                  {userEmail}
                </p>
              </div>
              <button
                onClick={() => { setProfileOpen(false); router.push("/settings"); }}
                className="flex items-center gap-2.5 w-full px-4 py-2 text-[13px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer"
              >
                <Settings size={14} />
                Settings
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2.5 w-full px-4 py-2 text-[13px] text-[var(--color-loss)] hover:bg-[var(--color-loss-bg)] transition-colors cursor-pointer"
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
