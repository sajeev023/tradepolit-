"use client";

export const dynamic = "force-dynamic";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { SearchCommandPalette } from "@/components/layout/command-palette";
import { NotificationPanel } from "@/components/layout/notification-panel";
import { DemoBanner } from "@/components/DemoBanner";
import { useUIStore } from "@/lib/stores/ui-store";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import {
  TrendingUp,
  BookOpen,
  Activity,
  Grid3X3,
  MoreHorizontal,
  Eye,
  Bot,
  Calculator,
  FlaskConical,
  Bell,
  Settings,
  Newspaper,
  Target,
  Sparkles,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const MORE_ITEMS = [
  { label: "Theses", icon: Target, href: "/theses" },
  { label: "Your Patterns", icon: Sparkles, href: "/patterns" },
  { label: "Watchlist", icon: Eye, href: "/watchlist" },
  { label: "News", icon: Newspaper, href: "/news" },
  { label: "Risk Calculator", icon: Calculator, href: "/risk-calculator" },
  { label: "Backtester", icon: FlaskConical, href: "/backtester" },
  { label: "Alerts", icon: Bell, href: "/alerts" },
  { label: "AI Coach", icon: Bot, href: "/ai-assistant" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    if (moreOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [moreOpen]);

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center border-t select-none"
      style={{
        height: "calc(56px + env(safe-area-inset-bottom, 0px))",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        backgroundColor: "var(--color-bg-secondary)",
        borderColor: "var(--color-border-subtle)",
        backdropFilter: "blur(20px) saturate(160%)",
        WebkitBackdropFilter: "blur(20px) saturate(160%)",
      }}
    >
      {/* Markets */}
      <button
        onClick={() => router.push("/charts")}
        className="relative flex flex-1 min-w-0 flex-col items-center justify-center gap-0.5 cursor-pointer press-scale-sm"
        style={{ minHeight: "44px" }}
        aria-label="Markets"
      >
        {pathname.startsWith("/charts") && (
          <motion.span
            layoutId="mobile-nav-indicator"
            transition={{ type: "spring", damping: 30, stiffness: 350, mass: 0.8 }}
            className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-5 rounded-full bg-[var(--color-accent-primary)]"
          />
        )}
        <motion.div
          animate={{ y: pathname.startsWith("/charts") ? -1 : 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-0.5"
        >
          <TrendingUp
            size={20}
            style={{
              color: pathname.startsWith("/charts") ? "var(--color-accent-primary)" : "var(--color-text-quaternary)",
              strokeWidth: pathname.startsWith("/charts") ? 2.5 : 2,
            }}
          />
          <span
            style={{
              fontSize: "9px",
              fontWeight: 500,
              color: pathname.startsWith("/charts") ? "var(--color-accent-primary)" : "var(--color-text-quaternary)",
              lineHeight: 1.2,
            }}
          >
            Markets
          </span>
        </motion.div>
      </button>

      {/* Journal */}
      <button
        onClick={() => router.push("/journal")}
        className="relative flex flex-1 min-w-0 flex-col items-center justify-center gap-0.5 cursor-pointer press-scale-sm"
        style={{ minHeight: "44px" }}
        aria-label="Journal"
      >
        {pathname.startsWith("/journal") && (
          <motion.span
            layoutId="mobile-nav-indicator"
            transition={{ type: "spring", damping: 30, stiffness: 350, mass: 0.8 }}
            className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-5 rounded-full bg-[var(--color-accent-primary)]"
          />
        )}
        <motion.div
          animate={{ y: pathname.startsWith("/journal") ? -1 : 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-0.5"
        >
          <BookOpen
            size={20}
            style={{
              color: pathname.startsWith("/journal") ? "var(--color-accent-primary)" : "var(--color-text-quaternary)",
              strokeWidth: pathname.startsWith("/journal") ? 2.5 : 2,
            }}
          />
          <span
            style={{
              fontSize: "9px",
              fontWeight: 500,
              color: pathname.startsWith("/journal") ? "var(--color-accent-primary)" : "var(--color-text-quaternary)",
              lineHeight: 1.2,
            }}
          >
            Journal
          </span>
        </motion.div>
      </button>

      {/* Center Analyze Button */}
      <div className="flex items-center justify-center flex-1" style={{ minHeight: "44px" }}>
        <motion.button
          onClick={() => router.push("/charts")}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.93 }}
          transition={{ type: "spring", damping: 15, stiffness: 400, mass: 0.5 }}
          className="flex items-center justify-center rounded-full cursor-pointer"
          style={{
            width: 44,
            height: 44,
            background: "linear-gradient(135deg, var(--color-accent-primary), var(--accent-bright))",
            boxShadow: "0 4px 16px rgba(47, 198, 232, 0.35)",
            marginTop: -12,
          }}
          aria-label="Analyze"
        >
          <Activity size={20} color="var(--background)" strokeWidth={2.5} />
        </motion.button>
      </div>

      {/* Tools */}
      <button
        onClick={() => router.push("/risk-calculator")}
        className="relative flex flex-1 min-w-0 flex-col items-center justify-center gap-0.5 cursor-pointer press-scale-sm"
        style={{ minHeight: "44px" }}
        aria-label="Tools"
      >
        {pathname.startsWith("/risk-calculator") && (
          <motion.span
            layoutId="mobile-nav-indicator"
            transition={{ type: "spring", damping: 30, stiffness: 350, mass: 0.8 }}
            className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-5 rounded-full bg-[var(--color-accent-primary)]"
          />
        )}
        <motion.div
          animate={{ y: pathname.startsWith("/risk-calculator") ? -1 : 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-0.5"
        >
          <Grid3X3
            size={20}
            style={{
              color: pathname.startsWith("/risk-calculator") ? "var(--color-accent-primary)" : "var(--color-text-quaternary)",
              strokeWidth: pathname.startsWith("/risk-calculator") ? 2.5 : 2,
            }}
          />
          <span
            style={{
              fontSize: "9px",
              fontWeight: 500,
              color: pathname.startsWith("/risk-calculator") ? "var(--color-accent-primary)" : "var(--color-text-quaternary)",
              lineHeight: 1.2,
            }}
          >
            Tools
          </span>
        </motion.div>
      </button>

      {/* More */}
      <div ref={moreRef} className="relative flex-1">
        <button
          onClick={() => setMoreOpen((v) => !v)}
          className="relative flex w-full min-w-0 flex-col items-center justify-center gap-0.5 cursor-pointer press-scale-sm"
          style={{ minHeight: "44px" }}
          aria-label="More"
        >
          {moreOpen && (
            <motion.span
              layoutId="mobile-nav-indicator"
              transition={{ type: "spring", damping: 30, stiffness: 350, mass: 0.8 }}
              className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-5 rounded-full bg-[var(--color-accent-primary)]"
            />
          )}
          <motion.div
            animate={{ y: moreOpen ? -1 : 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-0.5"
          >
            <MoreHorizontal
              size={20}
              style={{
                color: moreOpen ? "var(--color-accent-primary)" : "var(--color-text-quaternary)",
                strokeWidth: moreOpen ? 2.5 : 2,
              }}
            />
            <span
              style={{
                fontSize: "9px",
                fontWeight: 500,
                color: moreOpen ? "var(--color-accent-primary)" : "var(--color-text-quaternary)",
                lineHeight: 1.2,
              }}
            >
              More
            </span>
          </motion.div>
        </button>

        {/* More bottom sheet */}
        <AnimatePresence>
          {moreOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 z-50"
                onClick={() => setMoreOpen(false)}
              />
              <motion.div
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-[60] rounded-t-2xl border-t overflow-hidden"
                style={{
                  maxHeight: "70vh",
                  backgroundColor: "var(--color-bg-secondary)",
                  borderColor: "var(--color-border-subtle)",
                  paddingBottom: "calc(56px + env(safe-area-inset-bottom, 0px))",
                }}
              >
                <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
                  <span className="text-sm font-bold text-[var(--color-text-primary)]">All Tools</span>
                  <button
                    onClick={() => setMoreOpen(false)}
                    className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--color-bg-hover)] cursor-pointer"
                    aria-label="Close"
                  >
                    <X size={16} style={{ color: "var(--color-text-tertiary)" }} />
                  </button>
                </div>
                <div className="overflow-y-auto p-3 grid grid-cols-3 gap-2">
                  {MORE_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMoreOpen(false)}
                        className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-colors"
                        style={{
                          backgroundColor: isActive ? "var(--color-bg-hover)" : "transparent",
                          color: isActive ? "var(--color-accent-primary)" : "var(--color-text-secondary)",
                        }}
                      >
                        <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                        <span className="text-[10px] font-medium text-center leading-tight">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarCollapsed } = useUIStore();
  const [user, setUser] = useState<User | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }: any) => {
      setUser(data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user ?? null);
    });

    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "transparent" }}>
      {/* Demo Banner */}
      <DemoBanner />

      <Sidebar />
      <Topbar
        userEmail={user?.email}
        userName={user?.user_metadata?.full_name as string}
        avatarUrl={user?.user_metadata?.avatar_url as string}
      />

      <main
        className="transition-all"
        style={{
          paddingTop: "calc(var(--spacing-topbar) + var(--spacing-demo-banner))",
          marginLeft: isMobile
            ? "0px"
            : sidebarCollapsed
            ? "var(--spacing-sidebar-collapsed)"
            : "var(--spacing-sidebar)",
          transitionDuration: "200ms",
          transitionTimingFunction: "var(--ease-out-expo)",
          paddingBottom: isMobile
            ? "calc(72px + env(safe-area-inset-bottom, 0px))"
            : "0px",
        }}
      >
        <div className={isMobile ? "px-3 py-3" : "p-4 sm:p-5 lg:p-6"}>{children}</div>
      </main>

      {/* Premium Mobile Bottom Navigation */}
      {isMobile && <MobileBottomNav />}

      <SearchCommandPalette />
      <NotificationPanel />
    </div>
  );
}
