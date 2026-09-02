"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUIStore } from "@/lib/stores/ui-store";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart,
  BookOpen,
  Calculator,
  Newspaper,
  FlaskConical,
  Bell,
  Eye,
  Settings,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Zap,
  CreditCard,
  Target,
  Sparkles,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

/* ─── Nav Configuration ─── */
interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "Markets",
    items: [
      { label: "Charts", href: "/charts", icon: <LineChart size={18} /> },
      { label: "Watchlist", href: "/watchlist", icon: <Eye size={18} /> },
      { label: "News", href: "/news", icon: <Newspaper size={18} /> },
    ],
  },
  {
    title: "Tools",
    items: [
      { label: "Theses", href: "/theses", icon: <Target size={18} /> },
      { label: "Journal", href: "/journal", icon: <BookOpen size={18} /> },
      { label: "Risk Calculator", href: "/risk-calculator", icon: <Calculator size={18} /> },
      { label: "Backtester", href: "/backtester", icon: <FlaskConical size={18} /> },
      { label: "Alerts", href: "/alerts", icon: <Bell size={18} /> },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { label: "Your Patterns", href: "/patterns", icon: <Sparkles size={18} /> },
    ],
  },
];

/* ─── Nav Item Component ─── */
function NavLink({
  item,
  isActive,
  isCollapsed,
}: {
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
}) {
  return (
    <Link
      id={item.label === "Journal" ? "journal-section" : undefined}
      href={item.href}
      className={`
        relative flex items-center h-9 rounded-md text-[13px] font-medium
        transition-colors duration-150 group pl-3 pr-2
        ${isActive
          ? "bg-[var(--color-bg-hover)] text-[var(--color-text-primary)]"
          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
        }
      `}
    >
      {/* Active indicator */}
      {isActive && !isCollapsed && (
        <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-[var(--color-accent-primary)]" />
      )}

      <span
        className={`shrink-0 transition-colors duration-150 ${
          isActive
            ? "text-[var(--color-accent-primary)]"
            : "text-[var(--color-text-tertiary)] group-hover:text-[var(--color-accent-primary)]"
        }`}
        style={{ marginRight: isCollapsed ? "0" : "12px" }}
      >
        {item.icon}
      </span>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12, delay: 0.08 }}
            className="whitespace-nowrap overflow-hidden"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Collapsed tooltip */}
      {isCollapsed && (
        <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-md text-[11px] font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 glass">
          {item.label}
        </div>
      )}
    </Link>
  );
}

/* ─── Sidebar Component ─── */
export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  const { data: profile } = useQuery<any>({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/v1/profile");
      const body = await res.json();
      if (!res.ok) return null;
      return body.data;
    },
  });

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

  return (
    <>
      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="hidden lg:flex fixed left-0 top-0 z-40 flex-col border-r select-none"
        style={{
          width: isCollapsed ? "64px" : "220px",
          top: "var(--spacing-demo-banner)",
          height: "calc(100dvh - var(--spacing-demo-banner))",
          backgroundColor: "var(--color-bg-deepest)",
          borderColor: "var(--color-border-subtle)",
          transition: `width 200ms var(--ease-out-expo)`,
        }}
      >
        {/* ── Logo ── */}
        <div
          className="flex items-center gap-3 px-3.5 border-b shrink-0"
          style={{
            height: "var(--spacing-topbar)",
            borderColor: "var(--color-border-subtle)",
          }}
        >
          <div
            className="flex items-center justify-center rounded-md shrink-0"
            style={{
              width: 24,
              height: 24,
              background: "linear-gradient(135deg, var(--color-accent-primary), var(--accent-bright))",
            }}
          >
            <TrendingUp size={13} color="var(--background)" strokeWidth={2.5} />
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12, delay: 0.08 }}
                className="text-[14px] font-semibold whitespace-nowrap text-[var(--color-text-primary)]"
                style={{ letterSpacing: "-0.01em" }}
              >
                TradCopilot
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1 custom-scrollbar">
          {navSections.map((section, secIdx) => (
            <div key={section.title}>
              {secIdx > 0 && (
                <div className="h-px my-3 mx-2" style={{ backgroundColor: "var(--color-border-subtle)" }} />
              )}

              {!isCollapsed && (
                <div className="px-3 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-quaternary)] select-none">
                  {section.title}
                </div>
              )}

              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    isActive={pathname.startsWith(item.href)}
                    isCollapsed={isCollapsed}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Bottom section ── */}
        <div
          className="border-t py-3 px-2 space-y-0.5 shrink-0"
          style={{ borderColor: "var(--color-border-subtle)" }}
        >
          {/* Billing / Upgrade */}
          {profile?.plan === "PRO" || profile?.subscriptionStatus === "ACTIVE" ? (
            <button
              type="button"
              onClick={() => portalMutation.mutate()}
              disabled={loadingPortal}
              className="flex items-center rounded-md text-[13px] font-medium transition-colors duration-150 group relative h-9 pl-3 cursor-pointer w-full text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)] disabled:opacity-50"
            >
              <span className="shrink-0 text-[var(--color-text-tertiary)] group-hover:text-[var(--color-accent-primary)] transition-colors" style={{ marginRight: isCollapsed ? "0" : "12px" }}>
                <CreditCard size={18} />
              </span>
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12, delay: 0.08 }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    Manage Billing
                  </motion.span>
                )}
              </AnimatePresence>
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-md text-[11px] font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 glass">
                  Manage Billing
                </div>
              )}
            </button>
          ) : (
            <Link
              href="/pricing"
              className="flex items-center rounded-md text-[13px] font-semibold transition-all duration-150 group relative h-9 pl-3 cursor-pointer text-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary-subtle)]"
            >
              <span className="shrink-0" style={{ marginRight: isCollapsed ? "0" : "12px" }}>
                <Zap size={18} className="fill-[var(--color-accent-primary)]" />
              </span>
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12, delay: 0.08 }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    Upgrade to Pro
                  </motion.span>
                )}
              </AnimatePresence>
              {isCollapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-md text-[11px] font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 glass">
                  Upgrade to Pro
                </div>
              )}
            </Link>
          )}

          {/* Settings */}
          <NavLink
            item={{ label: "Settings", href: "/settings", icon: <Settings size={18} /> }}
            isActive={pathname.startsWith("/settings")}
            isCollapsed={isCollapsed}
          />

          {/* Collapse toggle */}
          <button
            onClick={toggleSidebar}
            className="flex items-center rounded-md text-[13px] font-medium transition-colors duration-150 w-full h-9 pl-3 cursor-pointer text-[var(--color-text-quaternary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <span className="shrink-0" style={{ marginRight: isCollapsed ? "0" : "12px" }}>
              {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </span>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12, delay: 0.08 }}
                  className="whitespace-nowrap overflow-hidden"
                >
                  Collapse
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </aside>
    </>
  );
}
