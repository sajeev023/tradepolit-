"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Gauge, CandlestickChart, BookOpen, LayoutGrid, Sparkles, Settings, Zap, X } from "lucide-react";
import { useUIStore } from "@/lib/stores/ui-store";
import { ALL_NAV } from "./nav-config";

const TABS = [
  { href: "/dashboard", label: "Cockpit", icon: Gauge },
  { href: "/charts", label: "Markets", icon: CandlestickChart },
] as const;
const TABS_RIGHT = [{ href: "/journal", label: "Journal", icon: BookOpen }] as const;

function Tab({ href, label, icon: Icon, active }: { href: string; label: string; icon: typeof Gauge; active: boolean }) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className="relative flex h-full flex-1 flex-col items-center justify-center gap-[3px] transition-transform active:scale-90"
    >
      <Icon size={21} strokeWidth={active ? 2.2 : 1.6} style={{ color: active ? "var(--color-text-primary)" : "var(--color-text-tertiary)" }} />
      <span className="font-mono text-[8.5px] font-medium uppercase tracking-[0.1em]" style={{ color: active ? "var(--accent)" : "var(--color-text-quaternary)" }}>
        {label}
      </span>
      {active && (
        <motion.span
          layoutId="dock-dot"
          transition={{ type: "spring", stiffness: 500, damping: 36 }}
          className="absolute top-[5px] h-[3px] w-5 rounded-full"
          style={{ background: "var(--accent)", boxShadow: "0 0 10px rgba(var(--accent-rgb),0.7)" }}
        />
      )}
    </Link>
  );
}

export function MobileDock() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { copilotOpen, setCopilotOpen } = useUIStore();

  useEffect(() => setMenuOpen(false), [pathname]);

  const menuActive = menuOpen || !(["/dashboard", "/charts", "/journal"] as const).some((p) => pathname.startsWith(p));

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-3 z-40 flex h-[62px] items-stretch rounded-[22px] border select-none lg:hidden"
        style={{
          bottom: "calc(10px + env(safe-area-inset-bottom, 0px))",
          background: "rgba(18, 18, 16, 0.88)",
          borderColor: "var(--color-border-strong)",
          backdropFilter: "blur(22px) saturate(160%)",
          WebkitBackdropFilter: "blur(22px) saturate(160%)",
          boxShadow: "0 18px 40px -12px rgba(0,0,0,0.75)",
        }}
      >
        {TABS.map((t) => <Tab key={t.href} {...t} active={pathname.startsWith(t.href)} />)}

        <div className="relative flex flex-1 items-center justify-center">
          <motion.button
            whileTap={{ scale: 0.88 }}
            transition={{ type: "spring", stiffness: 500, damping: 22 }}
            onClick={() => setCopilotOpen(!copilotOpen)}
            aria-label="Open Copilot"
            aria-pressed={copilotOpen}
            className="absolute -top-5 flex h-[54px] w-[54px] cursor-pointer items-center justify-center rounded-full"
            style={{
              background: "var(--accent)",
              color: "var(--on-accent)",
              boxShadow: "0 0 0 5px var(--background), 0 10px 28px -4px rgba(var(--accent-rgb),0.55)",
            }}
          >
            <Sparkles size={22} strokeWidth={2.2} />
          </motion.button>
        </div>

        {TABS_RIGHT.map((t) => <Tab key={t.href} {...t} active={pathname.startsWith(t.href)} />)}

        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="All sections"
          aria-expanded={menuOpen}
          className="relative flex h-full flex-1 cursor-pointer flex-col items-center justify-center gap-[3px] transition-transform active:scale-90"
        >
          <LayoutGrid size={21} strokeWidth={menuActive ? 2.2 : 1.6} style={{ color: menuActive ? "var(--color-text-primary)" : "var(--color-text-tertiary)" }} />
          <span className="font-mono text-[8.5px] font-medium uppercase tracking-[0.1em]" style={{ color: menuActive ? "var(--accent)" : "var(--color-text-quaternary)" }}>
            More
          </span>
        </button>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              key="scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[45] bg-black/60 lg:hidden"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              key="sheet"
              role="dialog"
              aria-label="All sections"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 36 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => info.offset.y > 90 && setMenuOpen(false)}
              className="fixed inset-x-0 bottom-0 z-[48] rounded-t-[26px] border-t px-4 pt-3 lg:hidden"
              style={{
                background: "var(--panel-1)",
                borderColor: "var(--color-border-strong)",
                paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
                maxHeight: "82dvh",
              }}
            >
              <div className="mx-auto mb-3 h-1 w-9 rounded-full" style={{ background: "var(--color-border-strong)" }} />
              <div className="mb-3 flex items-center justify-between">
                <p className="font-serif text-[24px] leading-none text-[var(--color-text-primary)]">
                  Everything, <em className="text-[var(--accent)]">one tap.</em>
                </p>
                <button onClick={() => setMenuOpen(false)} className="icon-button" aria-label="Close menu"><X size={17} /></button>
              </div>
              <div className="custom-scrollbar grid max-h-[52dvh] grid-cols-3 gap-2 overflow-y-auto pb-2" data-lenis-prevent>
                {ALL_NAV.map((n, i) => {
                  const Icon = n.icon;
                  const active = pathname.startsWith(n.href);
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      className="flex min-h-[78px] flex-col items-start justify-between rounded-xl border p-3 transition-transform active:scale-95"
                      style={{
                        background: active ? "var(--panel-3)" : "var(--panel-2)",
                        borderColor: active ? "rgba(var(--accent-rgb),0.45)" : "var(--hairline)",
                        animation: `enter 0.35s var(--ease-out-expo) ${i * 22}ms both`,
                      }}
                    >
                      <Icon size={18} strokeWidth={1.8} style={{ color: active ? "var(--accent)" : "var(--color-text-secondary)" }} />
                      <span className="text-[12px] font-medium leading-tight text-[var(--color-text-primary)]">{n.label}</span>
                    </Link>
                  );
                })}
                <Link href="/settings" className="flex min-h-[78px] flex-col items-start justify-between rounded-xl border p-3 active:scale-95" style={{ background: "var(--panel-2)", borderColor: "var(--hairline)" }}>
                  <Settings size={18} strokeWidth={1.8} className="text-[var(--color-text-secondary)]" />
                  <span className="text-[12px] font-medium text-[var(--color-text-primary)]">Settings</span>
                </Link>
                <Link href="/pricing" className="flex min-h-[78px] flex-col items-start justify-between rounded-xl border p-3 active:scale-95" style={{ background: "rgba(var(--accent-rgb),0.07)", borderColor: "rgba(var(--accent-rgb),0.35)" }}>
                  <Zap size={18} strokeWidth={2} style={{ color: "var(--accent)" }} />
                  <span className="text-[12px] font-semibold" style={{ color: "var(--accent)" }}>Go Pro</span>
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
