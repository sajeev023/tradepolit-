"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, ArrowRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useDemoLogin } from "../demo-button";
import { trackClarityEvent } from "@/lib/clarity";
import { usePrefersReducedMotion } from "./motion";

/* ═══════════════════════════════════════════════════════════════════════
   Navbar (v2) — read-only intelligence chrome.

   The navbar's primary action is NOT amber. Amber is reserved for the
   single per-viewport accent inside each section (two-actor law 2.2), and
   a sticky bar sits in every viewport — so it carries a neutral off-white
   primary instead. Mobile collapses to a drawer (5.3) preserving the
   one-primary-action rule. The instant-demo route is preserved verbatim.
   ═══════════════════════════════════════════════════════════════════════ */

export function V2Navbar() {
  const [open, setOpen] = useState(false);
  const { isLoading, handleDemo } = useDemoLogin();
  const reduced = usePrefersReducedMotion();

  return (
    <header
      className="sticky top-0 z-30"
      style={{
        background: "rgba(9, 11, 14, 0.82)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--hairline)",
      }}
    >
      <div className="v2-shell flex h-14 items-center justify-between">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5"
          aria-label="TradCopilot home"
        >
          <span
            className="v2-mono flex h-6 w-6 items-center justify-center rounded-md text-[12px] font-bold"
            style={{
              background: "var(--bg-surface-2)",
              border: "1px solid var(--hairline)",
              color: "var(--text-primary)",
            }}
          >
            TC
          </span>
          <span className="v2-mono text-[13px] font-semibold tracking-tight v2-fg">
            TRADCOPILOT
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          <a href="#features" className="v2-link px-3 text-[13px]">
            Features
          </a>
          <a href="#pricing" className="v2-link px-3 text-[13px]">
            Pricing
          </a>
          <button
            onClick={handleDemo}
            disabled={isLoading}
            className="v2-link px-3 text-[13px] disabled:opacity-50"
            aria-label="Run an instant demo"
          >
            {isLoading ? "…" : "Live Demo"}
          </button>
          <Link href="/login" className="v2-link px-3 text-[13px]">
            Sign in
          </Link>
          <Link
            href="/signup"
            onClick={() => trackClarityEvent("nav_get_started_click")}
            className="ml-2 inline-flex h-9 items-center justify-center rounded-lg px-4 text-[13px] font-semibold transition-transform duration-100 hover:scale-[1.02]"
            style={{
              background: "var(--text-primary)",
              color: "var(--bg-field)",
            }}
          >
            Get Started
          </Link>
        </nav>

        {/* Mobile */}
        <div className="flex md:hidden items-center gap-2">
          <Link
            href="/login"
            className="v2-link px-2 text-[13px]"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-9 items-center justify-center rounded-lg px-3.5 text-[12px] font-semibold transition-transform duration-100 hover:scale-[1.02]"
            style={{ background: "var(--text-primary)", color: "var(--bg-field)" }}
          >
            Get Started
          </Link>
          <button
            onClick={() => setOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-md"
            style={{ color: "var(--text-secondary)" }}
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="v2-drawer-backdrop"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduced ? undefined : { opacity: 0 }}
              transition={reduced ? { duration: 0 } : { duration: 0.15 }}
              className="fixed inset-0 z-40"
              style={{ background: "rgba(0,0,0,0.5)" }}
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              key="v2-drawer"
              initial={reduced ? false : { y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reduced ? undefined : { y: "100%", opacity: 0 }}
              transition={reduced ? { duration: 0 } : { duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="fixed bottom-0 left-0 right-0 z-40 rounded-t-2xl"
              style={{
                background: "var(--bg-surface-1)",
                borderTop: "1px solid var(--hairline)",
                paddingBottom: "env(safe-area-inset-bottom, 0px)",
              }}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--hairline)" }}>
                <span className="v2-mono text-[13px] font-semibold v2-fg">MENU</span>
                <button
                  onClick={() => setOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-md"
                  style={{ color: "var(--text-secondary)" }}
                  aria-label="Close menu"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="py-2">
                <a href="#features" onClick={() => setOpen(false)} className="flex items-center px-5 py-3.5 text-[14px] v2-muted hover:v2-fg">
                  Features
                </a>
                <a href="#pricing" onClick={() => setOpen(false)} className="flex items-center px-5 py-3.5 text-[14px] v2-muted hover:v2-fg">
                  Pricing
                </a>
                <button
                  disabled={isLoading}
                  onClick={() => {
                    setOpen(false);
                    handleDemo();
                  }}
                  className="flex w-full items-center px-5 py-3.5 text-[14px] v2-muted hover:v2-fg disabled:opacity-50"
                >
                  {isLoading ? "Loading…" : "Live Demo"}
                </button>
                <Link href="/login" onClick={() => setOpen(false)} className="flex items-center px-5 py-3.5 text-[14px] v2-muted hover:v2-fg">
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setOpen(false)}
                  className="mx-5 mt-2 mb-3 inline-flex h-11 w-[calc(100%-2.5rem)] items-center justify-center gap-2 rounded-lg text-[14px] font-semibold"
                  style={{ background: "var(--text-primary)", color: "var(--bg-field)" }}
                >
                  Get Started <ArrowRight size={15} />
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}