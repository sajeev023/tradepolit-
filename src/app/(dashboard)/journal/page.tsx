"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Trash2,
  Edit2,
  X,
  Upload,
  ChevronLeft,
  ChevronRight,
  Smile,
  Loader2,
  ExternalLink,
  BookOpen,
} from "lucide-react";
import { FormInput } from "@/components/ui/form-input";
import { toast } from "sonner";

// Enums and tags list
const EMOTIONS = ["CONFIDENT", "FEARFUL", "GREEDY", "REVENGE", "FOMO", "DISCIPLINED", "NEUTRAL"];
const MISTAKES = ["FOMO Entry", "Overleveraging", "Moving Stop Loss", "Early Exit", "Revenge Trade", "No Plan", "Poor Sizing"];
const SUPPORTED_ASSETS = ["BTC/USD", "ETH/USD", "SOL/USD", "EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD", "NASDAQ", "S&P500"];

const tradeFormSchema = z.object({
  instrument: z.string().min(1, "Asset symbol is required"),
  assetClass: z.enum(["CRYPTO", "FOREX", "COMMODITY", "INDEX"]),
  direction: z.enum(["LONG", "SHORT"]),
  entryPrice: z.coerce.number().positive("Entry price must be positive"),
  exitPrice: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.number().positive("Exit price must be positive").optional()),
  size: z.coerce.number().positive("Size must be positive"),
  leverage: z.coerce.number().positive().default(1),
  stopLoss: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.number().positive().optional()),
  takeProfit: z.preprocess((val) => (val === "" ? undefined : val), z.coerce.number().positive().optional()),
  openedAt: z.string().min(1, "Open date is required"),
  closedAt: z.preprocess((val) => (val === "" ? undefined : val), z.string().optional()),
  emotionTag: z.enum(["CONFIDENT", "FEARFUL", "GREEDY", "REVENGE", "FOMO", "DISCIPLINED", "NEUTRAL"]).optional(),
  mistakeTags: z.array(z.string()).default([]),
  lessonsLearned: z.string().optional(),
  notes: z.string().optional(),
});

type TradeFormData = z.infer<typeof tradeFormSchema>;

