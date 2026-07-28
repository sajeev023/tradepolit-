"use client";

import { useState } from "react";
import { Check, Globe, Sparkles, TrendingUp } from "lucide-react";
import type { MarketRegion } from "@/lib/supported-symbols";
import { MARKETS } from "@/lib/supported-symbols";
import { useUIStore } from "@/lib/stores/ui-store";
import { toast } from "sonner";

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (selectedMarket: MarketRegion) => void;
}

export function OnboardingModal({ isOpen, onComplete }: OnboardingModalProps) {
  const { setSelectedMarket, setHasCompletedOnboarding } = useUIStore();
  const [selected, setSelected] = useState<MarketRegion>("US");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const marketOptions = Object.values(MARKETS);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferredMarket: selected,
          hasCompletedOnboarding: true,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        console.warn("Failed to save market preference to server:", body.error);
      }
    } catch (err) {
      console.warn("Network error saving onboarding preference:", err);
    } finally {
      setSelectedMarket(selected);
      setHasCompletedOnboarding(true);
      setIsSubmitting(false);
      onComplete(selected);
      toast.success(`Market preference set to ${MARKETS[selected].label}`);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-fade-in select-none"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-emerald-500/30 bg-zinc-950 p-6 sm:p-8 shadow-2xl shadow-emerald-950/40">
        {/* Glow Accent */}
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="text-center mb-6 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
            <Sparkles size={13} />
            <span>Welcome to TradCopilot</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            What market do you primarily trade in?
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed">
            Your choice customizes your charts, watchlists, AI signals, and live telemetry. You can change this anytime in Settings.
          </p>
        </div>

        {/* Grid Selection */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {marketOptions.map((m) => {
            const isSelected = selected === m.key;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => setSelected(m.key)}
                className={`relative flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "bg-emerald-500/10 border-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-[1.02]"
                    : "bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900"
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center text-zinc-950">
                    <Check size={10} strokeWidth={3} />
                  </div>
                )}
                <span className="text-3xl mb-2">{m.flag}</span>
                <span className="text-xs font-bold text-white mb-0.5">{m.countryName}</span>
                <span className="text-[10px] text-zinc-500 line-clamp-1">{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-500 to-teal-400 text-zinc-950 hover:opacity-95 transition-all duration-200 shadow-lg shadow-emerald-500/25 cursor-pointer disabled:opacity-50 h-[48px]"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <TrendingUp size={18} strokeWidth={2.5} />
              <span>Enter Platform ({MARKETS[selected].label})</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
