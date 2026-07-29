"use client";

export const dynamic = "force-dynamic";

import { useState, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, Plus, Trash2, X, RefreshCw, AlertTriangle, Pencil, Check } from "lucide-react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { useUIStore } from "@/lib/stores/ui-store";
import { getSymbolsForMarket, type AssetClass } from "@/lib/supported-symbols";

const MAX_NAME_LENGTH = 40;

const ASSET_CLASS_COLORS: Record<AssetClass, string> = {
  CRYPTO: "#f59e0b",
  FOREX: "#22d3ee",
  COMMODITY: "#fbbf24",
  INDEX: "#f87171",
  STOCK: "#34d399",
};

function WatchlistPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { selectedMarket, setSelectedSymbol } = useUIStore();
  const [newWatchlistName, setNewWatchlistName] = useState("");
  // Seed from the `?wl=` query param so the active watchlist survives refresh
  // (previously page-local and lost on reload). Falls back to the first
  // watchlist via `activeWatchlist` when empty.
  const [selectedWatchlistId, setSelectedWatchlistId] = useState<string>(
    searchParams.get("wl") || ""
  );

  // Selecting a watchlist mirrors the id into the URL (replace, not push, so
  // it doesn't pollute history) so a refresh rehydrates the same selection.
  const selectWatchlist = (id: string) => {
    setSelectedWatchlistId(id);
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("wl", id);
    else params.delete("wl");
    router.replace(`/watchlist?${params.toString()}`, { scroll: false });
  };
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [filterGroup, setFilterGroup] = useState<string>("All");

  const marketSymbols = getSymbolsForMarket(selectedMarket);
  const AVAILABLE_ASSETS = marketSymbols.map((s) => ({
    symbol: s.symbol,
    group: s.assetClass,
    displayName: s.displayName,
    color: ASSET_CLASS_COLORS[s.assetClass] || "#34d399",
  }));
  const GROUPS = Array.from(new Set(AVAILABLE_ASSETS.map((a) => a.group)));

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
      selectWatchlist(data.id);
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
      selectWatchlist("");
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