function JournalPageContent() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterSymbol, setFilterSymbol] = useState<string>("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<any | null>(null);
  const [viewingTrade, setViewingTrade] = useState<any | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // 1. Fetch trades
  const { data: tradesResponse, isLoading } = useQuery({
    queryKey: ["trades", filterStatus, filterSymbol, page],
    queryFn: async () => {
      let url = `/api/v1/trades?page=${page}&limit=${limit}`;
      if (filterStatus !== "ALL") url += `&status=${filterStatus}`;
      if (filterSymbol) url += `&instrument=${encodeURIComponent(filterSymbol)}`;
      const res = await fetch(url);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to load trades");
      return body;
    },
  });

  const trades = tradesResponse?.data || [];
  const pagination = tradesResponse?.pagination || { page: 1, limit: 10, total: 0 };
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  // 2. Mutations
  const createMutation = useMutation({
    mutationFn: async (data: TradeFormData) => {
      const res = await fetch("/api/v1/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to save trade");
      return body.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-performance"] });
      toast.success("Trade logged successfully");
      setIsCreateOpen(false);
      reset();
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TradeFormData> }) => {
      const res = await fetch(`/api/v1/trades/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to update trade");
      return body.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-performance"] });
      toast.success("Trade updated successfully");
      setEditingTrade(null);
      if (viewingTrade?.id === data.id) setViewingTrade(data);
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/trades/${id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to delete trade");
      return body.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-performance"] });
      toast.success("Trade deleted");
      setViewingTrade(null);
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  // Form setup
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(tradeFormSchema) as any,
    defaultValues: {
      instrument: "BTC/USD",
      assetClass: "CRYPTO",
      direction: "LONG",
      leverage: 1,
      openedAt: new Date().toISOString().substring(0, 16),
      mistakeTags: [],
    },
  });

  const searchParams = useSearchParams();

  useEffect(() => {
    const prefill = searchParams.get("prefill") === "true";
    if (prefill) {
      const instrument = searchParams.get("instrument") || "BTC/USD";
      const direction = searchParams.get("direction") as "LONG" | "SHORT" || "LONG";
      const entryPrice = searchParams.get("entryPrice") || "";
      const stopLoss = searchParams.get("stopLoss") || "";
      const takeProfit = searchParams.get("takeProfit") || "";
      const size = searchParams.get("size") || "";
      const leverage = searchParams.get("leverage") || "1";

      const assetClass =
        ["EUR/USD", "GBP/USD", "USD/JPY"].includes(instrument) ? "FOREX" :
        ["XAU/USD"].includes(instrument) ? "COMMODITY" :
        ["NASDAQ", "S&P500"].includes(instrument) ? "INDEX" :
        "CRYPTO";

      setValue("instrument", instrument);
      setValue("assetClass", assetClass);
      setValue("direction", direction);
      setValue("entryPrice", entryPrice ? Number(entryPrice) : undefined);
      setValue("stopLoss", stopLoss ? Number(stopLoss) : undefined);
      setValue("takeProfit", takeProfit ? Number(takeProfit) : undefined);
      setValue("size", size ? Number(size) : undefined);
      setValue("leverage", leverage ? Number(leverage) : 1);
      setValue("openedAt", new Date().toISOString().substring(0, 16));

      setIsCreateOpen(true);
    }
  }, [searchParams, setValue]);

  const watchInstrument = watch("instrument");

  useEffect(() => {
    if (watchInstrument) {
      const assetClass =
        ["EUR/USD", "GBP/USD", "USD/JPY"].includes(watchInstrument) ? "FOREX" :
        ["XAU/USD"].includes(watchInstrument) ? "COMMODITY" :
        ["NASDAQ", "S&P500"].includes(watchInstrument) ? "INDEX" :
        "CRYPTO";
      setValue("assetClass", assetClass);
    }
  }, [watchInstrument, setValue]);

  const handleCreateSubmit = (data: TradeFormData) => {
    createMutation.mutate(data);
  };

  const handleEditClick = (trade: any) => {
    setEditingTrade(trade);
    setValue("instrument", trade.instrument);
    setValue("assetClass", trade.assetClass);
    setValue("direction", trade.direction);
    setValue("entryPrice", Number(trade.entryPrice));
    setValue("exitPrice", trade.exitPrice ? Number(trade.exitPrice) : undefined);
    setValue("size", Number(trade.size));
    setValue("leverage", Number(trade.leverage));
    setValue("stopLoss", trade.stopLoss ? Number(trade.stopLoss) : undefined);
    setValue("takeProfit", trade.takeProfit ? Number(trade.takeProfit) : undefined);
    setValue("openedAt", new Date(trade.openedAt).toISOString().substring(0, 16));
    setValue("closedAt", trade.closedAt ? new Date(trade.closedAt).toISOString().substring(0, 16) : undefined);
    setValue("emotionTag", trade.emotionTag || undefined);
    setValue("mistakeTags", trade.mistakeTags || []);
    setValue("lessonsLearned", trade.lessonsLearned || "");
    setValue("notes", trade.notes || "");
  };

  const handleEditSubmit = (data: TradeFormData) => {
    if (!editingTrade) return;
    updateMutation.mutate({ id: editingTrade.id, data });
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/v1/trades/${id}/screenshot`, {
        method: "POST",
        body: formData,
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to upload image");

      toast.success("Screenshot uploaded");
      // Update viewingTrade details state inline
      setViewingTrade((prev: any) => ({
        ...prev,
        screenshots: body.data.screenshots,
      }));
      queryClient.invalidateQueries({ queryKey: ["trades"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const toggleMistakeTag = (tag: string, currentTags: string[]) => {
    const next = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];
    setValue("mistakeTags", next);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            Trade Journal
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Log, filter, and reflect on your trading history.
          </p>
        </div>

        <button
          onClick={() => {
            reset();
            setIsCreateOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold self-start md:self-auto transition-all"
          style={{
            backgroundColor: "var(--color-accent-primary)",
            color: "#0A0A0B",
            cursor: "pointer",
          }}
        >
          <Plus size={16} /> Log a Trade
        </button>
      </div>

      {/* Filters Bar */}
      <div className="card p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
          {/* Status buttons */}
          <div className="flex items-center rounded-lg bg-[var(--color-bg-tertiary)] p-1 border border-[var(--color-border-subtle)]">
            {["ALL", "OPEN", "CLOSED"].map((status) => (
              <button
                key={status}
                onClick={() => {
                  setFilterStatus(status);
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors"
                style={{
                  backgroundColor: filterStatus === status ? "var(--color-bg-hover)" : "transparent",
                  color: filterStatus === status ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
                }}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Symbol input search */}
          <div className="relative">
            <FormInput
              placeholder="Search symbol..."
              value={filterSymbol}
              onChange={(e) => {
                setFilterSymbol(e.target.value);
                setPage(1);
              }}
              className="py-2 pl-3 text-xs w-48"
            />
          </div>
        </div>

        <div className="text-xs font-medium" style={{ color: "var(--color-text-tertiary)" }}>
          Showing {trades.length} of {pagination.total} trades
        </div>
      </div>

      {/* Trades List Table */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-teal-400 mb-2" size={24} />
          <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Loading trades...</span>
        </div>
      ) : trades.length === 0 ? (
        <div className="card p-12 flex flex-col items-center justify-center text-center">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
            style={{ backgroundColor: "var(--color-accent-primary-muted)" }}
          >
            <BookOpen size={20} style={{ color: "var(--color-accent-primary)" }} />
          </div>
          <p className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
            No trades found
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-tertiary)" }}>
            Try adjusting your search filters or log a new trade to get started.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b text-xs font-semibold uppercase tracking-wider" style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-tertiary)" }}>
                  <th className="px-6 py-4">Instrument</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Dir</th>
                  <th className="px-6 py-4">Entry</th>
                  <th className="px-6 py-4">Exit</th>
                  <th className="px-6 py-4 text-right">PnL</th>
                  <th className="px-6 py-4">R-Mult</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm font-medium" style={{ borderColor: "var(--color-border-subtle)" }}>
                {trades.map((trade: any) => {
                  const isLong = trade.direction === "LONG";
                  const pnlNum = trade.pnl ? Number(trade.pnl) : null;
                  const isWin = pnlNum && pnlNum > 0;
                  const isLoss = pnlNum && pnlNum < 0;

                  let pnlColor = "var(--color-text-primary)";
                  if (isWin) pnlColor = "var(--color-profit)";
                  if (isLoss) pnlColor = "var(--color-loss)";

                  return (
                    <tr
                      key={trade.id}
                      onClick={() => setViewingTrade(trade)}
                      className="cursor-pointer transition-colors"
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-bg-hover)")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <td className="px-6 py-4 font-mono font-bold" style={{ color: "var(--color-text-primary)" }}>
                        {trade.instrument}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold tracking-wider">
                        <span className="px-2 py-0.5 rounded" style={{ backgroundColor: "var(--color-bg-tertiary)", color: "var(--color-text-secondary)" }}>
                          {trade.assetClass}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold">
                        <span className={`px-2 py-0.5 rounded ${isLong ? "text-emerald-400 bg-emerald-950/20" : "text-rose-400 bg-rose-950/20"}`}>
                          {trade.direction}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono tabular-nums">
                        {Number(trade.entryPrice).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-mono tabular-nums">
                        {trade.exitPrice ? Number(trade.exitPrice).toLocaleString() : "—"}
                      </td>
                      <td className="px-6 py-4 font-mono text-right tabular-nums font-bold" style={{ color: pnlColor }}>
                        {pnlNum ? `${isWin ? "+" : ""}${pnlNum.toFixed(2)}` : "—"}
                      </td>
                      <td className="px-6 py-4 font-mono tabular-nums">
                        {trade.rMultiple ? `${Number(trade.rMultiple).toFixed(2)}R` : "—"}
                      </td>
                      <td className="px-6 py-4 text-xs text-secondary" style={{ color: "var(--color-text-secondary)" }}>
                        {new Date(trade.openedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        {deleteConfirmId === trade.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-rose-400 font-semibold">Sure?</span>
                            <button
                              onClick={() => {
                                deleteMutation.mutate(trade.id);
                                setDeleteConfirmId(null);
                              }}
                              className="px-2 py-1 rounded bg-rose-950/40 text-rose-400 border border-rose-900/50 text-xs font-semibold hover:bg-rose-900/50"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-1 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 text-xs font-semibold hover:bg-zinc-700"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditClick(trade)}
                              className="p-1.5 rounded transition-colors"
                              style={{ color: "var(--color-text-secondary)" }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text-primary)")}
                              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-secondary)")}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(trade.id)}
                              className="p-1.5 rounded transition-colors"
                              style={{ color: "var(--color-text-tertiary)" }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-loss)")}
                              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-tertiary)")}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t flex items-center justify-between" style={{ borderColor: "var(--color-border-subtle)" }}>
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold border transition-opacity disabled:opacity-50"
                style={{ borderColor: "var(--color-border-default)", color: "var(--color-text-primary)" }}
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold border transition-opacity disabled:opacity-50"
                style={{ borderColor: "var(--color-border-default)", color: "var(--color-text-primary)" }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Log Trade Form Modal (Create / Edit) */}
      {(isCreateOpen || editingTrade) && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 relative flex flex-col justify-between">
            {/* Modal Title */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>
                {editingTrade ? "Edit Trade Log" : "Log New Trade"}
              </h2>
              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingTrade(null);
                }}
                className="p-1 rounded-md transition-colors"
                style={{ color: "var(--color-text-tertiary)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text-primary)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-tertiary)")}
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(editingTrade ? handleEditSubmit : handleCreateSubmit)} className="space-y-4">
              {/* Asset Class & Direction Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>
                    Asset Class
                  </label>
                  <select
                    className="w-full px-3 py-2.5 rounded-lg text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)] outline-none"
                    style={{ color: "var(--color-text-primary)" }}
                    {...register("assetClass")}
                  >
                    <option value="CRYPTO">Crypto</option>
                    <option value="FOREX">Forex</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>
                    Direction
                  </label>
                  <select
                    className="w-full px-3 py-2.5 rounded-lg text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)] outline-none"
                    style={{ color: "var(--color-text-primary)" }}
                    {...register("direction")}
                  >
                    <option value="LONG">Long</option>
                    <option value="SHORT">Short</option>
                  </select>
                </div>
              </div>

              {/* Instrument & Size Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>
                    Instrument Symbol
                  </label>
                  <select
                    className="w-full px-3 py-2.5 rounded-lg text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)] outline-none"
                    style={{ color: "var(--color-text-primary)" }}
                    {...register("instrument")}
                  >
                    {SUPPORTED_ASSETS.map((asset) => (
                      <option key={asset} value={asset}>
                        {asset}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>
                    Size (Units/Lots)
                  </label>
                  <FormInput type="number" step="any" placeholder="0.05" error={!!errors.size} {...register("size")} />
                  {errors.size && <p className="text-xs mt-1" style={{ color: "var(--color-loss)" }}>{(errors.size.message as string)}</p>}
                </div>
              </div>

              {/* Price Setup Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>
                    Entry Price
                  </label>
                  <FormInput type="number" step="any" placeholder="68000" error={!!errors.entryPrice} {...register("entryPrice")} />
                  {errors.entryPrice && <p className="text-xs mt-1" style={{ color: "var(--color-loss)" }}>{(errors.entryPrice.message as string)}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>
                    Stop Loss
                  </label>
                  <FormInput type="number" step="any" placeholder="67500" error={!!errors.stopLoss} {...register("stopLoss")} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>
                    Take Profit
                  </label>
                  <FormInput type="number" step="any" placeholder="70000" error={!!errors.takeProfit} {...register("takeProfit")} />
                </div>
              </div>

              {/* Leverage & Closed Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>
                    Leverage (x)
                  </label>
                  <FormInput type="number" step="any" placeholder="1" error={!!errors.leverage} {...register("leverage")} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>
                    Exit Price (Optional)
                  </label>
                  <FormInput type="number" step="any" placeholder="69500" error={!!errors.exitPrice} {...register("exitPrice")} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>
                    Emotion Tag
                  </label>
                  <select
                    className="w-full px-3 py-2.5 rounded-lg text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)] outline-none"
                    style={{ color: "var(--color-text-primary)" }}
                    {...register("emotionTag")}
                  >
                    <option value="">Select Emotion</option>
                    {EMOTIONS.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dates Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>
                    Opened At
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2.5 rounded-lg text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)] outline-none"
                    style={{ color: "var(--color-text-primary)" }}
                    {...register("openedAt")}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>
                    Closed At (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2.5 rounded-lg text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)] outline-none"
                    style={{ color: "var(--color-text-primary)" }}
                    {...register("closedAt")}
                  />
                </div>
              </div>

              {/* Mistake Tags */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>
                  Mistake Tags (Select multiple)
                </label>
                <div className="flex flex-wrap gap-2">
                  {MISTAKES.map((tag) => {
                    const current = watch("mistakeTags") || [];
                    const selected = current.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleMistakeTag(tag, current)}
                        className="px-2.5 py-1 rounded text-xs transition-colors font-medium border"
                        style={{
                          backgroundColor: selected ? "rgba(239, 68, 68, 0.12)" : "transparent",
                          borderColor: selected ? "var(--color-loss)" : "var(--color-border-subtle)",
                          color: selected ? "var(--color-loss)" : "var(--color-text-secondary)",
                        }}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes & Lessons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>
                    Lessons Learned
                  </label>
                  <textarea
                    rows={3}
                    placeholder="What did this trade teach you?"
                    className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)] outline-none"
                    style={{ color: "var(--color-text-primary)" }}
                    {...register("lessonsLearned")}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>
                    Trade Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Support/resistance levels, news environment..."
                    className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)] outline-none"
                    style={{ color: "var(--color-text-primary)" }}
                    {...register("notes")}
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex gap-3 border-t" style={{ borderColor: "var(--color-border-subtle)" }}>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                  style={{ backgroundColor: "var(--color-accent-primary)", color: "#0A0A0B" }}
                >
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 size={16} className="animate-spin" />}
                  Save Trade
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setEditingTrade(null);
                  }}
                  className="px-5 py-2.5 rounded-lg text-sm font-medium border transition-colors"
                  style={{ borderColor: "var(--color-border-default)", color: "var(--color-text-secondary)" }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Trade Details Lightbox Modal */}
      {viewingTrade && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 relative">
            <div className="flex items-center justify-between mb-6 pb-4 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
              <div>
                <span className="font-mono text-2xl font-bold uppercase" style={{ color: "var(--color-text-primary)" }}>
                  {viewingTrade.instrument}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ml-3 ${viewingTrade.direction === "LONG" ? "text-emerald-400 bg-emerald-950/20" : "text-rose-400 bg-rose-950/20"}`}>
                  {viewingTrade.direction}
                </span>
              </div>
              <button
                onClick={() => setViewingTrade(null)}
                className="p-1 rounded-md transition-colors"
                style={{ color: "var(--color-text-tertiary)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text-primary)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-tertiary)")}
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-[var(--color-bg-tertiary)] p-3 rounded-lg">
                <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>Status</p>
                <p className="font-semibold text-sm" style={{ color: "var(--color-text-primary)" }}>{viewingTrade.status}</p>
              </div>
              <div className="bg-[var(--color-bg-tertiary)] p-3 rounded-lg">
                <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>Size</p>
                <p className="font-mono font-semibold text-sm" style={{ color: "var(--color-text-primary)" }}>{Number(viewingTrade.size).toLocaleString()}</p>
              </div>
              <div className="bg-[var(--color-bg-tertiary)] p-3 rounded-lg">
                <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>Leverage</p>
                <p className="font-mono font-semibold text-sm" style={{ color: "var(--color-text-primary)" }}>{Number(viewingTrade.leverage)}x</p>
              </div>
              <div className="bg-[var(--color-bg-tertiary)] p-3 rounded-lg">
                <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>R-Multiple</p>
                <p className="font-mono font-semibold text-sm text-teal-400">
                  {viewingTrade.rMultiple ? `${Number(viewingTrade.rMultiple).toFixed(2)}R` : "—"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>Pricing Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span style={{ color: "var(--color-text-tertiary)" }}>Entry Price</span><span className="font-mono">{Number(viewingTrade.entryPrice).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span style={{ color: "var(--color-text-tertiary)" }}>Exit Price</span><span className="font-mono">{viewingTrade.exitPrice ? Number(viewingTrade.exitPrice).toLocaleString() : "—"}</span></div>
                  <div className="flex justify-between"><span style={{ color: "var(--color-text-tertiary)" }}>Stop Loss</span><span className="font-mono">{viewingTrade.stopLoss ? Number(viewingTrade.stopLoss).toLocaleString() : "—"}</span></div>
                  <div className="flex justify-between"><span style={{ color: "var(--color-text-tertiary)" }}>Take Profit</span><span className="font-mono">{viewingTrade.takeProfit ? Number(viewingTrade.takeProfit).toLocaleString() : "—"}</span></div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>Reflection & Sentiment</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span style={{ color: "var(--color-text-tertiary)" }}>Emotion</span>
                    <span className="flex items-center gap-1 font-semibold text-teal-400">
                      <Smile size={14} /> {viewingTrade.emotionTag || "NEUTRAL"}
                    </span>
                  </div>
                  <div>
                    <span className="block mb-1" style={{ color: "var(--color-text-tertiary)" }}>Mistakes Tagged</span>
                    <div className="flex flex-wrap gap-1">
                      {viewingTrade.mistakeTags && viewingTrade.mistakeTags.length > 0 ? (
                        viewingTrade.mistakeTags.map((tag: string) => (
                          <span key={tag} className="text-xs px-2 py-0.5 rounded border border-rose-500/20 text-rose-400 bg-rose-950/10">
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>None</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes & Lessons Section */}
            {viewingTrade.notes && (
              <div className="mb-6">
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-tertiary)" }}>Notes</h3>
                <p className="text-sm p-3 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)]" style={{ color: "var(--color-text-secondary)" }}>
                  {viewingTrade.notes}
                </p>
              </div>
            )}

            {viewingTrade.lessonsLearned && (
              <div className="mb-6">
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--color-text-tertiary)" }}>Lessons Learned</h3>
                <p className="text-sm p-3 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)]" style={{ color: "var(--color-text-secondary)" }}>
                  {viewingTrade.lessonsLearned}
                </p>
              </div>
            )}

            {/* Screenshots uploads dropzone */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-tertiary)" }}>
                Screenshots ({viewingTrade.screenshots?.length || 0})
              </h3>
              
              <div className="grid grid-cols-3 gap-2 mb-4">
                {viewingTrade.screenshots?.map((url: string, index: number) => (
                  <div key={index} className="relative aspect-video rounded-lg overflow-hidden border border-[var(--color-border-subtle)] bg-[var(--color-bg-tertiary)] group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="Screenshot" className="w-full h-full object-cover" />
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold text-white gap-1"
                    >
                      <ExternalLink size={12} /> View Full
                    </a>
                  </div>
                ))}
              </div>

              {/* Upload input dropzone */}
              <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors"
                style={{ borderColor: "var(--color-border-subtle)" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--color-accent-primary)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--color-border-subtle)")}
              >
                {isUploading ? (
                  <Loader2 size={24} className="animate-spin text-teal-400" />
                ) : (
                  <>
                    <Upload size={20} style={{ color: "var(--color-text-tertiary)" }} className="mb-2" />
                    <span className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>Upload setup screenshot</span>
                    <span className="text-[10px] mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>JPEG, PNG, WebP up to 5MB</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => handleScreenshotUpload(e, viewingTrade.id)}
                  disabled={isUploading}
                />
              </label>
            </div>

              {deleteConfirmId === viewingTrade.id ? (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-rose-400 font-semibold">Confirm delete?</span>
                  <button
                    onClick={() => {
                      deleteMutation.mutate(viewingTrade.id);
                      setDeleteConfirmId(null);
                    }}
                    className="inline-flex items-center px-4 py-2 rounded-lg text-xs font-semibold transition-colors bg-rose-950/40 text-rose-400 border border-rose-900/50 hover:bg-rose-900/50"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="inline-flex items-center px-4 py-2 rounded-lg text-xs font-semibold transition-colors border border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setViewingTrade(null);
                      handleEditClick(viewingTrade);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors border"
                    style={{ borderColor: "var(--color-border-default)", color: "var(--color-text-primary)" }}
                  >
                    <Edit2 size={12} /> Edit Trade
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(viewingTrade.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors text-rose-400 hover:bg-rose-950/20 border border-rose-950/40"
                  >
                    <Trash2 size={12} /> Delete Trade
                  </button>
                </>
              )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function JournalPage() {
  return (
    <Suspense fallback={<div className="p-6 text-zinc-400">Loading Journal...</div>}>
      <JournalPageContent />
    </Suspense>
  );
}
