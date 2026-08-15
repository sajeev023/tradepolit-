"use client";

import { useUIStore } from "@/lib/stores/ui-store";
import { Search, Bell, LogOut, ChevronDown, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useBinanceStream, useBinanceStreamStatus } from "@/hooks/useBinanceStream";

interface TopbarProps {
  userEmail?: string;
  userName?: string;
  avatarUrl?: string;
}

export function Topbar({ userEmail, userName, avatarUrl }: TopbarProps) {
  const { sidebarCollapsed, setNotificationPanelOpen, notificationPanelOpen, setCommandPaletteOpen } =
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

  // ── BTC ticker via shared WebSocket (same stream as charts page) ───────────
  // useBinanceStream("BTC/USD") joins the shared singleton registry — zero extra connections.
  const webSocketPrice = useBinanceStream("BTC/USD");
  const wsStatus = useBinanceStreamStatus("BTC/USD");
  const isWsDisconnected = wsStatus === "disconnected" || wsStatus === "reconnecting";

  // REST fallback — polls when WebSocket is disconnected/reconnecting, stops when connected
  const { data: btcPriceRest } = useQuery<any>({
    queryKey: ["btc-topbar-ticker"],
    queryFn: async () => {
      const res = await fetch("/api/v1/market/price?symbol=BTC/USD");
      const body = await res.json();
      if (!res.ok) return null;
      return body.data;
    },
    refetchInterval: isWsDisconnected ? 5000 : 30000, // 5s when disconnected, 30s as failsafe
    enabled: !webSocketPrice || isWsDisconnected, // re-enable polling when WS disconnects
  });

  const activeBtcPrice = webSocketPrice || btcPriceRest;
  const isBtcProfit = activeBtcPrice ? activeBtcPrice.changePercent24h >= 0 : true;

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
        top: "var(--spacing-demo-banner)",
        height: "var(--spacing-topbar)",
        backgroundColor: "var(--color-bg-deepest)",
        borderColor: "var(--color-border-subtle)",
        backdropFilter: "blur(16px) saturate(150%)",
        transitionDuration: "200ms",
        transitionTimingFunction: "var(--ease-out-expo)",
      }}
    >
      {/* ── Left: BTC Ticker ── */}
      <div className="flex items-center gap-3 min-w-0">
        {isWsDisconnected && !activeBtcPrice && (
          <div
            className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md"
            style={{ backgroundColor: "var(--color-warning-bg)", border: "1px solid rgba(245, 185, 66, 0.22)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--color-warning)" }} />
            <span className="text-[10px] font-medium" style={{ color: "var(--color-warning)" }}>Live market data is temporarily unavailable. Reconnecting...</span>
          </div>
        )}
        {activeBtcPrice && (
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md bg-[var(--color-bg-secondary)] border border-[var(--color-border-subtle)]">
            {/* Honest live-source dot: green + pulse when the Binance WS is
                connected for BTC/USD; amber when on the REST fallback. Never
                implies "live" when the feed is unavailable. */}
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${!isWsDisconnected ? "animate-pulse" : ""}`}
              style={{ background: !isWsDisconnected ? "var(--color-profit)" : "var(--color-warning)" }}
              title={!isWsDisconnected ? "Live via WebSocket" : "Polled — WebSocket reconnecting"}
            />
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-quaternary)]">BTC</span>
            <span className="text-[12px] font-mono font-medium text-[var(--color-text-primary)] tabular-nums">
              ${activeBtcPrice.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`text-[11px] font-mono font-medium ${isBtcProfit ? "text-[var(--color-profit)]" : "text-[var(--color-loss)]"}`}>
              {isBtcProfit ? "+" : ""}{activeBtcPrice.changePercent24h.toFixed(2)}%
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
          data-notification-scope
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)]" />
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
                border: "1px solid var(--color-accent-primary-muted)",
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
