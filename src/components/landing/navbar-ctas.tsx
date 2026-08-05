"use client";

import Link from "next/link";
import { Play } from "lucide-react";
import { useDemoLogin } from "./demo-button";

export function DesktopNavCTA() {
  const { isLoading, handleDemo } = useDemoLogin();
  return (
    <button
      onClick={handleDemo}
      disabled={isLoading}
      className="btn-ghost text-[13px] cursor-pointer"
    >
      {isLoading ? "…" : "Live Demo"}
    </button>
  );
}

// Mobile gets a real primary CTA — previously mobile users only saw
// "Sign In" + a three-dot menu, which is the path of least resistance
// to bounce. "Get Started" is the conversion action for Meta Ads traffic.
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

export function MobileGetStartedCTA() {
  return (
    <Link
      href="/signup"
      className="h-9 px-3.5 rounded-lg text-[12px] font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform md:hidden"
      style={{ background: "var(--color-text-primary)", color: "var(--color-bg-primary)" }}
    >
      Get Started
    </Link>
  );
}