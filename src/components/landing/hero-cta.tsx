"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { useDemoLogin } from "./demo-button";

import { trackClarityEvent } from "@/lib/clarity";

// Single primary CTA (Start Free) with a clear, low-friction secondary
// (Try Instant Demo). Risk reversal sits directly under the primary so
// hesitant visitors see "no credit card" before they bounce.
export function HeroCTA() {
  const { isLoading, handleDemo } = useDemoLogin();
  return (
    <div className="flex flex-col gap-3 w-full sm:w-auto">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
        {/* Primary: account creation. Cyan gradient = product identity (not white). */}
        <Link
          href="/signup"
          onClick={() => trackClarityEvent("hero_start_free_click")}
          className="group btn-primary-lg w-full sm:w-auto"
          aria-label="Start free account"
        >
          <span>Start Free — No Card Required</span>
          <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>

        {/* Secondary: instant demo. Lower visual weight so it doesn't compete. */}
        <button
          onClick={() => {
            trackClarityEvent("hero_demo_button_click");
            handleDemo();
          }}
          disabled={isLoading}
          className="group w-full sm:w-auto h-12 px-5 rounded-xl bg-transparent hover:bg-[var(--color-bg-hover)] border border-[var(--color-border-default)] hover:border-[var(--color-border-strong)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-[13px] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all duration-150"
          aria-label="Try Instant Demo"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-[var(--color-text-tertiary)] border-t-transparent rounded-full animate-spin" />
          ) : (
            <Sparkles size={14} style={{ color: "var(--color-accent-primary)" }} />
          )}
          <span>{isLoading ? "Launching…" : "Try 2 Free Scans"}</span>
        </button>
      </div>

      {/* Risk reversal — directly under the CTAs. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--color-text-quaternary)] font-medium select-none font-mono">
        <span>2 free AI scans</span>
        <span className="w-1 h-1 rounded-full bg-[var(--color-border-strong)]" />
        <span>no card</span>
        <span className="w-1 h-1 rounded-full bg-[var(--color-border-strong)]" />
        <span>read-only</span>
        <span className="w-1 h-1 rounded-full bg-[var(--color-border-strong)]" />
        <span>cancel anytime</span>
      </div>
    </div>
  );
}