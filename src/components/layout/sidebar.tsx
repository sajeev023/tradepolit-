"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUIStore } from "@/lib/stores/ui-store";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Compass,
  LineChart,
  BookOpen,
  Eye,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  CreditCard,
  Sparkles,
  ChevronDown,
  Activity,
  Search,
  CheckCircle2,
  Clock,
  ClipboardList
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

/* ─── Nav Configuration ─── */
interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number;
}

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);
  const [decisionsOpen, setDecisionsOpen] = useState(true);
  const [marketOpen, setMarketOpen] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentStatus(new URLSearchParams(window.location.search).get("status"));
    }
  }, [pathname]);

  // Queries
  const { data: profile } = useQuery<any>({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/v1/profile");
      const body = await res.json();
      if (!res.ok) return null;
      return body.data;
    },
  });

  const { data: activeTheses } = useQuery<any[]>({
    queryKey: ["theses-count"],
    queryFn: async () => {
      const res = await fetch("/api/v1/theses?status=ALL");
      const body = await res.json();
      if (!res.ok) return [];
      return body.data || [];
    },
    staleTime: 30000,
  });

  const openCount = activeTheses?.filter((t) => t.status === "OPEN").length || 0;
  const reviewCount = activeTheses?.filter((t) => t.status !== "OPEN" && !t.outcome).length || 0;

  const [loadingPortal, setLoadingPortal] = useState(false);
  const portalMutation = useMutation({
    mutationFn: async () => {
      setLoadingPortal(true);
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to load portal");
      return body;
    },
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to launch billing portal");
    },
    onSettled: () => setLoadingPortal(false),
  });

  // Hover expand for collapsed sidebar
  const [hovered, setHovered] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setHovered(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setHovered(false), 200);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const isCollapsed = sidebarCollapsed && !hovered;

  const isActiveLink = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href.startsWith("/theses?status=")) {
      const targetStatus = href.split("status=")[1];
      return pathname === "/theses" && currentStatus === targetStatus;
    }
    if (href === "/theses") {
      return pathname.startsWith("/theses") && !currentStatus;
    }
    return pathname.startsWith(href);
  };

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="hidden lg:flex fixed left-0 top-0 z-40 flex-col border-r select-none"
      style={{
        width: isCollapsed ? "60px" : "224px",
        top: "var(--spacing-demo-banner)",
        height: "calc(100dvh - var(--spacing-demo-banner))",
        backgroundColor: "#05070B",
        borderColor: "var(--color-border-subtle)",
        transition: `width 180ms var(--ease-out-expo)`,
      }}
    >
      {/* ── Brand Header ── */}
      <div
        className="flex items-center gap-2.5 px-3.5 border-b shrink-0"
        style={{
          height: "var(--spacing-topbar)",
          borderColor: "var(--color-border-subtle)",
        }}
      >
        <div
          className="flex items-center justify-center rounded-md shrink-0 border"
          style={{
            width: 26,
            height: 26,
            backgroundColor: "rgba(47, 198, 232, 0.12)",
            borderColor: "rgba(47, 198, 232, 0.3)",
            color: "var(--color-accent-primary)",
          }}
        >
          <Compass size={15} strokeWidth={2.5} />
        </div>
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="flex items-baseline gap-1.5 overflow-hidden whitespace-nowrap"
            >
              <span className="text-xs font-bold tracking-tight text-[var(--color-text-primary)]">
                TradeCoPilot
              </span>
              <span className="text-[9px] font-mono text-[var(--color-accent-primary)] font-semibold px-1 py-0.2 rounded bg-[var(--color-accent-primary-subtle)]">
                V4
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Navigation Tree ── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-3 custom-scrollbar text-xs">
        {/* 1. Overview */}
        <div>
          <Link
            href="/dashboard"
            className={`flex items-center h-8 rounded-md px-2.5 font-medium transition-colors group relative ${
              isActiveLink("/dashboard")
                ? "bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] font-semibold"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {isActiveLink("/dashboard") && !isCollapsed && (
              <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-[var(--color-accent-primary)]" />
            )}
            <LayoutDashboard size={15} className={`shrink-0 ${isActiveLink("/dashboard") ? "text-[var(--color-accent-primary)]" : "text-[var(--color-text-tertiary)] group-hover:text-[var(--color-accent-primary)]"}`} />
            {!isCollapsed && <span className="ml-2.5 truncate">Overview</span>}
            {isCollapsed && (
              <div className="absolute left-full ml-3 px-2 py-1 rounded text-[11px] font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 glass">
                Overview
              </div>
            )}
          </Link>
        </div>

        {/* 2. Decisions Section */}
        <div>
          {!isCollapsed && (
            <div
              onClick={() => setDecisionsOpen(!decisionsOpen)}
              className="flex items-center justify-between px-2.5 py-1 text-[10px] font-mono uppercase font-semibold tracking-wider text-[var(--color-text-quaternary)] cursor-pointer hover:text-[var(--color-text-secondary)]"
            >
              <span>Decisions</span>
              <ChevronDown
                size={12}
                className={`transition-transform duration-150 ${decisionsOpen ? "" : "-rotate-90"}`}
              />
            </div>
          )}

          <div className="space-y-0.5 mt-0.5">
            {/* Active */}
            <Link
              href="/theses?status=OPEN"
              className={`flex items-center h-8 rounded-md px-2.5 transition-colors group relative ${
                isActiveLink("/theses?status=OPEN")
                  ? "bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] font-semibold"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {isActiveLink("/theses?status=OPEN") && !isCollapsed && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-[var(--color-accent-primary)]" />
              )}
              <Clock size={15} className={`shrink-0 ${isActiveLink("/theses?status=OPEN") ? "text-[var(--color-accent-primary)]" : "text-[var(--color-text-tertiary)] group-hover:text-[var(--color-accent-primary)]"}`} />
              {!isCollapsed && (
                <div className="ml-2.5 flex items-center justify-between w-full">
                  <span className="truncate">Active Decisions</span>
                  {openCount > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--color-accent-primary-subtle)] text-[var(--color-accent-primary)]">
                      {openCount}
                    </span>
                  )}
                </div>
              )}
            </Link>

            {/* History */}
            <Link
              href="/theses?status=RESOLVED"
              className={`flex items-center h-8 rounded-md px-2.5 transition-colors group relative ${
                isActiveLink("/theses?status=RESOLVED")
                  ? "bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] font-semibold"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <Compass size={15} className={`shrink-0 ${isActiveLink("/theses?status=RESOLVED") ? "text-[var(--color-accent-primary)]" : "text-[var(--color-text-tertiary)] group-hover:text-[var(--color-accent-primary)]"}`} />
              {!isCollapsed && <span className="ml-2.5 truncate">Decision History</span>}
            </Link>

            {/* Reviews */}
            <Link
              href="/theses?status=NEEDS_REVIEW"
              className={`flex items-center h-8 rounded-md px-2.5 transition-colors group relative ${
                isActiveLink("/theses?status=NEEDS_REVIEW")
                  ? "bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] font-semibold"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <ClipboardList size={15} className={`shrink-0 ${isActiveLink("/theses?status=NEEDS_REVIEW") ? "text-[var(--color-warning)]" : "text-[var(--color-text-tertiary)] group-hover:text-[var(--color-warning)]"}`} />
              {!isCollapsed && (
                <div className="ml-2.5 flex items-center justify-between w-full">
                  <span className="truncate">Outcome Reviews</span>
                  {reviewCount > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--color-warning)]/20 text-[var(--color-warning)] font-semibold">
                      {reviewCount}
                    </span>
                  )}
                </div>
              )}
            </Link>
          </div>
        </div>

        {/* 3. Market Section */}
        <div>
          {!isCollapsed && (
            <div
              onClick={() => setMarketOpen(!marketOpen)}
              className="flex items-center justify-between px-2.5 py-1 text-[10px] font-mono uppercase font-semibold tracking-wider text-[var(--color-text-quaternary)] cursor-pointer hover:text-[var(--color-text-secondary)]"
            >
              <span>Market</span>
              <ChevronDown
                size={12}
                className={`transition-transform duration-150 ${marketOpen ? "" : "-rotate-90"}`}
              />
            </div>
          )}

          <div className="space-y-0.5 mt-0.5">
            <Link
              href="/watchlist"
              className={`flex items-center h-8 rounded-md px-2.5 transition-colors group relative ${
                isActiveLink("/watchlist")
                  ? "bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] font-semibold"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <Eye size={15} className={`shrink-0 ${isActiveLink("/watchlist") ? "text-[var(--color-accent-primary)]" : "text-[var(--color-text-tertiary)] group-hover:text-[var(--color-accent-primary)]"}`} />
              {!isCollapsed && <span className="ml-2.5 truncate">Watchlist</span>}
            </Link>

            <Link
              href="/charts"
              className={`flex items-center h-8 rounded-md px-2.5 transition-colors group relative ${
                isActiveLink("/charts")
                  ? "bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] font-semibold"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <LineChart size={15} className={`shrink-0 ${isActiveLink("/charts") ? "text-[var(--color-accent-primary)]" : "text-[var(--color-text-tertiary)] group-hover:text-[var(--color-accent-primary)]"}`} />
              {!isCollapsed && <span className="ml-2.5 truncate">Markets / Terminal</span>}
            </Link>

            <Link
              href="/market-pulse"
              className={`flex items-center h-8 rounded-md px-2.5 transition-colors group relative ${
                isActiveLink("/market-pulse")
                  ? "bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] font-semibold"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <Activity size={15} className={`shrink-0 ${isActiveLink("/market-pulse") ? "text-[var(--color-accent-primary)]" : "text-[var(--color-text-tertiary)] group-hover:text-[var(--color-accent-primary)]"}`} />
              {!isCollapsed && <span className="ml-2.5 truncate">Intelligence</span>}
            </Link>
          </div>
        </div>

        {/* 4. Standalone Intelligence Tools */}
        <div className="space-y-0.5 pt-1 border-t border-[var(--color-border-subtle)]">
          <Link
            href="/ai-assistant"
            className={`flex items-center h-8 rounded-md px-2.5 transition-colors group relative ${
              isActiveLink("/ai-assistant")
                ? "bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] font-semibold"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <Search size={15} className={`shrink-0 ${isActiveLink("/ai-assistant") ? "text-[var(--color-accent-primary)]" : "text-[var(--color-text-tertiary)] group-hover:text-[var(--color-accent-primary)]"}`} />
            {!isCollapsed && <span className="ml-2.5 truncate">Research</span>}
          </Link>

          <Link
            href="/calibration"
            className={`flex items-center h-8 rounded-md px-2.5 transition-colors group relative ${
              isActiveLink("/calibration")
                ? "bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] font-semibold"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <CheckCircle2 size={15} className={`shrink-0 ${isActiveLink("/calibration") ? "text-[var(--color-profit)]" : "text-[var(--color-text-tertiary)] group-hover:text-[var(--color-profit)]"}`} />
            {!isCollapsed && <span className="ml-2.5 truncate">Calibration</span>}
          </Link>

          <Link
            href="/patterns"
            className={`flex items-center h-8 rounded-md px-2.5 transition-colors group relative ${
              isActiveLink("/patterns")
                ? "bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] font-semibold"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <Sparkles size={15} className={`shrink-0 ${isActiveLink("/patterns") ? "text-[var(--color-accent-primary)]" : "text-[var(--color-text-tertiary)] group-hover:text-[var(--color-accent-primary)]"}`} />
            {!isCollapsed && <span className="ml-2.5 truncate">Patterns</span>}
          </Link>

          <Link
            href="/journal"
            className={`flex items-center h-8 rounded-md px-2.5 transition-colors group relative ${
              isActiveLink("/journal")
                ? "bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] font-semibold"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <BookOpen size={15} className={`shrink-0 ${isActiveLink("/journal") ? "text-[var(--color-accent-primary)]" : "text-[var(--color-text-tertiary)] group-hover:text-[var(--color-accent-primary)]"}`} />
            {!isCollapsed && <span className="ml-2.5 truncate">Journal</span>}
          </Link>
        </div>
      </nav>

      {/* ── Bottom Section ── */}
      <div className="border-t py-2 px-2 space-y-0.5 shrink-0 border-[var(--color-border-subtle)] text-xs">
        {/* Upgrade / Billing */}
        {profile?.plan === "PRO" || profile?.subscriptionStatus === "ACTIVE" ? (
          <button
            type="button"
            onClick={() => portalMutation.mutate()}
            disabled={loadingPortal}
            className="flex items-center rounded-md text-xs font-medium h-8 px-2.5 w-full text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)] disabled:opacity-50 cursor-pointer"
          >
            <CreditCard size={15} className="shrink-0 text-[var(--color-text-tertiary)]" />
            {!isCollapsed && <span className="ml-2.5 truncate">Billing</span>}
          </button>
        ) : (
          <Link
            href="/pricing"
            className="flex items-center rounded-md text-xs font-semibold h-8 px-2.5 text-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary-subtle)]"
          >
            <Zap size={15} className="shrink-0 fill-[var(--color-accent-primary)]" />
            {!isCollapsed && <span className="ml-2.5 truncate">Upgrade to Pro</span>}
          </Link>
        )}

        {/* Settings */}
        <Link
          href="/settings"
          className={`flex items-center h-8 rounded-md px-2.5 transition-colors group ${
            isActiveLink("/settings")
              ? "bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] font-semibold"
              : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          <Settings size={15} className="shrink-0 text-[var(--color-text-tertiary)]" />
          {!isCollapsed && <span className="ml-2.5 truncate">Settings</span>}
        </Link>

        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          className="flex items-center rounded-md text-xs font-medium w-full h-8 px-2.5 text-[var(--color-text-quaternary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)] cursor-pointer"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight size={15} className="shrink-0" /> : <ChevronLeft size={15} className="shrink-0" />}
          {!isCollapsed && <span className="ml-2.5 truncate">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
