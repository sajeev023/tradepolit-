"use client";

import Link from "next/link";
import { TrendingUp, HelpCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg-deepest)] text-[var(--color-text-primary)] px-4 font-sans select-none">
      {/* Glow Effect Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[var(--color-accent-primary)] opacity-[0.03] rounded-full blur-[80px] pointer-events-none" />

      <div className="text-center space-y-6 max-w-md relative z-10 animate-fade-in">
        {/* Symbol Icon */}
        <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center border border-[var(--color-border-default)] bg-[var(--color-bg-tertiary)] shadow-md">
          <HelpCircle size={28} className="text-[var(--color-text-quaternary)] animate-pulse" />
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight tabular-nums text-[var(--color-text-primary)]">
            404 <span className="text-[var(--color-text-tertiary)] font-normal text-2xl mx-2">|</span> Lost in the Tape
          </h1>
          <p className="text-xs text-[var(--color-text-secondary)] font-medium leading-relaxed max-w-[320px] mx-auto">
            This market doesn&apos;t exist. The quote feed went cold. Let&apos;s get you back to the charts.
          </p>
        </div>

        <div className="pt-2 space-y-3">
          {/* Primary escape goes to the public homepage — /charts is
              auth-gated, so anonymous visitors just bounced to login. */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer text-black"
            style={{
              backgroundColor: "var(--color-accent-primary)",
              boxShadow: "0 0 16px color-mix(in srgb, var(--color-accent-primary) 15%, transparent)",
            }}
          >
            <TrendingUp size={14} />
            <span>Back to Homepage</span>
          </Link>
          <p className="text-[11px] text-[var(--color-text-quaternary)]">
            or{" "}
            <Link href="/features" className="underline hover:text-[var(--color-text-secondary)]">
              explore TradCopilot features
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
