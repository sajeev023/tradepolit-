"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, ToggleRight, Trash2, Plus, RefreshCw, Volume2 } from "lucide-react";
import { Chip, EmptyState, Label, Skeleton } from "@/components/fd/primitives";
import { useBinanceMultiStream } from "@/hooks/useBinanceStream";
import { formatPrice } from "@/lib/format-price";
import { CRYPTO_SYMBOLS, FOREX_SYMBOLS, COMMODITY_SYMBOLS, BINANCE_WS_SYMBOLS } from "@/lib/market-registry";
import { FormInput } from "@/components/ui/form-input";
import { toast } from "sonner";

export default function AlertsPage() {
  const queryClient = useQueryClient();
  const [selectedAsset, setSelectedAsset] = useState("BTC/USD");
  const [operator, setOperator] = useState("gt");
  const [triggerPrice, setTriggerPrice] = useState("");
  const [evaluating, setEvaluating] = useState(false);

  // 1. Fetch user's alerts
  const { data: alerts, isLoading: alertsLoading } = useQuery<any[]>({
    queryKey: ["alerts"],
    queryFn: async () => {
      const res = await fetch("/api/v1/alerts");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to load alerts");
      return body.data;
    },
  });

  // 2. Fetch notifications
  const { data: notifications, isLoading: notificationsLoading } = useQuery<any[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/v1/notifications");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to load notifications");
      return body.data;
    },
  });

  // 3. Create Alert mutation
  const createAlertMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instrument: selectedAsset,
          type: "PRICE",
          condition: { operator, value: Number(triggerPrice) },
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to create alert");
      return body.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      setTriggerPrice("");
      toast.success("Price alert set successfully");
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  // 4. Toggle Alert mutation
  const toggleAlertMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/v1/alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to toggle alert");
      return body.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  // 5. Delete Alert mutation
  const deleteAlertMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/alerts/${id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to delete alert");
      return body.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      toast.success("Alert removed");
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  // 6. Mark read notification
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/notifications/${id}/read`, { method: "PATCH" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to read notification");
      return body.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!triggerPrice || isNaN(Number(triggerPrice))) return;
    createAlertMutation.mutate();
  };

  const activeAlertsList = alerts?.filter((a) => a.isActive) || [];

  const live = useBinanceMultiStream(BINANCE_WS_SYMBOLS);
  const selectedLive = live[selectedAsset];
  const target = Number(triggerPrice);
  const awayPct = selectedLive && target > 0 ? ((target - selectedLive.price) / selectedLive.price) * 100 : null;

  const runEvaluate = async () => {
    setEvaluating(true);
    try {
      const res = await fetch("/api/cron/evaluate-alerts");
      const body = await res.json();
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success(`Evaluated active alerts. Triggered ${body.data?.triggered || 0} setups.`);
    } catch {
      toast.error("Evaluation failed. Please try again.");
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 lg:gap-8">
      <header>
        <Label>Alerts</Label>
        <h1 className="mt-2 text-[var(--color-text-primary)]">
          Know the moment a level <em className="text-[var(--accent)]">breaks.</em>
        </h1>
        <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-[var(--color-text-tertiary)]">
          Set a price threshold and get an in-app trigger the moment it crosses.
        </p>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[380px_minmax(0,1fr)] lg:gap-6">
        {/* ── Create ────────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <form onSubmit={handleCreateAlert} className="card">
            <header className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: "var(--hairline)" }}>
              <Label>New price alert</Label>
              <Bell size={14} className="text-[var(--color-text-quaternary)]" />
            </header>
            <div className="space-y-5 p-5">
              <div>
                <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--accent)]">Alert me when</p>
                <select value={selectedAsset} onChange={(e) => setSelectedAsset(e.target.value)} className="h-11 w-full px-3 font-mono text-[14px] text-[var(--color-text-primary)]">
                  {[...CRYPTO_SYMBOLS, ...FOREX_SYMBOLS, ...COMMODITY_SYMBOLS].map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <p className="mt-2 flex items-center gap-2 font-mono text-[11.5px] text-[var(--color-text-tertiary)]">
                  {selectedLive ? (
                    <>
                      <span className="live-dot" style={{ width: 5, height: 5 }} /> now {formatPrice(selectedAsset, selectedLive.price)}
                    </>
                  ) : (
                    "no live feed for this market"
                  )}
                </p>
              </div>

              <div className="grid grid-cols-[1fr_1.2fr] gap-3">
                <div>
                  <Label className="mb-2 block">Is</Label>
                  <select value={operator} onChange={(e) => setOperator(e.target.value)} className="h-11 w-full px-3 text-[14px] text-[var(--color-text-primary)]">
                    <option value="gt">Above ▲</option>
                    <option value="lt">Below ▼</option>
                  </select>
                </div>
                <div>
                  <Label className="mb-2 block">Price ($)</Label>
                  <FormInput type="number" step="any" value={triggerPrice} onChange={(e) => setTriggerPrice(e.target.value)} placeholder="68500" />
                </div>
              </div>

              {awayPct !== null && (
                <p className="rounded-lg border px-3.5 py-2.5 font-mono text-[12px]" style={{ borderColor: "var(--hairline)", background: "var(--panel-2)", color: "var(--color-text-secondary)" }}>
                  That level is <span style={{ color: awayPct >= 0 ? "var(--color-profit)" : "var(--color-loss)" }}>{Math.abs(awayPct).toFixed(2)}% {awayPct >= 0 ? "above" : "below"}</span> the current price.
                </p>
              )}

              <button type="submit" disabled={createAlertMutation.isPending || !triggerPrice} className="btn-primary btn-lg btn-block disabled:opacity-40">
                <Plus size={15} /> Set alert
              </button>
            </div>
          </form>

          <section className="card p-5">
            <h3 className="flex items-center gap-2 text-[13.5px] font-semibold text-[var(--color-text-primary)]"><Volume2 size={15} style={{ color: "var(--accent)" }} /> Evaluation engine</h3>
            <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--color-text-tertiary)]">
              A scheduler evaluates alerts in the background. Run it now to check every active level against the latest price.
            </p>
            <button onClick={runEvaluate} disabled={evaluating} className="btn-secondary btn-sm btn-block mt-4">
              {evaluating ? <><RefreshCw size={12} className="animate-spin" /> Evaluating…</> : "Evaluate now"}
            </button>
          </section>
        </div>

        {/* ── Monitors + triggers ───────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-col gap-4">
          <section className="card">
            <header className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: "var(--hairline)" }}>
              <Label>Active monitors</Label>
              <Chip tone="signal" dot>{activeAlertsList.length} active</Chip>
            </header>
            {alertsLoading ? (
              <div className="space-y-3 p-5">{[0, 1].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : activeAlertsList.length === 0 ? (
              <div className="p-6">
                <EmptyState icon={<Bell size={18} />} title="No active monitors" body="Create an alert on the left and it will watch the level for you." />
              </div>
            ) : (
              <ul>
                {activeAlertsList.map((alert) => {
                  const cond = alert.condition as any;
                  const price = live[alert.instrument]?.price;
                  const away = price ? ((cond.value - price) / price) * 100 : null;
                  return (
                    <li key={alert.id} className="flex items-center justify-between gap-3 border-b px-5 py-3.5 last:border-b-0" style={{ borderColor: "var(--hairline)" }}>
                      <div className="min-w-0">
                        <p className="flex items-center gap-2.5">
                          <span className="font-mono text-[14px] font-semibold text-[var(--color-text-primary)]">{alert.instrument}</span>
                          <Chip tone={cond.operator === "gt" ? "gain" : "loss"}>{cond.operator === "gt" ? "▲ above" : "▼ below"}</Chip>
                        </p>
                        <p className="mt-1 font-mono text-[12px] text-[var(--color-text-tertiary)]">
                          ${Number(cond.value).toLocaleString()}
                          {away !== null && <span className="ml-2 text-[var(--color-text-quaternary)]">{Math.abs(away).toFixed(2)}% {away >= 0 ? "above" : "below"} now</span>}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button type="button" aria-label="Pause Alert" aria-pressed={true} onClick={() => toggleAlertMutation.mutate({ id: alert.id, isActive: false })} className="icon-button !text-[var(--accent)]">
                          <ToggleRight size={22} />
                        </button>
                        <button type="button" aria-label="Delete Alert" onClick={() => deleteAlertMutation.mutate(alert.id)} className="icon-button hover:!text-[var(--color-loss)]">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="card">
            <header className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: "var(--hairline)" }}>
              <Label>Triggers</Label>
              {notifications && notifications.length > 0 && <Chip>{notifications.length}</Chip>}
            </header>
            {notificationsLoading ? (
              <div className="space-y-3 p-5">{[0, 1].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : !notifications || notifications.length === 0 ? (
              <p className="p-6 text-[13px] text-[var(--color-text-tertiary)]">Nothing has triggered yet.</p>
            ) : (
              <ul className="custom-scrollbar max-h-[320px] overflow-y-auto" data-lenis-prevent>
                {notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => !n.isRead && markReadMutation.mutate(n.id)}
                      className="flex w-full cursor-pointer items-start justify-between gap-4 border-b px-5 py-3.5 text-left transition-colors last:border-b-0 hover:bg-[var(--color-bg-hover)]"
                      style={{ borderColor: "var(--hairline)" }}
                    >
                      <span className="flex min-w-0 gap-3">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: n.isRead ? "var(--color-border-strong)" : "var(--accent)" }} />
                        <span className="min-w-0">
                          <span className={`block text-[13.5px] font-medium ${n.isRead ? "text-[var(--color-text-secondary)]" : "text-[var(--color-text-primary)]"}`}>{n.title}</span>
                          <span className="mt-0.5 block text-[12.5px] leading-snug text-[var(--color-text-tertiary)]">{n.body}</span>
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-[11px] text-[var(--color-text-quaternary)]">{new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
