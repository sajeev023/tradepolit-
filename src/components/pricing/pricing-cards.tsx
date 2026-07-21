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
    <div className="grid md:grid-cols-2 gap-5 sm:gap-6 max-w-2xl mx-auto animate-enter-delay-1">
      {/* Free */}
      <div className="pricing-free-card card p-6 sm:p-7 flex flex-col justify-between order-2 md:order-1">
        <div className="space-y-5 sm:space-y-6">
          <div>
            <h3 className="text-[15px] font-semibold text-[var(--color-text-secondary)]">Free</h3>
            <p className="text-[12px] text-[var(--color-text-quaternary)] mt-0.5">Core day-trading tools</p>
          </div>
          <div className="flex items-baseline">
            <span className="text-[40px] font-semibold tracking-tight font-mono text-[var(--color-text-primary)]">$0</span>
            <span className="ml-1.5 text-[13px] text-[var(--color-text-quaternary)]">/month</span>
          </div>

          <button
            onClick={handleFreeClick}
            className="btn-secondary w-full justify-center h-12 text-[13px] cursor-pointer"
          >
            {profile ? "Back to Terminal" : "Start Free"}
          </button>

          <div className="h-px bg-[var(--color-border-subtle)]" />

          <ul className="space-y-3">
            {["5 analyses/day limit", "3 proactive alerts/day", "7-day history retention", "Basic journal (last 20 trades)", "Basic indicators (RSI, MACD)"].map((item, i) => (
              <li key={i} className="flex items-center gap-2.5 text-[13px] text-[var(--color-text-secondary)]">
                <Check size={14} className="text-[var(--color-profit)] shrink-0" />
                <span>{item}</span>
              </li>
            ))}
            {["Behavioral detection", "Market overview", "Weekly reports", "Saved analyses", "Performance dashboard"].map((item, i) => (
              <li key={i} className="flex items-center gap-2.5 text-[13px] text-[var(--color-text-quaternary)]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-border-strong)] shrink-0"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Pro */}
      <div className="pricing-pro-card card p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden border-[var(--color-accent-primary)]/25 order-1 md:order-2">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[var(--color-accent-primary)] opacity-[0.06] rounded-full blur-[60px] pointer-events-none" />
        <div className="absolute top-0 right-0 px-3 py-1 bg-[var(--color-accent-primary)] text-[var(--color-bg-primary)] text-[10px] font-bold tracking-[0.04em] rounded-bl-lg">
          POPULAR
        </div>

        <div className="space-y-6 relative z-10">
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)]">Pro</h3>
              <Zap size={14} className="text-[var(--color-accent-primary)] fill-[var(--color-accent-primary)]" />
            </div>
            <p className="text-[12px] text-[var(--color-text-tertiary)] mt-0.5">Full institutional workstation</p>
          </div>
          <div className="flex items-baseline">
            <span className="text-[40px] font-semibold tracking-tight font-mono text-[var(--color-text-primary)]">$7.49</span>
            <span className="ml-1.5 text-[13px] text-[var(--color-text-quaternary)]">/month</span>
          </div>

          <button
            onClick={handleProClick}
            disabled={loadingCheckout}
            className="btn-primary w-full justify-center h-12 text-[13px] bg-[var(--color-accent-primary)] text-[var(--color-bg-primary)] hover:bg-[var(--color-accent-primary-hover)] disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
          >
            {loadingCheckout ? (
              <div className="w-3.5 h-3.5 border-2 border-[var(--color-bg-primary)] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Zap size={13} className="fill-[var(--color-bg-primary)]" />
                {profile?.plan === "PRO" ? "Manage Subscription" : "Upgrade to Pro"}
              </>
            )}
          </button>
          <p className="text-center text-[11px] text-[var(--color-text-quaternary)]">
            7-day free trial · Cancel anytime
          </p>

          <div className="h-px bg-[var(--color-border-subtle)]" />

          <ul className="space-y-3">
            {["Unlimited analyses & alerts", "Unlimited history & journal entries", "All indicators (RSI, MACD, EMA, ATR)", "Full behavioral detection & insights", "Market overview with AI one-liners", "AI weekly performance reports", "Saved analyses + comparison view", "Performance analytics dashboard", "Session persistence + PRO badge", "Priority AI response time"].map((item, i) => (
              <li key={i} className="flex items-center gap-2.5 text-[13px] text-[var(--color-text-primary)]">
                <Check size={14} className="text-[var(--color-accent-primary)] shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function PricingCards() {
  return <PricingCardsContent />;
}
