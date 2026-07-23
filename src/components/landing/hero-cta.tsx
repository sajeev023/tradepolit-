"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { useDemoLogin } from "./demo-button";

export function HeroCTA() {
  const { isLoading, handleDemo } = useDemoLogin();
  return (
    <div className="flex flex-col gap-2 w-full sm:w-auto">
      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-[11px] font-medium w-fit">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>2 Complimentary AI Scans Included</span>
      </div>

      <button
        onClick={handleDemo}
        disabled={isLoading}
        className="group w-full sm:w-auto h-11 px-6 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 text-[13px] font-bold inline-flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-zinc-950/20 active:scale-[0.98] transition-all duration-150 border border-white"
        aria-label="Try Instant Demo"
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
        ) : (
          <Sparkles size={14} className="text-zinc-950" />
        )}
        <span>{isLoading ? "Launching Demo..." : "Try Instant Demo"}</span>
        <ArrowRight size={14} className="text-zinc-950 transition-transform duration-200 group-hover:translate-x-0.5" />
      </button>
    </div>
  );
}