return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
          Watchlist Manager
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Organize tracked assets across Crypto, Forex, Commodities, and Indices.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-40">
          <RefreshCw className="animate-spin text-teal-400 mb-2" size={24} />
          <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Loading watchlists...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* -- Left: List management --------------------------------------- */}
          <div className="lg:col-span-2 space-y-4">
{/* Create */}
            <div className="card p-5 space-y-4 animate-fade-in-delay-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--color-accent-primary-muted)", color: "var(--color-accent-primary)" }}>
                  <Plus size={14} />
                </div>
                <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-tertiary)" }}>
                  Create Watchlist
                </h2>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); const name = newWatchlistName.trim(); if (!name) return; if (name.length > MAX_NAME_LENGTH) { toast.error(`Name must be ${MAX_NAME_LENGTH} characters or fewer`); return; } createMutation.mutate(); }} className="flex gap-2">
                <input
                  type="text"
                  value={newWatchlistName}
                  onChange={e => setNewWatchlistName(e.target.value)}
                  placeholder="e.g. Crypto Majors"
                  className="flex-1 px-3 py-2 text-xs rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)] outline-none text-[var(--color-text-primary)]"
                />
                <button
                  type="submit"
                  disabled={createMutation.isPending || !newWatchlistName.trim()}
                  className="btn-primary text-xs px-4 disabled:opacity-40"
                >
                  <Plus size={14} /> Create
                </button>
              </form>
            </div>

            {/* Watchlist selector */}
            <div className="card p-5 animate-fade-in-delay-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-tertiary)" }}>
                  My Watchlists
                </h2>
                {watchlists && watchlists.length > 0 && (
                  <span className="badge badge-neutral">{watchlists.length}</span>
                )}
              </div>

              {watchlists && watchlists.length > 0 ? (
                <div className="space-y-1.5">
                  {watchlists.map(w => {
                    const isActive = w.id === (activeWatchlist?.id || "");
                    const isEditing = editingId === w.id;
                    return (
                      <div
                        key={w.id}
                        onClick={() => { if (!isEditing) selectWatchlist(w.id); }}
                        className="flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors group"
                        style={{
                          backgroundColor: isActive ? "var(--color-bg-hover)" : "transparent",
                          color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                        }}
                      >
                        <div className="flex items-center gap-2 text-xs font-medium flex-1 min-w-0">
                          <Eye size={14} className={isActive ? "text-teal-400 shrink-0" : "text-zinc-500 shrink-0"} />
                          {isEditing ? (
                            <input
                              autoFocus
                              className="flex-1 bg-transparent border-b border-teal-400 outline-none text-xs py-0.5"
                              value={editingName}
                              onClick={e => e.stopPropagation()}
                              onChange={e => setEditingName(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === "Enter") commitRename(w.id);
                                if (e.key === "Escape") setEditingId(null);
                              }}
                            />
                          ) : (
                            <span className="truncate">{w.name}</span>
                          )}
                          <span className="text-[10px] text-zinc-500 shrink-0">({w.instruments?.length || 0})</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isEditing ? (
                            <button
                              onClick={e => { e.stopPropagation(); commitRename(w.id); }}
                              disabled={renameMutation.isPending}
                              className="text-teal-400 hover:text-teal-300 p-1 disabled:opacity-40"
                            >
                              {renameMutation.isPending ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
                            </button>
                          ) : (
                            <button
                              onClick={e => { e.stopPropagation(); startRename(w); }}
                              className="text-zinc-400 hover:text-zinc-200 p-1"
                            >
                              <Pencil size={11} />
                            </button>
                          )}
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              if (confirm(`Delete "${w.name}"?`)) deleteMutation.mutate(w.id);
                            }}
                            disabled={deleteMutation.isPending}
                            className="text-rose-400 hover:text-rose-300 p-1 disabled:opacity-40"
                          >
                            {deleteMutation.isPending ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-center py-6" style={{ color: "var(--color-text-tertiary)" }}>
                  No watchlists yet. Create one above.
                </div>
              )}
            </div>
          </div>

          {/* -- Right: Asset picker ------------------------------------------ */}
          <div className="lg:col-span-3 animate-fade-in-delay-3">
            <div className="card p-5 min-h-[300px]">
              {activeWatchlist ? (
                <div>
                  <div className="flex items-center justify-between border-b pb-3 mb-5" style={{ borderColor: "var(--color-border-subtle)" }}>
                    <h3 className="text-sm font-bold text-white">{activeWatchlist.name}</h3>
                    <span className="text-[10px] text-zinc-500">{activeWatchlist.instruments?.length || 0} assets</span>
                  </div>

                  {/* Group filter tabs */}
                  <div className="flex gap-1.5 mb-4 flex-wrap">
                    {["All", ...GROUPS].map(g => (
                      <button
                        key={g}
                        onClick={() => setFilterGroup(g)}
                        className="px-2.5 py-1 rounded text-[11px] font-medium transition-colors"
                        style={{
                          backgroundColor: filterGroup === g ? "var(--color-accent-primary)" : "var(--color-bg-tertiary)",
                          color: filterGroup === g ? "#fff" : "var(--color-text-secondary)",
                          border: `1px solid ${filterGroup === g ? "var(--color-accent-primary)" : "var(--color-border-subtle)"}`,
                        }}
                      >
                        {g}
                      </button>
                    ))}
                  </div>

{/* Asset grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {filtered.map(({ symbol, group, color }) => {
                      const isAdded = activeWatchlist.instruments?.includes(symbol);
                      return (
                        <div
                          key={symbol}
                          onClick={async () => {
                            if (isAdded) {
                              // Update the global store FIRST so /charts renders
                              // the chosen symbol instantly, then persist to the
                              // profile (the previous code PATCHed /api/v1/settings
                              // which silently drops lastSymbol — its Zod schema
                              // doesn't accept it — so the click never persisted
                              // and the chart loaded the stale store symbol).
                              setSelectedSymbol(symbol);
                              try {
                                await fetch("/api/v1/profile", {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ lastSymbol: symbol }),
                                });
                                queryClient.invalidateQueries({ queryKey: ["profile"] });
                              } catch (_) {}
                              router.push("/charts");
                            }
                          }}
                          className="p-3 rounded-lg border text-xs font-mono font-bold transition-all flex items-center justify-between select-none hover:scale-[1.02] active:scale-[0.98]"
                          style={{
                            backgroundColor: isAdded ? `${color}18` : "transparent",
                            borderColor:     isAdded ? color : "var(--color-border-subtle)",
                            color:           isAdded ? color : "var(--color-text-secondary)",
                            cursor: isAdded ? "pointer" : "default",
                          }}
                        >
                          <div className="flex flex-col items-start gap-0.5 flex-1 text-left">
                            <span>{symbol}</span>
                            <span className="text-[9px] font-sans opacity-50">{group}</span>
                          </div>
                          {!isAdded && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleAsset(symbol);
                              }}
                              disabled={updateMutation.isPending}
                              className="p-1 hover:bg-white/10 rounded transition-colors inline-flex items-center justify-center cursor-pointer disabled:opacity-30"
                            >
                              {updateMutation.isPending ? <RefreshCw size={12} className="animate-spin" /> : <Plus size={12} />}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

{/* Active list */}
                  {activeWatchlist.instruments?.length > 0 && (
                    <div className="mt-5 border-t pt-4" style={{ borderColor: "var(--color-border-subtle)" }}>
                      <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>
                        Active in this watchlist
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {activeWatchlist.instruments.map((s: string) => {
                          const spec = AVAILABLE_ASSETS.find(a => a.symbol === s);
                          return (
                            <span
                              key={s}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold cursor-pointer hover:bg-white/10 transition-colors"
                              style={{
                                backgroundColor: `${spec?.color || "#6b7280"}18`,
                                color: spec?.color || "#9ca3af",
                                border: `1px solid ${spec?.color || "#6b7280"}40`,
                              }}
                              onClick={async () => {
                                setSelectedSymbol(s);
                                try {
                                  await fetch("/api/v1/profile", {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ lastSymbol: s }),
                                  });
                                  queryClient.invalidateQueries({ queryKey: ["profile"] });
                                } catch (_) {}
                                router.push("/charts");
                              }}
                            >
                              <span>{s}</span>
                              <span
                                className="p-0.5 hover:bg-white/20 rounded-full transition-colors inline-flex items-center justify-center ml-0.5 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleAsset(s);
                                }}
                              >
                                {updateMutation.isPending ? <RefreshCw size={9} className="animate-spin" /> : <X size={9} />}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center my-auto">
                  <AlertTriangle size={24} className="text-yellow-500 mb-2 animate-bounce" />
                  <h3 className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                    No active watchlist
                  </h3>
                  <p className="text-[10px] mt-1" style={{ color: "var(--color-text-tertiary)" }}>
                    Select or create a watchlist from the left panel.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// `useSearchParams` requires a Suspense boundary so the page can prerender
// without a CSR bailout. The content is client-only; a null fallback is fine.
export default function WatchlistPage() {
  return (
    <Suspense fallback={null}>
      <WatchlistPageContent />
    </Suspense>
  );
}
