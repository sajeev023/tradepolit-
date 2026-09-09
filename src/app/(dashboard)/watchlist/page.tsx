"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Eye,
  Plus,
  Trash2,
  X,
  Check,
  Compass,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DirectionBadge, RegimeTag } from "@/components/ui/decision-primitives";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageShell, PageHeader, SectionCard, AttentionBanner } from "@/components/layout/page-shell";

const AVAILABLE_ASSETS = [
  { symbol: "BTC/USD", group: "Crypto" },
  { symbol: "ETH/USD", group: "Crypto" },
  { symbol: "SOL/USD", group: "Crypto" },
  { symbol: "EUR/USD", group: "Forex" },
  { symbol: "GBP/USD", group: "Forex" },
  { symbol: "USD/JPY", group: "Forex" },
  { symbol: "XAU/USD", group: "Commodity" },
  { symbol: "NASDAQ", group: "Indices" },
  { symbol: "S&P500", group: "Indices" },
];

export default function WatchlistPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [newWatchlistName, setNewWatchlistName] = useState("");
  const [selectedWatchlistId, setSelectedWatchlistId] = useState<string>("");

  // 1. Fetch watchlists
  const { data: watchlists } = useQuery<any[]>({
    queryKey: ["watchlists"],
    queryFn: async () => {
      const res = await fetch("/api/v1/watchlists");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to load watchlists");
      return body.data;
    },
    staleTime: 30000,
  });

  // 2. Fetch active theses to correlate intelligence
  const { data: openTheses } = useQuery<any[]>({
    queryKey: ["theses-active-watchlist"],
    queryFn: async () => {
      const res = await fetch("/api/v1/theses?status=OPEN");
      const body = await res.json();
      if (!res.ok) return [];
      return body.data || [];
    },
    staleTime: 15000,
  });

  // 3. Fetch live market tickers / pulse (V4.1: tickers + regimes map)
  const { data: marketData, isLoading: marketLoading } = useQuery<any>({
    queryKey: ["market-pulse-watchlist"],
    queryFn: async () => {
      const res = await fetch("/api/v1/market/pulse");
      const body = await res.json();
      if (!res.ok) return null;
      return body.data;
    },
    refetchInterval: 15000,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/watchlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newWatchlistName.trim(), instruments: ["BTC/USD", "ETH/USD"] }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to create watchlist");
      return body.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["watchlists"] });
      setSelectedWatchlistId(data.id);
      setNewWatchlistName("");
      toast.success("Watchlist created");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/watchlists/${id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to delete");
      return body.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlists"] });
      setSelectedWatchlistId("");
      toast.success("Watchlist deleted");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, instruments }: { id: string; instruments: string[] }) => {
      const res = await fetch(`/api/v1/watchlists/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruments }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to update");
      return body.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["watchlists"] }),
    onError: (err: any) => toast.error(err.message),
  });

  const activeWatchlist = watchlists?.find((w: any) => w.id === selectedWatchlistId) || watchlists?.[0];
  const instruments: string[] = activeWatchlist?.instruments || [];

  // 4. Per-symbol market context snapshots (regime, invalidation proximity, freshness)
  const { data: contextData } = useQuery<any>({
    queryKey: ["watchlist-context", instruments.join(",")],
    queryFn: async () => {
      if (instruments.length === 0) return {};
      const results: Record<string, any> = {};
      await Promise.all(
        instruments.map(async (symbol: string) => {
          try {
            const res = await fetch(`/api/v1/market/context?symbol=${encodeURIComponent(symbol)}&tf=1h`);
            if (!res.ok) return;
            const body = await res.json();
            if (body.data) results[symbol] = body.data;
          } catch {
            // Best-effort per symbol
          }
        })
      );
      return results;
    },
    enabled: !!activeWatchlist && instruments.length > 0,
    refetchInterval: 30000,
  });

  const handleToggleAsset = (symbol: string) => {
    if (!activeWatchlist) return;
    const current: string[] = activeWatchlist.instruments || [];
    const updated = current.includes(symbol)
      ? current.filter((i) => i !== symbol)
      : [...current, symbol];
    updateMutation.mutate({ id: activeWatchlist.id, instruments: updated });
  };

  // Build intelligence map
  const activeThesesMap = useMemo(() => {
    const map = new Map<string, any>();
    (openTheses || []).forEach((t: any) => {
      map.set(t.symbol, t);
    });
    return map;
  }, [openTheses]);

  const getMarketTicker = (symbol: string) => marketData?.tickers?.[symbol];

  const formatPrice = (symbol: string, ticker: any) => {
    if (ticker && Number.isFinite(ticker.price)) return { price: ticker.price, source: "live", freshness: "FRESH" };
    const ctx = contextData?.[symbol];
    if (ctx?.priceAtCapture?.price && Number.isFinite(ctx.priceAtCapture.price)) {
      return {
        price: ctx.priceAtCapture.price,
        source: ctx.priceAtCapture.source ?? "candle-close",
        freshness: ctx.dataFreshness?.status ?? "STALE",
        reason: ctx.dataFreshness?.reason,
      };
    }
    return { price: null, source: null, freshness: "UNAVAILABLE", reason: "No live price or snapshot available" };
  };

  return (
    <PageShell gap="md" className="pb-12 animate-fade-in">
      <PageHeader
        eyebrow="Market Intelligence Surface"
        eyebrowIcon={<Eye size={14} />}
        title="Intelligent Watchlist"
        subtitle="What deserves your attention right now? Correlating live price telemetry with active decisions and structural regime shifts."
        actions={
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="New list name..."
              value={newWatchlistName}
              onChange={(e) => setNewWatchlistName(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs bg-[var(--color-bg-deepest)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] font-mono placeholder-[var(--color-text-quaternary)] focus:outline-none focus:border-[var(--color-accent-primary)]"
            />
            <button
              onClick={() => newWatchlistName.trim() && createMutation.mutate()}
              disabled={!newWatchlistName.trim() || createMutation.isPending}
              className="btn-primary btn-sm"
            >
              <Plus size={13} /> Add List
            </button>
          </div>
        }
      />

      {/* ── Watchlist Tabs ── */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
        <div className="flex items-center gap-1.5">
          {watchlists?.map((w) => {
            const isSelected = w.id === activeWatchlist?.id;
            return (
              <button
                key={w.id}
                onClick={() => setSelectedWatchlistId(w.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 border cursor-pointer ${
                  isSelected
                    ? "bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] border-[var(--color-border-strong)]"
                    : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] border-transparent hover:bg-[var(--color-bg-hover)]"
                }`}
              >
                <span>{w.name}</span>
                <span className="text-[10px] font-mono opacity-60">({w.instruments?.length || 0})</span>
              </button>
            );
          })}
        </div>

        {activeWatchlist && watchlists && watchlists.length > 1 && (
          <button
            onClick={() => {
              if (confirm(`Delete watchlist "${activeWatchlist.name}"?`)) {
                deleteMutation.mutate(activeWatchlist.id);
              }
            }}
            className="text-[11px] text-[var(--color-text-quaternary)] hover:text-[var(--color-loss)] flex items-center gap-1 p-1 rounded transition-colors"
          >
            <Trash2 size={12} /> Delete List
          </button>
        )}
      </div>

      {/* ── Attention Grid ── */}
      {instruments.length > 0 && (
        (() => {
          const attentionItems = instruments
            .map((symbol) => {
              const activeThesis = activeThesesMap.get(symbol);
              const ticker = getMarketTicker(symbol);
              const priceInfo = formatPrice(symbol, ticker);
              const ctx = contextData?.[symbol];
              const change24h = ticker?.change24h ?? ctx?.priceAtCapture?.changePercent24h ?? null;
              const regime = ctx?.marketContext?.regime ?? activeThesis?.regimeAtCreation ?? null;
              const freshness = ctx?.dataFreshness?.status ?? (ticker ? "FRESH" : "UNAVAILABLE");
              const freshnessReason = ctx?.dataFreshness?.reason;

              const livePrice = priceInfo.price;
              let urgency: "high" | "medium" | "low" = "low";
              const reasons: string[] = [];

              if (freshness === "UNAVAILABLE" && !marketLoading) {
                urgency = "medium";
                reasons.push("Market data unavailable");
              }

              if (activeThesis && livePrice) {
                const inv = Number(activeThesis.invalidation);
                const dist = Math.abs(livePrice - inv) / livePrice;
                if (dist < 0.005) {
                  urgency = "high";
                  reasons.push(`Within 0.5% of invalidation (${inv.toLocaleString()})`);
                } else if (dist < 0.02) {
                  if (urgency === "low") urgency = "medium";
                  reasons.push(`Within 2% of invalidation (${inv.toLocaleString()})`);
                }

                const thesisAgeMs = Date.now() - new Date(activeThesis.createdAt).getTime();
                const thesisAgeDays = thesisAgeMs / (1000 * 60 * 60 * 24);
                if (thesisAgeDays > 7) {
                  if (urgency === "low") urgency = "medium";
                  reasons.push(`Thesis is ${Math.round(thesisAgeDays)} days old — review validity`);
                }
              }

              if (ctx?.marketContext?.regime && activeThesis?.regimeAtCreation && ctx.marketContext.regime !== activeThesis.regimeAtCreation) {
                urgency = "high";
                reasons.push(`Regime changed: ${activeThesis.regimeAtCreation.replace(/_/g, " ")} → ${ctx.marketContext.regime.replace(/_/g, " ")}`);
              }

  if (ctx?.technicalContext?.isVolatilitySpike || ctx?.marketContext?.regime?.includes("VOLATILITY")) {
    if (urgency !== "high") urgency = "medium";
    reasons.push("Volatility surge — execution risk elevated");
  }

  if (change24h !== null && Math.abs(change24h) > 3) {
    if (urgency !== "high") urgency = "medium";
    reasons.push(`Significant 24h move (${change24h >= 0 ? "+" : ""}${change24h.toFixed(2)}%)`);
  }

  if (activeThesis && reasons.length === 0) {
    reasons.push(`Active ${activeThesis.bias} thesis`);
  }

  if (reasons.length === 0 && freshness === "STALE") {
    urgency = "medium";
    reasons.push(`Data is stale: ${freshnessReason || "delayed feed"}`);
  }

  if (reasons.length === 0) return null;

  return {
    symbol,
    urgency,
    reasons,
    activeThesis,
    livePrice,
    change24h,
    regime,
    freshness,
    freshnessReason,
  };
})
.filter((item): item is NonNullable<typeof item> => item !== null)
.sort((a, b) => {
  const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return order[a.urgency] - order[b.urgency];
});

          if (attentionItems.length === 0) return null;

          return (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Activity size={15} className="text-[var(--color-accent-primary)]" />
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Attention Queue</h2>
                <span className="text-[10px] text-[var(--color-text-tertiary)]">Ranked by active decision urgency, not price noise</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {attentionItems.slice(0, 6).map((item: any) => (
                  <Link
                    key={item.symbol}
                    href={`/charts?symbol=${encodeURIComponent(item.symbol)}`}
                    className="p-3.5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-hover)] transition-all space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[var(--color-text-primary)] font-mono">{item.symbol}</span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                            item.urgency === "high"
                              ? "bg-[var(--color-loss-bg)] text-[var(--color-loss)] border-[var(--color-loss)]/20"
                              : "bg-[var(--color-warning-bg)] text-[var(--color-warning)] border-[var(--color-warning)]/20"
                          }`}
                        >
                          {item.urgency.toUpperCase()}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-1 py-0.2 rounded border ${
                            item.freshness === "FRESH"
                              ? "border-[var(--color-profit)]/20 text-[var(--color-profit)]"
                              : item.freshness === "STALE"
                                ? "border-[var(--color-warning)]/20 text-[var(--color-warning)]"
                                : "border-[var(--color-loss)]/20 text-[var(--color-loss)]"
                          }`}
                        >
                          {item.freshness}
                        </span>
                      </div>
                      <span
                        className="text-xs font-mono font-semibold"
                        style={{ color: item.change24h >= 0 ? "var(--color-profit)" : "var(--color-loss)" }}
                      >
                        {item.change24h >= 0 ? "+" : ""}
                        {item.change24h?.toFixed(2) ?? "—"}%
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {item.reasons.map((r: string, idx: number) => (
                        <p key={idx} className="text-[11px] text-[var(--color-text-secondary)]">{r}</p>
                      ))}
                    </div>
                    {item.activeThesis && (
                      <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--color-text-quaternary)]">
                        <DirectionBadge direction={item.activeThesis.bias} size="xs" />
                        <span>Inv ${Number(item.activeThesis.invalidation).toLocaleString()} · Target ${Number(item.activeThesis.target).toLocaleString()}</span>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          );
        })()
      )}

      {/* ── Full Watchlist Table ── */}
      {instruments.length === 0 ? (
        <EmptyState
          icon={<Eye size={20} />}
          badge="Empty Watchlist"
          title="No assets added to this watchlist"
          description="Select assets below to monitor price movement, structural regimes, and active decision boundaries."
          reason="Intelligent watchlists filter the noise so you focus only on actionable decisions."
        />
      ) : (
        <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-deepest)]/60 text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-tertiary)]">
                  <th className="py-2.5 px-4">Asset</th>
                  <th className="py-2.5 px-3">Live Price</th>
                  <th className="py-2.5 px-3">24h Change</th>
                  <th className="py-2.5 px-3">Regime Status</th>
                  <th className="py-2.5 px-3">Active Decision</th>
                  <th className="py-2.5 px-3">Decision Boundary</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)] text-xs font-mono">
              {instruments.map((symbol) => {
                const activeThesis = activeThesesMap.get(symbol);
                const ticker = getMarketTicker(symbol);
                const priceInfo = formatPrice(symbol, ticker);
                const ctx = contextData?.[symbol];
                const change24h = ticker?.change24h ?? ctx?.priceAtCapture?.changePercent24h ?? null;
                const regime = ctx?.marketContext?.regime ?? activeThesis?.regimeAtCreation ?? null;
                const freshness = ctx?.dataFreshness?.status ?? (ticker ? "FRESH" : "UNAVAILABLE");
                const group = AVAILABLE_ASSETS.find((a) => a.symbol === symbol)?.group || "Market";
                const livePrice = priceInfo.price;

                return (
                  <tr
                    key={symbol}
                    className="hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer"
                    onClick={() => router.push(`/charts?symbol=${encodeURIComponent(symbol)}`)}
                  >
                    <td className="py-3 px-4 font-bold text-[var(--color-text-primary)]">
                      <div className="flex items-center gap-2">
                        <span>{symbol}</span>
                        <span className="text-[10px] font-normal text-[var(--color-text-tertiary)] px-1 rounded bg-[var(--color-bg-deepest)]">{group}</span>
                        
                        {freshness === "UNAVAILABLE" && (
                          <span className="text-[9px] font-mono px-1 py-0.5 rounded border border-[var(--color-loss)]/20 text-[var(--color-loss)] bg-[var(--color-loss)]/5">
                            NO DATA
                          </span>
                        )}
                        {freshness === "STALE" && (
                          <span className="text-[9px] font-mono px-1 py-0.5 rounded border border-[var(--color-warning)]/20 text-[var(--color-warning)] bg-[var(--color-warning)]/5">
                            STALE
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3 font-semibold text-[var(--color-text-primary)]">
                      {livePrice !== null ? `$${Number(livePrice).toLocaleString()}` : <span className="text-[var(--color-text-quaternary)]">—</span>}
                    </td>

                    <td className="py-3 px-3">
                      {change24h !== null ? (
                        <span
                          className="inline-flex items-center gap-0.5 font-semibold"
                          style={{ color: change24h >= 0 ? "var(--color-profit)" : "var(--color-loss)" }}
                        >
                          {change24h >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                          {change24h >= 0 ? `+${change24h.toFixed(2)}%` : `${change24h.toFixed(2)}%`}
                        </span>
                      ) : (
                        <span className="text-[var(--color-text-quaternary)]">—</span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      {regime ? <RegimeTag regime={regime} /> : <span className="text-[10px] text-[var(--color-text-quaternary)]">—</span>}
                    </td>

                    <td className="py-3 px-3">
                      {activeThesis ? (
                        <div className="flex items-center gap-1.5">
                          <DirectionBadge direction={activeThesis.bias} size="xs" />
                          <span className="text-[11px] text-[var(--color-accent-primary)] font-semibold">Target ${Number(activeThesis.target).toLocaleString()}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-[var(--color-text-quaternary)]">No Active Thesis</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-[11px] text-[var(--color-text-secondary)]">
                      {activeThesis && livePrice ? (
                        <div className="space-y-1">
                          <span className="text-[var(--color-warning)] block">Invalid: ${Number(activeThesis.invalidation).toLocaleString()}</span>
                          <div className="h-1 w-full bg-[var(--color-bg-deepest)] rounded-full overflow-hidden border border-[var(--color-border-subtle)]">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.max(0, Math.min(100, (1 - Math.abs(livePrice - Number(activeThesis.invalidation)) / livePrice) * 100))}%`,
                                backgroundColor: "var(--color-warning)",
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-[var(--color-text-quaternary)]">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/charts?symbol=${encodeURIComponent(symbol)}`}
                          className="px-2.5 py-1 rounded bg-[var(--color-accent-primary-subtle)] text-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary-muted)] text-[10px] font-semibold flex items-center gap-1 cursor-pointer border border-[rgba(var(--accent-rgb),0.2)]"
                        >
                          <Compass size={11} /> Brief
                        </Link>
                        <button
                          onClick={() => handleToggleAsset(symbol)}
                          className="p-1 rounded text-[var(--color-text-quaternary)] hover:text-[var(--color-loss)] transition-colors"
                          title="Remove from watchlist"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Asset Catalog (Quick Add / Toggle) ── */}
      <div className="card p-5 border-[var(--color-border-subtle)] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-xs text-[var(--color-text-primary)]">
            <Plus size={14} className="text-[var(--color-accent-primary)]" />
            <span>Manage Monitored Assets</span>
          </div>
          <span className="text-[10px] font-mono text-[var(--color-text-tertiary)]">
            Click to add / remove from active list
          </span>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {AVAILABLE_ASSETS.map((asset) => {
            const isAdded = instruments.includes(asset.symbol);
            return (
              <button
                key={asset.symbol}
                type="button"
                onClick={() => handleToggleAsset(asset.symbol)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium flex items-center gap-1.5 transition-colors border cursor-pointer ${
                  isAdded
                    ? "bg-[var(--color-accent-primary-subtle)] text-[var(--color-accent-primary)] border-[rgba(var(--accent-rgb),0.3)]"
                    : "bg-[var(--color-bg-deepest)] text-[var(--color-text-tertiary)] border-[var(--color-border-subtle)] hover:text-[var(--color-text-secondary)] hover:border-[var(--color-border-default)]"
                }`}
              >
                <span>{asset.symbol}</span>
                {isAdded ? <Check size={11} /> : <Plus size={11} className="opacity-40" />}
              </button>
            );
          })}
        </div>
      </div>
    </PageShell>
  );
}
