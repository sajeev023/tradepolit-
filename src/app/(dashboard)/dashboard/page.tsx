"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Zap } from "lucide-react";
import { toast } from "sonner";
import { Panel, Label, Skeleton } from "@/components/fd/primitives";
import {
  CockpitHero,
  CopilotNoticed,
  MarketMood,
  ThesesOnWatch,
  type Insights,
  type Thesis,
} from "@/components/cockpit/cockpit-sections";
import { ProPerformance, type PerformanceSummary } from "@/components/cockpit/pro-performance";
import { BRAND } from "@/lib/brand";

async function getJson<T>(url: string, soft = false): Promise<T> {
  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok) {
    if (soft) return null as T;
    throw new Error(body.error?.message || `Failed to load ${url}`);
  }
  return body.data;
}

function ProTeaser() {
  return (
    <Panel className="h-full" padded={false}>
      <div className="flex h-full flex-col justify-between gap-6 p-5 sm:p-6">
        <div>
          <Label>Pro terminal</Label>
          <h3 className="mt-2 font-serif text-[28px] leading-[1.05] tracking-[-0.01em] text-[var(--color-text-primary)]">
            See what your trading <em className="text-[var(--accent)]">actually</em> costs you.
          </h3>
          <p className="mt-3 max-w-md text-[13px] leading-relaxed text-[var(--color-text-tertiary)]">
            Equity curve, expectancy, weekly AI review, unlimited chart analyses and alerts — all built from your own journal.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/pricing" className="btn-primary btn-lg"><Zap size={15} /> Upgrade to Pro</Link>
          <Link href="/pricing" className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]">
            Compare plans <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </Panel>
  );
}

function CockpitContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("upgrade") === "success") toast.success(`Welcome to ${BRAND.name} Pro! 🎉`);
  }, [searchParams]);

  const { data: profile, isLoading: profileLoading } = useQuery<any>({
    queryKey: ["profile"],
    queryFn: () => getJson("/api/v1/profile"),
  });
  const isPro = profile?.subscriptionStatus === "PRO_ACTIVE";

  const { data: theses, isLoading: thesesLoading } = useQuery<Thesis[]>({
    queryKey: ["theses", "dashboard"],
    queryFn: () => getJson("/api/v1/theses?status=ALL"),
  });
  const { data: insights, isLoading: insightsLoading } = useQuery<Insights | null>({
    queryKey: ["insights"],
    queryFn: () => getJson<Insights | null>("/api/v1/insights", true),
  });
  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
    refetch: refetchSummary,
  } = useQuery<PerformanceSummary>({
    queryKey: ["dashboard-performance-summary"],
    queryFn: () => getJson("/api/v1/performance/summary"),
    enabled: isPro,
  });

  const openCount = theses?.filter((t) => t.status === "OPEN").length ?? 0;
  const reviewCount = theses?.filter((t) => t.status !== "OPEN" && !t.outcome).length ?? 0;
  const closedTrades = isPro ? summary?.metrics?.totalTrades ?? null : insights?.summary?.closedTrades ?? null;

  if (profileLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-[320px] w-full" />
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <CockpitHero openCount={openCount} reviewCount={reviewCount} closedTrades={closedTrades} />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr] lg:gap-5">
        <ThesesOnWatch theses={theses} loading={thesesLoading} />
        <div className="flex flex-col gap-4 lg:gap-5">
          <CopilotNoticed insights={insights} loading={insightsLoading} />
          <MarketMood />
        </div>
      </div>

      {isPro ? (
        <ProPerformance summary={summary} loading={summaryLoading} error={summaryError} onRetry={() => refetchSummary()} />
      ) : (
        <ProTeaser />
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[320px] w-full" />}>
      <CockpitContent />
    </Suspense>
  );
}
