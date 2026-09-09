"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Zap } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

function PricingCardsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loadingCheckout, setLoadingCheckout] = useState(false);

  const { data: profile, isLoading: profileLoading } = useQuery<any>({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/v1/profile");
      const body = await res.json();
      if (!res.ok) return null;
      return body.data;
    },
  });

  useEffect(() => {
    if (searchParams.get("upgrade") === "cancelled") {
      toast.info("No worries — you can upgrade anytime.");
    }
  }, [searchParams]);

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      setLoadingCheckout(true);
      const res = await fetch("/api/stripe/create-checkout", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Checkout failed");
      return body;
    },
    onSuccess: (data) => {
      if (data.url) router.push(data.url);
      else toast.error("Failed to generate checkout link.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Something went wrong.");
    },
    onSettled: () => setLoadingCheckout(false),
  });

  const handleProClick = () => {
    if (!profile) { router.push("/signup"); return; }
    if (profile.plan === "PRO") { toast.success("You're already on the Pro plan!"); router.push("/settings"); return; }
    checkoutMutation.mutate();
  };

  const handleFreeClick = () => {
    if (!profile) router.push("/signup");
    else router.push("/charts");
  };

  if (profileLoading) {
    return (
      <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
        {[1, 2].map((i) => (
          <div key={i} className="card p-7 space-y-5 animate-pulse">
            <div className="h-4 w-24 bg-[var(--color-bg-tertiary)] rounded" />
            <div className="h-10 w-20 bg-[var(--color-bg-tertiary)] rounded" />
            <div className="h-10 w-full bg-[var(--color-bg-tertiary)] rounded" />
            <div className="h-px bg-[var(--color-border-subtle)]" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((j) => (
                <div key={j} className="h-4 w-full bg-[var(--color-bg-tertiary)] rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-4 sm:gap-6 max-w-3xl mx-auto animate-enter-delay-1 items-stretch">
      {/* Free */}
      <div className="card p-4 sm:p-6 lg:p-7 flex flex-col justify-between order-2 md:order-1 border-[var(--color-border-subtle)] bg-[var(--surface)]">
        <div className="space-y-3.5 sm:space-y-5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] sm:text-[11px] font-semibold text-[var(--accent)] tracking-wider">STARTER</span>
            <span className="text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg-band)] border border-[var(--color-border-subtle)] text-[var(--color-text-tertiary)]">FREE</span>
          </div>

          <div>
            <h3 className="text-[17px] sm:text-[18px] font-bold text-[var(--color-text-primary)]">Free</h3>
            <p className="text-[11px] sm:text-[12px] text-[var(--color-text-tertiary)] mt-0.5 sm:mt-1">Core day-trading telemetry and basic chart scans.</p>
          </div>

          <div className="flex items-baseline">
            <span className="text-[28px] sm:text-[36px] font-bold tracking-tight font-mono text-[var(--color-text-primary)]">$0</span>
            <span className="ml-1.5 text-[11px] sm:text-[12px] text-[var(--color-text-quaternary)] font-mono">/ forever</span>
          </div>

          <button
            onClick={handleFreeClick}
            className="btn-secondary w-full justify-center text-[13px] font-semibold cursor-pointer h-10 sm:h-[42px]"
          >
            {profile ? "Back to Terminal" : "Start Free"}
          </button>

          <div className="h-px bg-[var(--color-border-subtle)]" />

          <div className="space-y-3 sm:space-y-4 text-left">
            <div className="space-y-1 sm:space-y-1.5">
              <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-quaternary)]">Technical Analysis</span>
              <ul className="space-y-1 sm:space-y-1.5">
                <li className="flex items-center gap-2 text-[11px] sm:text-[12px] text-[var(--color-text-secondary)]">
                  <Check size={12} className="text-[var(--color-accent-primary)] shrink-0" />
                  <span>5 chart scans / day</span>
                </li>
                <li className="flex items-center gap-2 text-[11px] sm:text-[12px] text-[var(--color-text-secondary)]">
                  <Check size={12} className="text-[var(--color-accent-primary)] shrink-0" />
                  <span>OHLCV candle telemetry</span>
                </li>
              </ul>
            </div>

            <div className="space-y-1 sm:space-y-1.5">
              <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-quaternary)]">Journal &amp; Alerts</span>
              <ul className="space-y-1 sm:space-y-1.5">
                <li className="flex items-center gap-2 text-[11px] sm:text-[12px] text-[var(--color-text-secondary)]">
                  <Check size={12} className="text-[var(--color-accent-primary)] shrink-0" />
                  <span>Last 20 trades session memory</span>
                </li>
                <li className="flex items-center gap-2 text-[11px] sm:text-[12px] text-[var(--color-text-secondary)]">
                  <Check size={12} className="text-[var(--color-accent-primary)] shrink-0" />
                  <span>3 proactive alerts</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Pro */}
      <div
        className="card p-4 sm:p-6 lg:p-7 flex flex-col justify-between relative order-1 md:order-2 border-[rgba(var(--accent-rgb),0.35)] bg-[rgba(var(--accent-rgb),0.02)]"
      >
        <div className="space-y-3.5 sm:space-y-5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] sm:text-[11px] font-semibold text-[var(--accent)] tracking-wider">INSTITUTIONAL</span>
            <span className="text-[9px] sm:text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[rgba(var(--accent-rgb),0.12)] text-[var(--accent)] border border-[rgba(var(--accent-rgb),0.25)]">
              7-DAY TRIAL
            </span>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-[17px] sm:text-[18px] font-bold text-[var(--color-text-primary)]">Pro Terminal</h3>
              <Zap size={13} className="text-[var(--color-accent-primary)] fill-[var(--color-accent-primary)]" />
            </div>
            <p className="text-[11px] sm:text-[12px] text-[var(--color-text-tertiary)] mt-0.5 sm:mt-1">Full terminal capacity, sub-3s multi-model scans, and behavioral guardrails.</p>
          </div>

          <div className="flex items-baseline">
            <span className="text-[28px] sm:text-[36px] font-bold tracking-tight font-mono text-[var(--color-text-primary)]">$7.49</span>
            <span className="ml-1.5 text-[11px] sm:text-[12px] text-[var(--color-text-quaternary)] font-mono">/ month</span>
          </div>

          <div>
            <button
              onClick={handleProClick}
              disabled={loadingCheckout}
              className="btn-primary w-full justify-center text-[13px] font-semibold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer h-10 sm:h-[42px]"
            >
              {loadingCheckout ? (
                <div className="w-3.5 h-3.5 border-2 border-[var(--color-bg-primary)] border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Zap size={13} className="fill-[var(--color-bg-primary)]" />
                  {profile?.plan === "PRO" ? "Manage Subscription" : "Start 7-Day Free Trial"}
                </>
              )}
            </button>
            <p className="text-center text-[10px] sm:text-[11px] text-[var(--color-text-quaternary)] mt-1.5 sm:mt-2 font-mono">
              Cancel anytime in 1 click
            </p>
          </div>

          <div className="h-px bg-[var(--color-border-subtle)]" />

          <div className="space-y-3 sm:space-y-4 text-left">
            <div className="space-y-1 sm:space-y-1.5">
              <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-[var(--color-accent-primary)]">Technical Analysis</span>
              <ul className="space-y-1 sm:space-y-1.5">
                <li className="flex items-center gap-2 text-[11px] sm:text-[12px] text-[var(--color-text-primary)]">
                  <Check size={12} className="text-[var(--color-accent-primary)] shrink-0" />
                  <span>Unlimited scans (<span className="font-mono text-[11px] text-[var(--color-accent-primary)]">&lt;3s</span> race pipeline)</span>
                </li>
                <li className="flex items-center gap-2 text-[11px] sm:text-[12px] text-[var(--color-text-primary)]">
                  <Check size={12} className="text-[var(--color-accent-primary)] shrink-0" />
                  <span>Full indicator matrix (RSI, MACD, EMA, ATR)</span>
                </li>
              </ul>
            </div>

            <div className="space-y-1 sm:space-y-1.5">
              <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-[var(--color-accent-primary)]">Discipline &amp; Journal</span>
              <ul className="space-y-1 sm:space-y-1.5">
                <li className="flex items-center gap-2 text-[11px] sm:text-[12px] text-[var(--color-text-primary)]">
                  <Check size={12} className="text-[var(--color-accent-primary)] shrink-0" />
                  <span>Real-time revenge &amp; sizing anomaly guardrails</span>
                </li>
                <li className="flex items-center gap-2 text-[11px] sm:text-[12px] text-[var(--color-text-primary)]">
                  <Check size={12} className="text-[var(--color-accent-primary)] shrink-0" />
                  <span>Persistent full history trade journal &amp; weekly audit</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PricingCards() {
  return <PricingCardsContent />;
}
