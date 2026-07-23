"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertOctagon, RefreshCw, Home } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error details silently to our telemetry pipeline
    console.error("[Next.js Runtime Crash]:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#090A0C] text-[#EDEEF0] px-4 font-sans select-none relative overflow-hidden">
      {/* Ambient Red Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-red-500 opacity-[0.03] rounded-full blur-[90px] pointer-events-none" />

      <div className="text-center space-y-6 max-w-md relative z-10 animate-fade-in">
        {/* Warning Icon */}
        <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center border border-red-500/20 bg-red-500/5 shadow-md shadow-red-500/5">
          <AlertOctagon size={28} className="text-red-400 animate-pulse" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
            System Error Occurred
          </h1>
          <p className="text-xs text-[var(--color-text-secondary)] font-medium leading-relaxed max-w-[320px] mx-auto">
            TradCopilot encountered a critical internal disruption. Our monitoring system has flagged the event.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="btn-primary h-10 px-5 text-xs font-semibold gap-2 cursor-pointer shadow-lg shadow-emerald-500/10 flex items-center"
          >
            <RefreshCw size={13} />
            <span>Try Again</span>
          </button>
          <Link
            href="/charts"
            className="btn-secondary h-10 px-5 text-xs font-semibold gap-2 cursor-pointer flex items-center border-[var(--color-border-default)] hover:border-zinc-800"
          >
            <Home size={13} />
            <span>Go to Workstation</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
