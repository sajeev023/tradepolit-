"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ShieldCheck, Sparkles, X, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { analytics } from "@/lib/analytics";

interface DemoConversionModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysesUsed?: number;
}

export function DemoConversionModal({ isOpen, onClose, analysesUsed = 2 }: DemoConversionModalProps) {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignup = async () => {
    setIsGoogleLoading(true);
    analytics.trackGoogleOAuthStarted("demo_conversion_modal");
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?redirectTo=/charts` },
    });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[rgba(var(--green-rgb),0.3)] bg-[var(--color-bg-deepest)] p-6 shadow-2xl shadow-[rgba(var(--green-rgb),0.25)]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="space-y-2 text-left mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[rgba(var(--green-rgb),0.3)] bg-[var(--color-profit-bg)] text-[var(--color-profit)] text-xs font-semibold">
            <Sparkles size={12} />
            YC Instant Demo
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
            You&apos;ve used your {analysesUsed} free AI analyses
          </h2>
          <p className="text-xs text-[var(--color-text-tertiary)] leading-relaxed">
            Create your free account to unlock daily scans, persistent trade memory, and automatic risk guardrails.
          </p>
        </div>

        {/* Value Checklist */}
        <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)]/60 p-4 mb-6 space-y-3">
          {[
            "5 free AI chart analyses every day",
            "Save analyses & chat history across devices",
            "Trade Journal with context-calibrated AI coaching",
            "Behavioral Risk Shield (flags revenge & overtrading)",
            "Custom watchlists & real-time alerts",
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-2.5 text-xs text-[var(--color-text-secondary)]">
              <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--color-profit-bg)] text-[var(--color-profit)]">
                <Check size={11} strokeWidth={3} />
              </div>
              <span>{item}</span>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="space-y-3">
          {/* Primary: Google OAuth */}
          <button
            onClick={handleGoogleSignup}
            disabled={isGoogleLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-xs font-bold bg-white text-zinc-950 hover:bg-zinc-100 transition-all duration-200 shadow-md cursor-pointer disabled:opacity-50 h-[44px]"
          >
            {isGoogleLoading ? (
              <div className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            <span>Continue with Google (1-Click)</span>
          </button>

          {/* Secondary: Standard Free Account */}
          <Link
            href="/signup"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold bg-[var(--color-profit)] text-[var(--color-bg-deepest)] hover:bg-[var(--color-profit)]/90 transition-all duration-200 shadow-lg shadow-[rgba(var(--green-rgb),0.25)] h-[44px]"
          >
            <span>Create Free Account</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Footer Guarantee */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-[var(--color-text-tertiary)]">
          <ShieldCheck size={13} className="text-[var(--color-profit)]" />
          <span>100% Free · No credit card required · Read-only access</span>
        </div>

      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
