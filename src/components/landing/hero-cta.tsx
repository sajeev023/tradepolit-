"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { useDemoLogin } from "./demo-button";

// Single primary CTA (Start Free) with a clear, low-friction secondary
// (Try Instant Demo). Risk reversal sits directly under the primary so
// hesitant Meta-Ads visitors see "no credit card" before they bounce.
export function HeroCTA() {
  const { isLoading, handleDemo } = useDemoLogin();
  return (
    <div className="flex flex-col gap-3 w-full sm:w-auto">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
        {/* Primary: account creation. This is the conversion action. */}
        <Link
          href="/signup"
          className="group w-full sm:w-auto h-12 px-6 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 text-[14px] font-bold inline-flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-zinc-950/30 active:scale-[0.98] transition-all duration-150"
          aria-label="Start free account"
        >
          <span>Start Free — No Card Required</span>
          <ArrowRight size={15} className="text-zinc-950 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>

        {/* Secondary: instant demo. Lower visual weight so it doesn't compete. */}
        <button
          onClick={handleDemo}
          disabled={isLoading}
          className="group w-full sm:w-auto h-12 px-5 rounded-xl bg-transparent hover:bg-zinc-900/60 border border-zinc-700 hover:border-zinc-600 text-zinc-200 text-[13px] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all duration-150"
          aria-label="Try Instant Demo"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Sparkles size={14} className="text-accent" />
          )}
          <span>{isLoading ? "Launching…" : "Try 2 Free Scans"}</span>
        </button>
      </div>

      {/* Risk reversal — directly under the CTAs, not buried 600px down. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-500 font-medium select-none">
        <span>2 free AI scans · no card</span>
        <span className="w-1 h-1 rounded-full bg-zinc-700" />
        <span>read-only</span>
        <span className="w-1 h-1 rounded-full bg-zinc-700" />
        <span>cancel anytime</span>
      </div>
    </div>
  );
}