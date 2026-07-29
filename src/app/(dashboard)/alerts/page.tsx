"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, ToggleRight, Trash2, Plus, RefreshCw, Volume2 } from "lucide-react";
import { FormInput } from "@/components/ui/form-input";
import { toast } from "sonner";
import { getPopularSymbolStrings, getDefaultSymbolForAssetClass } from "@/lib/supported-symbols";
import type { Alert, Notification } from "@/lib/types";

export default function AlertsPage() {
  const queryClient = useQueryClient();
  const [selectedAsset, setSelectedAsset] = useState(getDefaultSymbolForAssetClass("CRYPTO"));
  const [operator, setOperator] = useState("gt");
  const [triggerPrice, setTriggerPrice] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);

  // 1. Fetch user's alerts
  const { data: alerts, isLoading: alertsLoading, isError: alertsError, refetch: refetchAlerts } = useQuery<Alert[]>({
    queryKey: ["alerts"],
    queryFn: async () => {
      const res = await fetch("/api/v1/alerts");
      const body: { data?: Alert[]; error?: { message?: string } } = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to load alerts");
      return body.data ?? [];
    },
  });

  // 2. Fetch notifications
  const { data: notifications, isLoading: notificationsLoading, isError: notificationsError, refetch: refetchNotifications } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/v1/notifications");
      const body: { data?: Notification[]; error?: { message?: string } } = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to load notifications");
      return body.data ?? [];
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
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to create alert");
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
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to toggle alert");
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
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete alert");
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

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
          Price & Indicator Alerts
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Set thresholds and receive visual in-app triggers when levels cross.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left column: Create alert form */}
        <div className="lg:col-span-2 space-y-4 animate-fade-in-delay-1">
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--color-accent-primary-muted)", color: "var(--color-accent-primary)" }}>
                <Bell size={14} />
              </div>
              <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-tertiary)" }}>
                New Price Alert
              </h2>
            </div>

            <form onSubmit={handleCreateAlert} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-semibold mb-1" style={{ color: "var(--color-text-tertiary)" }}>
                  Instrument Asset
                </label>
                <select
                  value={selectedAsset}
                  onChange={(e) => setSelectedAsset(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)] outline-none"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {getPopularSymbolStrings().map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-semibold mb-1" style={{ color: "var(--color-text-tertiary)" }}>
                    Condition
                  </label>
                  <select
                    value={operator}
                    onChange={(e) => setOperator(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)] outline-none"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    <option value="gt">Greater Than (&gt;)</option>
                    <option value="lt">Less Than (&lt;)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-semibold mb-1" style={{ color: "var(--color-text-tertiary)" }}>
                    Target Price ($)
                  </label>
                  <FormInput
                    type="number"
                    step="any"
                    value={triggerPrice}
                    onChange={(e) => setTriggerPrice(e.target.value)}
                    placeholder="68500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={createAlertMutation.isPending}
                className="btn-primary w-full text-xs"
              >
                <Plus size={14} /> Set Active Alert
              </button>
            </form>
          </div>

          {/* Trigger Alert Test Engine */}
          <div className="card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Volume2 size={16} className="text-teal-400 shrink-0" />
              <span className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>
                Alert Evaluation Engine
              </span>
            </div>
            <p className="text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>
              The cron scheduler runs in the background. You can trigger an instant evaluation to trigger any crosses:
            </p>
            <button
              onClick={async () => {
                setIsEvaluating(true);
                try {
                  const res = await fetch("/api/cron/evaluate-alerts");
                  const body = await res.json();
                  queryClient.invalidateQueries({ queryKey: ["alerts"] });
                  queryClient.invalidateQueries({ queryKey: ["notifications"] });
                  toast.success(`Evaluated active alerts. Triggered ${body.data?.triggered || 0} setups.`);
                } catch {
                  toast.error("Evaluation failed. Please try again.");
                } finally {
                  setIsEvaluating(false);
                }
              }}
              disabled={isEvaluating}
              className="w-full py-1.5 rounded text-[10px] font-semibold border transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
              style={{ borderColor: "var(--color-border-subtle)" }}
            >
              {isEvaluating && <RefreshCw size={12} className="animate-spin" />}
              {isEvaluating ? "Evaluating..." : "Force Evaluate Trigger Crosses"}
            </button>
          </div>
        </div>

        {/* Right column: Alerts and trigger list */}
        <div className="lg:col-span-3 space-y-6 animate-fade-in-delay-2">
          {/* Active Alerts */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-tertiary)" }}>
                Active Monitor List
              </h2>
              <span className="badge badge-info">{activeAlertsList.length} active</span>
            </div>

            {alertsLoading ? (
              <div className="flex justify-center py-6">
                <RefreshCw className="animate-spin text-teal-400" size={18} />
              </div>
            ) : alertsError ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                  Failed to load alerts.
                </p>
                <button
                  onClick={() => refetchAlerts()}
                  className="px-3 py-1 rounded text-[11px] font-semibold border"
                  style={{ borderColor: "var(--color-border-subtle)" }}
                >
                  Retry
                </button>
              </div>
            ) : activeAlertsList.length === 0 ? (
              <div className="text-xs text-center py-8" style={{ color: "var(--color-text-tertiary)" }}>
                No active price level monitors.
              </div>
            ) : (
              <div className="divide-y space-y-2" style={{ borderColor: "var(--color-border-subtle)" }}>
                {activeAlertsList.map((alert) => {
                  const cond = alert.condition;
                  return (
                    <div key={alert.id} className="flex items-center justify-between py-2 text-xs">
                      <div>
                        <span className="font-bold text-white mr-2">{alert.instrument}</span>
                        <span style={{ color: "var(--color-text-tertiary)" }}>
                          Price is {cond.operator === "gt" ? "above" : "below"} ${cond.value.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleAlertMutation.mutate({ id: alert.id, isActive: false })}
                          className="text-teal-400 hover:text-teal-300"
                          aria-label={`Disable alert for ${alert.instrument}`}
                        >
                          <ToggleRight size={20} />
                        </button>
                        <button
                          onClick={() => deleteAlertMutation.mutate(alert.id)}
                          className="text-rose-400 hover:text-rose-300 p-1"
                          aria-label={`Delete alert for ${alert.instrument}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Alert History / Trigger Notifications */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-tertiary)" }}>
                Trigger Notifications
              </h2>
              {notifications && notifications.length > 0 && (
                <span className="badge badge-neutral">{notifications.length}</span>
              )}
            </div>

            {notificationsLoading ? (
              <div className="flex justify-center py-6">
                <RefreshCw className="animate-spin text-teal-400" size={18} />
              </div>
            ) : notificationsError ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                  Failed to load notifications.
                </p>
                <button
                  onClick={() => refetchNotifications()}
                  className="px-3 py-1 rounded text-[11px] font-semibold border"
                  style={{ borderColor: "var(--color-border-subtle)" }}
                >
                  Retry
                </button>
              </div>
            ) : !notifications || notifications.length === 0 ? (
              <div className="text-xs text-center py-8" style={{ color: "var(--color-text-tertiary)" }}>
                No notifications received.
              </div>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => !n.isRead && markReadMutation.mutate(n.id)}
                    onKeyDown={(e) => {
                      if (!n.isRead && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        markReadMutation.mutate(n.id);
                      }
                    }}
                    role={n.isRead ? undefined : "button"}
                    tabIndex={n.isRead ? undefined : 0}
                    aria-label={n.isRead ? undefined : `Mark notification "${n.title}" as read`}
                    className="p-3 rounded-lg border text-xs cursor-pointer transition-colors flex items-start justify-between"
                    style={{
                      backgroundColor: n.isRead ? "transparent" : "var(--color-accent-primary-muted)",
                      borderColor: "var(--color-border-subtle)",
                    }}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Bell size={12} className={n.isRead ? "text-zinc-500" : "text-teal-400 animate-bounce"} />
                        <span className="font-bold text-white">{n.title}</span>
                      </div>
                      <p style={{ color: "var(--color-text-secondary)" }}>{n.body}</p>
                    </div>
                    <span className="text-[9px]" style={{ color: "var(--color-text-tertiary)" }}>
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
