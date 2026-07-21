"use client";

import { Play } from "lucide-react";
import { useDemoLogin } from "./demo-button";

export function DesktopNavCTA() {
  const { isLoading, handleDemo } = useDemoLogin();
  return (
    <button onClick={handleDemo} disabled={isLoading} className="btn-ghost text-[13px] cursor-pointer">
      {isLoading ? "..." : "Demo"}
    </button>
  );
}

export function MobileNavCTA() {
  const { isLoading, handleDemo } = useDemoLogin();
  return (
    <button
      onClick={handleDemo}
      disabled={isLoading}
      className="h-10 px-3 rounded-lg text-[12px] font-semibold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
      style={{ background: "linear-gradient(135deg, var(--color-accent-primary), #06B6D4)", color: "#09090B" }}
    >
      {isLoading ? (
        <div className="w-3 h-3 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
      ) : (
        <Play size={11} fill="currentColor" />
      )}
      Try Demo
    </button>
  );
}
