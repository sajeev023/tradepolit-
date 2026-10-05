"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Zap } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

interface FeatureGroup {
  title: string;
  items: string[];
}

const FREE_FEATURES: FeatureGroup[] = [
  { title: "Technical analysis", items: ["5 chart scans / day", "OHLCV candle telemetry"] },
  { title: "Journal & alerts", items: ["Last 20 trades session memory", "3 proactive alerts"] },
];

const PRO_FEATURES: FeatureGroup[] = [
  { title: "Technical analysis", items: ["Unlimited scans (<3s race pipeline)", "Full indicator matrix (RSI, MACD, EMA, ATR)"] },
  { title: "Discipline & journal", items: ["Real-time revenge & sizing anomaly guardrails", "Persistent full history trade journal & weekly audit"] },
];

function Features({ groups, strong }: { groups: FeatureGroup[]; strong?: boolean }) {
  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.title}>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-quaternary)]">{g.title}</span>
          <ul className="mt-2.5 space-y-2.5">
            {g.items.map((it) => (
              <li key={it} className={`flex items-start gap-2.5 text-[13px] leading-snug ${strong ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"}`}>
                <Check size={14} className="mt-[2px] shrink-0" style={{ color: "var(--accent)" }} />
                <span>{it}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="mx-auto grid max-w-3xl gap-4 md:grid-cols-2 sm:gap-6">
      {[1, 2].map((i) => (
        <div key={i} className="card space-y-5 p-7">
          <div className="skeleton h-4 w-24 rounded" />
          <div className="skeleton h-12 w-28 rounded" />
          <div className="skeleton h-11 w-full rounded-lg" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((j) => <div key={j} className="skeleton h-4 w-full rounded" />)}
          </div>
        </div>
      ))}
    </div>
  );
}

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

  if (profileLoading) return <CardSkeleton />;

  return (
    <div className="mx-auto grid max-w-3xl items-stretch gap-4 md:grid-cols-2 sm:gap-6">
      {/* Free */}
      <div className="card order-2 flex flex-col gap-6 p-6 sm:p-7 md:order-1">
        <div>
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">Starter</span>
          <h3 className="mt-3 font-serif text-[30px] leading-none tracking-[-0.01em] text-[var(--color-text-primary)]">Free</h3>
          <p className="mt-2 text-[13px] text-[var(--color-text-tertiary)]">Core day-trading telemetry and basic chart scans.</p>
        </div>
        <p className="flex items-baseline">
          <span className="font-mono text-[44px] font-medium leading-none tracking-[-0.04em] text-[var(--color-text-primary)]">$0</span>
          <span className="ml-2 font-mono text-[12px] text-[var(--color-text-quaternary)]">/ forever</span>
        </p>
        <button onClick={handleFreeClick} className="btn-secondary btn-lg btn-block cursor-pointer">
          {profile ? "Back to terminal" : "Start free"}
        </button>
        <div className="h-px" style={{ background: "var(--hairline)" }} />
        <Features groups={FREE_FEATURES} />
      </div>

      {/* Pro */}
      <div className="card relative order-1 flex flex-col gap-6 overflow-hidden p-6 sm:p-7 md:order-2" style={{ borderColor: "rgba(var(--accent-rgb),0.4)", background: "linear-gradient(180deg, rgba(var(--accent-rgb),0.06), var(--panel-1) 38%)" }}>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: "linear-gradient(90deg, transparent, var(--accent), transparent)" }} />
        <div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em]" style={{ color: "var(--accent)" }}>Institutional</span>
            <span className="rounded px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ background: "rgba(var(--accent-rgb),0.12)", color: "var(--accent)" }}>7-day trial</span>
          </div>
          <h3 className="mt-3 flex items-center gap-2 font-serif text-[30px] leading-none tracking-[-0.01em] text-[var(--color-text-primary)]">
            Pro Terminal <Zap size={16} style={{ color: "var(--accent)", fill: "var(--accent)" }} />
          </h3>
          <p className="mt-2 text-[13px] text-[var(--color-text-tertiary)]">Full terminal capacity, sub-3s multi-model scans, and behavioral guardrails.</p>
        </div>
        <p className="flex items-baseline">
          <span className="font-mono text-[44px] font-medium leading-none tracking-[-0.04em] text-[var(--color-text-primary)]">$7.49</span>
          <span className="ml-2 font-mono text-[12px] text-[var(--color-text-quaternary)]">/ month</span>
        </p>
        <div>
          <button onClick={handleProClick} disabled={loadingCheckout} className="btn-primary btn-lg btn-block cursor-pointer disabled:opacity-50">
            {loadingCheckout ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <>
                <Zap size={14} />
                {profile?.plan === "PRO" ? "Manage subscription" : "Start 7-day free trial"}
              </>
            )}
          </button>
          <p className="mt-2 text-center font-mono text-[11px] text-[var(--color-text-quaternary)]">Cancel anytime in 1 click</p>
        </div>
        <div className="h-px" style={{ background: "var(--hairline)" }} />
        <Features groups={PRO_FEATURES} strong />
      </div>
    </div>
  );
}

export function PricingCards() {
  return <PricingCardsContent />;
}
