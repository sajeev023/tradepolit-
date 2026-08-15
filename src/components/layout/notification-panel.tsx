"use client";

import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/lib/stores/ui-store";
import { Bell, X, Check, Volume2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export function NotificationPanel() {
  const queryClient = useQueryClient();
  const { notificationPanelOpen, setNotificationPanelOpen } = useUIStore();
  const panelRef = useRef<HTMLDivElement>(null);

  // 1. Fetch user notifications
  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/v1/notifications");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to load notifications");
      return body.data;
    },
    enabled: notificationPanelOpen,
    refetchInterval: 15000, // auto-refresh unread alerts
  });

  // 2. Mark notification read
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

  // 3. Mark all read — fire the PATCH requests in parallel rather than
  // awaiting them one at a time.
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unreads = notifications.filter((n) => !n.isRead);
      await Promise.all(
        unreads.map((n) => fetch(`/api/v1/notifications/${n.id}/read`, { method: "PATCH" }))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All notifications marked as read");
    },
  });

  // 4. Click outside + Escape to close.
  // Use a data-attribute sentinel shared with the trigger (in the topbar) so
  // the guard works whether the panel is portaled, re-parented, or the trigger
  // is clicked again. A click inside any element tagged `data-notification-scope`
  // (the panel itself or the bell trigger) is treated as in-scope and does not
  // close the panel; everything else closes it. This avoids the toggle-fl where
  // mousedown closes the panel and the subsequent click re-opens it.
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!notificationPanelOpen) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest?.("[data-notification-scope]")) return;
      setNotificationPanelOpen(false);
    }
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") setNotificationPanelOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [notificationPanelOpen, setNotificationPanelOpen]);

  if (!notificationPanelOpen) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Notifications"
      data-notification-scope
      className="fixed right-0 top-0 h-screen w-80 z-50 flex flex-col justify-between border-l glass shadow-2xl animate-fade-in"
      style={{
        backgroundColor: "rgba(10, 15, 24, 0.9)",
        borderColor: "var(--color-border-subtle)",
      }}
    >
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between shrink-0" style={{ borderColor: "var(--color-border-subtle)" }}>
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-[var(--color-accent-primary)]" />
          <span className="text-sm font-bold text-[var(--color-text-primary)]">Notifications</span>
          {unreadCount > 0 && (
            <span className="badge badge-info">{unreadCount} unread</span>
          )}
        </div>
        <button
          onClick={() => setNotificationPanelOpen(false)}
          aria-label="Close notifications"
          className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] p-1"
        >
          <X size={16} />
        </button>
      </div>

      {/* List content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 min-h-0">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Bell size={24} className="text-[var(--color-text-quaternary)] mb-2" />
            <p className="text-xs text-[var(--color-text-quaternary)] font-medium">No notifications yet</p>
            <p className="text-[10px] text-[var(--color-text-quaternary)] mt-1 max-w-[160px]">
              Set up price or technical indicator alerts in the monitor tab.
            </p>
          </div>
        ) : (
          notifications.map((n) => {
            const isAlert = n.type === "ALERT_TRIGGER";
            const isVol = n.type === "VOLATILITY_SPIKE";
            const isSharp = n.type === "SHARP_MOVE";

            return (
              <div
                key={n.id}
                onClick={() => !n.isRead && markReadMutation.mutate(n.id)}
                className="p-3 rounded-lg border text-xs cursor-pointer transition-all duration-200 select-none hover:border-[var(--color-border-default)]"
                style={{
                  backgroundColor: n.isRead ? "rgba(255, 255, 255, 0.01)" : "var(--color-profit-bg)",
                  borderColor: n.isRead ? "var(--color-border-subtle)" : "rgba(45, 212, 168, 0.22)",
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-[var(--color-text-primary)]">
                    {isAlert && <ShieldAlert size={12} className="text-[var(--color-accent-primary)]" />}
                    {isVol && <Volume2 size={12} className="text-[var(--color-warning)]" />}
                    {isSharp && <Bell size={12} className="text-[var(--color-accent-primary)]" />}
                    <span>{n.title}</span>
                  </div>
                  {!n.isRead && (
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] shrink-0 mt-1" />
                  )}
                </div>
                <p className="text-[var(--color-text-tertiary)] leading-relaxed font-medium">
                  {n.body}
                </p>
                <p className="text-[9px] text-[var(--color-text-quaternary)] mt-2 font-mono">
                  {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Footer operations */}
      {unreadCount > 0 && (
        <div className="p-3 border-t bg-[var(--color-bg-secondary)] shrink-0" style={{ borderColor: "var(--color-border-subtle)" }}>
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="btn-secondary w-full text-[11px] py-2 flex items-center justify-center gap-1.5"
          >
            <Check size={13} />
            Mark all as read
          </button>
        </div>
      )}
    </div>
  );
}
