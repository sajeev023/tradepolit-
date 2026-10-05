"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Bell, LogOut, Settings, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUIStore } from "@/lib/stores/ui-store";
import { useBinanceStream, useBinanceStreamStatus } from "@/hooks/useBinanceStream";
import { titleForPath } from "./nav-config";
import { Mark } from "./mark";

interface HorizonProps {
  userEmail?: string;
  userName?: string;
  avatarUrl?: string;
}

function initialsFor(name?: string, email?: string) {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    if (name.length >= 2) return name.slice(0, 2).toUpperCase();
  }
  if (email) return email.split("@")[0].slice(0, 2).toUpperCase();
  return "TP";
}

/** Live BTC readout. Dot is honest: pulsing green = WebSocket, amber = polled fallback. */
function PriceChip() {
  const ws = useBinanceStream("BTC/USD");
  const status = useBinanceStreamStatus("BTC/USD");
  const disconnected = status === "disconnected" || status === "reconnecting";
  const { data: rest } = useQuery<any>({
    queryKey: ["btc-topbar-ticker"],
    queryFn: async () => {
      const res = await fetch("/api/v1/market/price?symbol=BTC/USD");
      const body = await res.json();
      return res.ok ? body.data : null;
    },
    refetchInterval: disconnected ? 5000 : 30000,
    enabled: !ws || disconnected,
  });
  const tick = ws || rest;
  const up = tick ? tick.changePercent24h >= 0 : true;

  if (!tick) {
    return disconnected ? (
      <div className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.08em] md:flex" style={{ color: "var(--color-warning)" }}>
        <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "var(--color-warning)" }} />
        Feed reconnecting
      </div>
    ) : null;
  }
  return (
    <div className="hidden items-center gap-2.5 md:flex" title={disconnected ? "Polled — WebSocket reconnecting" : "Live via WebSocket"}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${disconnected ? "" : "animate-pulse"}`}
        style={{ background: disconnected ? "var(--color-warning)" : "var(--color-profit)" }}
      />
      <span className="font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--color-text-quaternary)]">BTC</span>
      <span className="font-mono text-[13px] font-medium tabular-nums text-[var(--color-text-primary)]">
        {tick.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
      <span className="font-mono text-[11px] tabular-nums" style={{ color: up ? "var(--color-profit)" : "var(--color-loss)" }}>
        {up ? "▲" : "▼"} {Math.abs(tick.changePercent24h).toFixed(2)}%
      </span>
    </div>
  );
}

export function Horizon({ userEmail, userName, avatarUrl }: HorizonProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { setNotificationPanelOpen, notificationPanelOpen, setCommandPaletteOpen, copilotOpen, setCopilotOpen } = useUIStore();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

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
  const unread = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProfileOpen(false);
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        setCopilotOpen(!useUIStore.getState().copilotOpen);
      }
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [setCommandPaletteOpen, setCopilotOpen]);

  const handleLogout = async () => {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <header
      className="fixed left-0 right-0 z-30 flex items-center gap-3 border-b px-3 select-none sm:px-5 lg:left-[var(--spacing-sidebar)]"
      style={{
        top: "var(--spacing-demo-banner)",
        height: "var(--spacing-topbar)",
        background: "rgba(10, 10, 9, 0.82)",
        backdropFilter: "blur(14px) saturate(140%)",
        WebkitBackdropFilter: "blur(14px) saturate(140%)",
        borderColor: "var(--hairline)",
      }}
    >
      {/* Left: location */}
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="lg:hidden"><Mark size={26} /></span>
        <h1 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-[var(--color-text-primary)]">
          {titleForPath(pathname)}
        </h1>
      </div>

      {/* Centre: command trigger */}
      <button
        onClick={() => setCommandPaletteOpen(true)}
        aria-label="Search or jump to"
        className="group mx-auto hidden h-9 w-full max-w-[420px] cursor-pointer items-center gap-2.5 rounded-lg border px-3 text-left transition-colors hover:border-[var(--color-border-strong)] md:flex"
        style={{ background: "var(--panel-1)", borderColor: "var(--hairline)" }}
      >
        <Search size={14} className="text-[var(--color-text-tertiary)]" />
        <span className="flex-1 truncate text-[13px] text-[var(--color-text-tertiary)]">Jump to a symbol, page or action…</span>
        <kbd className="rounded border px-1.5 py-px font-mono text-[10px] text-[var(--color-text-quaternary)]" style={{ borderColor: "var(--color-border-default)" }}>
          ⌘K
        </kbd>
      </button>

      {/* Right */}
      <div className="ml-auto flex shrink-0 items-center gap-2 md:ml-0">
        <PriceChip />
        <span className="mx-1 hidden h-5 w-px md:block" style={{ background: "var(--hairline)" }} />

        <button onClick={() => setCommandPaletteOpen(true)} className="icon-button md:hidden" aria-label="Search">
          <Search size={17} />
        </button>

        <button
          onClick={() => setCopilotOpen(!copilotOpen)}
          aria-pressed={copilotOpen}
          aria-label="Toggle Copilot"
          className="relative hidden h-9 cursor-pointer items-center gap-2 rounded-lg border px-3 text-[13px] font-medium transition-all active:scale-[0.97] lg:flex"
          style={{
            borderColor: copilotOpen ? "var(--accent)" : "rgba(var(--accent-rgb), 0.4)",
            color: copilotOpen ? "var(--on-accent)" : "var(--accent)",
            background: copilotOpen ? "var(--accent)" : "rgba(var(--accent-rgb), 0.06)",
          }}
        >
          <Sparkles size={14} />
          <span>Copilot</span>
        </button>

        <button
          onClick={() => setNotificationPanelOpen(!notificationPanelOpen)}
          className="icon-button relative"
          aria-label="Notifications"
          data-notification-scope
        >
          <Bell size={17} />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full ring-2 ring-[var(--background)]" style={{ background: "var(--accent)" }} />
          )}
        </button>

        <div ref={profileRef} className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setProfileOpen((v) => !v);
            }}
            aria-label="Open profile menu"
            aria-expanded={profileOpen}
            className="flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-full border text-[11px] font-semibold transition-transform active:scale-95"
            style={{ background: "var(--panel-3)", borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={userName || "Avatar"} className="h-full w-full object-cover" />
            ) : (
              initialsFor(userName, userEmail)
            )}
          </button>
          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                className="absolute right-0 top-full mt-2 w-56 origin-top-right overflow-hidden rounded-xl border py-1"
                style={{ background: "var(--panel-2)", borderColor: "var(--color-border-strong)", boxShadow: "0 24px 48px -12px rgba(0,0,0,0.7)" }}
              >
                <div className="border-b px-4 py-3" style={{ borderColor: "var(--hairline)" }}>
                  <p className="truncate text-[13px] font-semibold text-[var(--color-text-primary)]">{userName || "Trader"}</p>
                  <p className="truncate font-mono text-[11px] text-[var(--color-text-quaternary)]">{userEmail}</p>
                </div>
                <button
                  onClick={() => { setProfileOpen(false); router.push("/settings"); }}
                  className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 text-[13px] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
                >
                  <Settings size={14} /> Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 text-[13px] text-[var(--color-loss)] transition-colors hover:bg-[var(--color-loss-bg)]"
                >
                  <LogOut size={14} /> Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
