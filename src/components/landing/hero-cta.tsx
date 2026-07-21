"use client";

import { Play } from "lucide-react";
import { useDemoLogin } from "./demo-button";

export function HeroCTA() {
  const { isLoading, handleDemo } = useDemoLogin();
  return (
    <button
      onClick={handleDemo}
      disabled={isLoading}
      className="w-full sm:w-auto btn-primary h-12 sm:h-11 px-6 text-[15px] sm:text-[13px] font-semibold gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all duration-150 justify-center"
      style={{ background: "linear-gradient(135deg, var(--color-accent-primary), #06B6D4)", color: "#09090B", borderRadius: "10px", border: "none" }}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
      ) : (
        <Play size={13} fill="currentColor" />
      )}
      {isLoading ? "Loading..." : "Try Live Demo"}
    </button>
  );
}
