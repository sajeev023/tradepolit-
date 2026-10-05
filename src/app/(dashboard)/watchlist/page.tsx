"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, Plus, Trash2, X, RefreshCw, AlertTriangle, Pencil, Check } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Chip, Delta, EmptyState, Label, Skeleton } from "@/components/fd/primitives";
import { useBinanceMultiStream } from "@/hooks/useBinanceStream";
import { BINANCE_WS_SYMBOLS } from "@/lib/market-registry";
import { formatPrice } from "@/lib/format-price";

const MAX_NAME_LENGTH = 40;

const AVAILABLE_ASSETS = [
  { symbol: "BTC/USD",  group: "Crypto" },
  { symbol: "ETH/USD",  group: "Crypto" },
  { symbol: "SOL/USD",  group: "Crypto" },
  { symbol: "EUR/USD",  group: "Forex" },
  { symbol: "GBP/USD",  group: "Forex" },
  { symbol: "USD/JPY",  group: "Forex" },
  { symbol: "XAU/USD",  group: "Commodity" },
  { symbol: "NASDAQ",   group: "Indices" },
  { symbol: "S&P500",   group: "Indices" },
];

const GROUPS = ["Crypto", "Forex", "Commodity", "Indices"];

export default function WatchlistPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [newWatchlistName, setNewWatchlistName] = useState("");
  const [selectedWatchlistId, setSelectedWatchlistId] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [filterGroup, setFilterGroup] = useState<string>("All");
  const livePrices = useBinanceMultiStream(BINANCE_WS_SYMBOLS);

  // 1. Fetch watchlists
  const { data: watchlists, isLoading } = useQuery<any[]>({
    queryKey: ["watchlists"],
    queryFn: async () => {
      const res = await fetch("/api/v1/watchlists");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to load watchlists");
      return body.data;
    },
    staleTime: 30000,
    gcTime: 60000,
  });

  // 2. Create
  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/watchlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newWatchlistName.trim(), instruments: [] }),
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

  // 3. Rename
  const renameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await fetch(`/api/v1/watchlists/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to rename");
      return body.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlists"] });
      setEditingId(null);
      toast.success("Renamed");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // 4. Delete
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

  // 5. Update instruments with optimistic update
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
    onMutate: async ({ id, instruments }) => {
      await queryClient.cancelQueries({ queryKey: ["watchlists"] });
      const prev = queryClient.getQueryData<any[]>(["watchlists"]);
      queryClient.setQueryData<any[]>(["watchlists"], (old) =>
        old?.map(w => w.id === id ? { ...w, instruments } : w)
      );
      return { prev };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["watchlists"] }),
    onError: (err: any, vars, context) => {
      if (context?.prev) queryClient.setQueryData(["watchlists"], context.prev);
      toast.error(err.message);
    },
  });

  const activeWatchlist = watchlists?.find(w => w.id === selectedWatchlistId) || watchlists?.[0];

const handleToggleAsset = (symbol: string) => {
    if (!activeWatchlist) return;
    const current: string[] = activeWatchlist.instruments || [];
    const updated = current.includes(symbol)
      ? current.filter(i => i !== symbol)
      : [...current, symbol];
    updateMutation.mutate({ id: activeWatchlist.id, instruments: updated });
  };

  const startRename = (w: any) => {
    setEditingId(w.id);
    setEditingName(w.name);
  };

  const commitRename = (id: string) => {
    const name = editingName.trim();
    if (!name) return;
    if (name.length > MAX_NAME_LENGTH) { toast.error(`Name must be ${MAX_NAME_LENGTH} characters or fewer`); return; }
    renameMutation.mutate({ id, name });
  };

  const filtered = filterGroup === "All"
    ? AVAILABLE_ASSETS
    : AVAILABLE_ASSETS.filter(a => a.group === filterGroup);

  const openChart = async (symbol: string) => {
    try {
      await fetch("/api/v1/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastSymbol: symbol }),
      });
    } catch (_) {}
    router.push("/charts");
  };

  const members: string[] = activeWatchlist?.instruments ?? [];
  const addable = filtered.filter((a) => !members.includes(a.symbol));

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 lg:gap-8">
      <header>
        <Label>Watchlists</Label>
        <h1 className="mt-2 text-[var(--color-text-primary)]">
          Your markets, <em className="text-[var(--accent)]">at a glance.</em>
        </h1>
        <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-[var(--color-text-tertiary)]">
          Group Crypto, Forex, Commodities and Indices. Tap any market to open it in the terminal.
        </p>
      </header>

      {isLoading ? (
        <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-6">
          {/* ── Lists ─────────────────────────────────────────────────────── */}
          <aside className="flex flex-col gap-4">
            <section className="card">
              <header className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--hairline)" }}>
                <Label>My lists</Label>
                {watchlists && watchlists.length > 0 && <Chip>{watchlists.length}</Chip>}
              </header>

              {watchlists && watchlists.length > 0 ? (
                <ul className="p-2">
                  {watchlists.map((w) => {
                    const on = w.id === (activeWatchlist?.id || "");
                    const isEditing = editingId === w.id;
                    return (
                      <li key={w.id}>
                        <div
                          onClick={() => { if (!isEditing) setSelectedWatchlistId(w.id); }}
                          className="group relative flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-[var(--color-bg-hover)]"
                          style={on ? { background: "var(--panel-3)" } : undefined}
                        >
                          {on && <span className="absolute -left-px bottom-2.5 top-2.5 w-[3px] rounded-r-full" style={{ background: "var(--accent)" }} />}
                          <Eye size={14} style={{ color: on ? "var(--accent)" : "var(--color-text-quaternary)" }} className="shrink-0" />
                          {isEditing ? (
                            <input
                              autoFocus
                              className="min-w-0 flex-1 border-0 border-b bg-transparent py-0.5 text-[13px]"
                              style={{ borderColor: "var(--accent)", outline: "none", borderRadius: 0 }}
                              value={editingName}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitRename(w.id);
                                if (e.key === "Escape") setEditingId(null);
                              }}
                            />
                          ) : (
                            <span className={`min-w-0 flex-1 truncate text-[13.5px] font-medium ${on ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"}`}>{w.name}</span>
                          )}
                          <span className="shrink-0 font-mono text-[11px] text-[var(--color-text-quaternary)]">{w.instruments?.length || 0}</span>
                          <span className="flex items-center gap-0.5 lg:opacity-0 lg:transition-opacity lg:group-hover:opacity-100">
                            {isEditing ? (
                              <button type="button" aria-label="Save Rename" onClick={(e) => { e.stopPropagation(); commitRename(w.id); }} disabled={renameMutation.isPending} className="icon-button !h-7 !w-7 !text-[var(--accent)] disabled:opacity-40">
                                {renameMutation.isPending ? <RefreshCw size={12} className="animate-spin" /> : <Check size={13} />}
                              </button>
                            ) : (
                              <button type="button" aria-label="Rename Watchlist" onClick={(e) => { e.stopPropagation(); startRename(w); }} className="icon-button !h-7 !w-7">
                                <Pencil size={12} />
                              </button>
                            )}
                            <button
                              type="button"
                              aria-label="Delete Watchlist"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete "${w.name}"?`)) deleteMutation.mutate(w.id);
                              }}
                              disabled={deleteMutation.isPending}
                              className="icon-button !h-7 !w-7 hover:!text-[var(--color-loss)] disabled:opacity-40"
                            >
                              {deleteMutation.isPending ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
                            </button>
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="p-5 text-[13px] text-[var(--color-text-tertiary)]">No watchlists yet. Create your first below.</p>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const name = newWatchlistName.trim();
                  if (!name) return;
                  if (name.length > MAX_NAME_LENGTH) { toast.error(`Name must be ${MAX_NAME_LENGTH} characters or fewer`); return; }
                  createMutation.mutate();
                }}
                className="flex gap-2 border-t p-3"
                style={{ borderColor: "var(--hairline)" }}
              >
                <input
                  type="text"
                  value={newWatchlistName}
                  onChange={(e) => setNewWatchlistName(e.target.value)}
                  placeholder="New list, e.g. Crypto Majors"
                  className="h-10 min-w-0 flex-1 px-3 text-[13px] text-[var(--color-text-primary)]"
                />
                <button type="submit" disabled={createMutation.isPending || !newWatchlistName.trim()} className="btn-primary !h-10 disabled:opacity-40">
                  <Plus size={14} /> Add
                </button>
              </form>
            </section>
          </aside>

          {/* ── Board ─────────────────────────────────────────────────────── */}
          <section className="card min-w-0">
            {activeWatchlist ? (
              <>
                <header className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--hairline)" }}>
                  <div className="min-w-0">
                    <h2 className="truncate font-serif text-[26px] leading-none tracking-[-0.01em] text-[var(--color-text-primary)]">{activeWatchlist.name}</h2>
                    <p className="mt-1.5 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--color-text-quaternary)]">
                      <span className="live-dot" style={{ width: 5, height: 5 }} /> {members.length} {members.length === 1 ? "market" : "markets"} · live where available
                    </p>
                  </div>
                </header>

                {/* Members */}
                {members.length === 0 ? (
                  <div className="p-6">
                    <EmptyState icon={<Eye size={18} />} title="This list is empty" body="Add markets below and they appear here with live prices." />
                  </div>
                ) : (
                  <ul>
                    {members.map((sym) => {
                      const spec = AVAILABLE_ASSETS.find((a) => a.symbol === sym);
                      const t = livePrices[sym];
                      return (
                        <li key={sym} className="group flex items-center gap-3 border-b px-3 py-1 last:border-b-0 sm:px-5" style={{ borderColor: "var(--hairline)" }}>
                          <button onClick={() => openChart(sym)} className="grid min-w-0 flex-1 cursor-pointer grid-cols-[1fr_auto] items-center gap-x-4 rounded-lg px-1 py-3 text-left transition-colors hover:bg-[var(--color-bg-hover)] sm:px-2" aria-label={`Open ${sym} in Markets`}>
                            <span className="min-w-0">
                              <span className="block truncate font-mono text-[14px] font-semibold text-[var(--color-text-primary)]">{sym}</span>
                              <Label>{spec?.group ?? "Market"}</Label>
                            </span>
                            {t ? (
                              <span className="text-right">
                                <span className="block font-mono text-[15px] tabular-nums text-[var(--color-text-primary)]">{formatPrice(sym, t.price)}</span>
                                <Delta value={t.changePercent24h} className="text-[11.5px]" />
                              </span>
                            ) : (
                              <span className="font-mono text-[12px] text-[var(--color-text-quaternary)]">no live feed</span>
                            )}
                          </button>
                          <button
                            type="button"
                            aria-label={`Remove ${sym} From Watchlist`}
                            onClick={() => handleToggleAsset(sym)}
                            disabled={updateMutation.isPending}
                            className="icon-button shrink-0 hover:!text-[var(--color-loss)] disabled:opacity-40"
                          >
                            {updateMutation.isPending ? <RefreshCw size={13} className="animate-spin" /> : <X size={15} />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* Add markets */}
                <div className="border-t p-5" style={{ borderColor: "var(--hairline)", background: "var(--panel-2)" }}>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <Label>Add markets</Label>
                    <div role="tablist" aria-label="Market group" className="flex flex-wrap gap-1">
                      {["All", ...GROUPS].map((g) => {
                        const on = filterGroup === g;
                        return (
                          <button
                            key={g}
                            role="tab"
                            aria-selected={on}
                            onClick={() => setFilterGroup(g)}
                            className="h-7 cursor-pointer rounded-md px-2.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] transition-colors"
                            style={{ background: on ? "var(--accent)" : "transparent", color: on ? "var(--on-accent)" : "var(--color-text-tertiary)", boxShadow: on ? "none" : "inset 0 0 0 1px var(--hairline)" }}
                          >
                            {g}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {addable.length === 0 ? (
                    <p className="text-[13px] text-[var(--color-text-tertiary)]">Everything in this group is already on the list.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {addable.map(({ symbol }) => (
                        <button
                          key={symbol}
                          type="button"
                          aria-label={`Add ${symbol} To Watchlist`}
                          onClick={() => handleToggleAsset(symbol)}
                          disabled={updateMutation.isPending}
                          className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-3 font-mono text-[12px] font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[rgba(var(--accent-rgb),0.5)] hover:text-[var(--accent)] disabled:opacity-40"
                          style={{ borderColor: "var(--color-border-default)", background: "var(--panel-1)" }}
                        >
                          <Plus size={12} /> {symbol}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-8">
                <EmptyState icon={<AlertTriangle size={18} />} title="No active watchlist" body="Select or create a list on the left to start building your board." />
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
