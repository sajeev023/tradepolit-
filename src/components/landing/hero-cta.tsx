"use client";

import Link from "next/link";
import { ArrowRight, Eye } from "lucide-react";
import { useDemoLogin } from "./demo-button";

import { trackClarityEvent } from "@/lib/clarity";

// Single primary CTA (Start Free) with a clear, low-friction secondary
// (Try 2 Free Scans). Risk reversal sits directly under the primary so
// hesitant visitors see "no credit card" before they bounce. Both buttons
// use the token system; the primary is the cyan accent (the one place cyan
// is "loud"), matching the nav, pricing, and final-CTA primaries.
export function HeroCTA() {
  const { isLoading, handleDemo } = useDemoLogin();
  return (
    <div data-onpage-cta className="flex flex-col gap-2.5 sm:gap-3 w-full sm:w-auto">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
        {/* Primary: account creation. This is the conversion action. */}
        <Link
          href="/signup"
          onClick={() => trackClarityEvent("hero_start_free_click")}
          className="group w-full sm:w-auto h-10 sm:h-11 px-5 sm:px-6 rounded-md text-[13px] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all duration-150 text-[var(--bg-primary)] shadow-sm"
          style={{ background: "var(--accent)" }}
          aria-label="Start free account"
        >
          <span>Get Started Free</span>
          <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>

        {/* Secondary: instant demo. Lower visual weight so it doesn't compete. */}
        <button
          onClick={() => {
            trackClarityEvent("hero_demo_button_click");
            handleDemo();
          }}
          disabled={isLoading}
          className="group w-full sm:w-auto h-10 sm:h-11 px-4 sm:px-5 rounded-md bg-transparent hover:bg-[var(--color-bg-hover)] border border-[var(--color-border-strong)] hover:border-[var(--accent)] text-[var(--ink)] text-[13px] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all duration-150"
          aria-label="Try 2 free scans"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-[var(--muted)] border-t-transparent rounded-full animate-spin" />
          ) : (
            <Eye size={14} className="text-[var(--accent)]" />
          )}
          <span>{isLoading ? "Launching…" : "Interactive Terminal Demo"}</span>
        </button>
      </div>

      {/* Risk reversal + Truthful proof microline */}
      <div className="space-y-1 select-none pt-0.5">
        <div className="flex flex-wrap items-center gap-x-2.5 sm:gap-x-3 gap-y-0.5 text-[10px] sm:text-[11px] text-[var(--muted)] font-medium">
          <span>Free tier included</span>
          <span className="w-1 h-1 rounded-full bg-[var(--color-border-strong)]" />
          <span>No credit card required</span>
          <span className="w-1 h-1 rounded-full bg-[var(--color-border-strong)]" />
          <span>Read-only architecture</span>
        </div>
        <div className="text-[10px] sm:text-[11px] font-mono text-[var(--muted)] tracking-tight">
          Direct Binance &amp; OANDA feeds · Zero broker access · Capital stays on your exchange
        </div>
      </div>
    </div>
  );
}