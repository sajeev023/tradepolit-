"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Plane, Plus } from "lucide-react";
import { toast } from "sonner";
import { Chip, EmptyState, Label, Skeleton } from "@/components/fd/primitives";
import { SetupPanel } from "@/components/autopilot/setup-panel";
import { SessionViewPanel } from "@/components/autopilot/session-view";
import type { SessionView } from "@/components/autopilot/format";

const QUERY_KEY = ["autopilot"];
const REFRESH_MS = 60_000;
const MAX_LIVE_SESSIONS = 3;

async function fetchSessions(): Promise<SessionView[]> {
  const res = await fetch("/api/v1/autopilot");
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error?.message || "Could not load Autopilot sessions");
  return json.data;
}

async function sendAction(vars: { id: string; action: "pause" | "resume" | "stop" }): Promise<SessionView> {
  const res = await fetch(`/api/v1/autopilot/${vars.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: vars.action }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error?.message || "Could not update the session");
  return json.data;
}

export default function AutopilotPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);

  const { data: sessions, isLoading, error, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchSessions,
    refetchInterval: REFRESH_MS,
    refetchIntervalInBackground: false,
  });

  const actionMutation = useMutation({
    mutationFn: sendAction,
    onSuccess: (updated, vars) => {
      queryClient.setQueryData<SessionView[]>(QUERY_KEY, (current) => (current ?? []).map((s) => (s.id === updated.id ? updated : s)));
      toast.success(vars.action === "stop" ? "Session stopped" : vars.action === "pause" ? "Session paused" : "Session resumed");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const list = sessions ?? [];
  const selected = list.find((s) => s.id === selectedId) ?? list[0] ?? null;
  const liveCount = list.filter((s) => s.status === "ACTIVE" || s.status === "PAUSED").length;
  const setupVisible = !isLoading && (list.length === 0 || showSetup);

  return (
    <div className="mx-auto flex max-w-[1080px] flex-col gap-6 lg:gap-8">
      <header>
        <div className="flex items-center gap-2">
          <Label>Autopilot</Label>
          <Chip tone="signal" dot>
            Paper only
          </Chip>
        </div>
        <h1 className="mt-2 text-[var(--color-text-primary)]">
          Set the goal. <em className="text-[var(--accent)]">Paper-trade</em> it.
        </h1>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-[var(--color-text-tertiary)]">
          Give Autopilot a target and a risk budget. It trades a simulated account on real market prices under hard limits, and writes down every decision.
          No broker, no real money — a way to see what a goal like yours would actually take.
        </p>
      </header>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-[120px] w-full" />
          <Skeleton className="h-[260px] w-full" />
        </div>
      )}

      {error && !isLoading && (
        <div className="card p-6">
          <EmptyState
            icon={<Plane size={18} />}
            title="Couldn't load Autopilot"
            body={(error as Error).message}
            action={
              <button type="button" className="btn-secondary btn-sm" onClick={() => refetch()}>
                Try again
              </button>
            }
          />
        </div>
      )}

      {list.length > 1 && (
        <div role="tablist" aria-label="Sessions" className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
          {list.map((s) => {
            const on = s.id === selected?.id;
            return (
              <button
                key={s.id}
                role="tab"
                aria-selected={on}
                onClick={() => setSelectedId(s.id)}
                className="h-9 max-w-[220px] shrink-0 cursor-pointer truncate rounded-lg px-4 font-mono text-[11px] font-medium uppercase tracking-[0.08em] transition-colors"
                style={{ background: on ? "var(--accent)" : "transparent", color: on ? "var(--on-accent)" : "var(--color-text-tertiary)", boxShadow: on ? "none" : "inset 0 0 0 1px var(--hairline)" }}
              >
                {s.name}
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <SessionViewPanel
          session={selected}
          busy={actionMutation.isPending}
          onAction={(action) => actionMutation.mutate({ id: selected.id, action })}
        />
      )}

      {list.length > 0 && !showSetup && (
        <div>
          <button type="button" className="btn-secondary btn-sm" onClick={() => setShowSetup(true)} disabled={liveCount >= MAX_LIVE_SESSIONS}>
            <Plus size={14} /> New paper session
          </button>
          {liveCount >= MAX_LIVE_SESSIONS && (
            <p className="mt-2 text-[12px] text-[var(--color-text-tertiary)]">You have {MAX_LIVE_SESSIONS} live sessions. Stop one to start another.</p>
          )}
        </div>
      )}

      {setupVisible && (
        <SetupPanel
          onCreated={(session) => {
            setSelectedId(session.id);
            setShowSetup(false);
          }}
        />
      )}

      <section className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6" aria-label="Real-money trading">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border" style={{ borderColor: "var(--hairline)", color: "var(--color-text-tertiary)" }}>
            <Lock size={15} />
          </span>
          <div>
            <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">Real-money trading isn&apos;t available</p>
            <p className="mt-1 max-w-xl text-[12.5px] leading-relaxed text-[var(--color-text-tertiary)]">
              TradCopilot doesn&apos;t connect to brokers or hold funds. Autopilot stays on paper while we measure how these rules behave in live markets.
            </p>
          </div>
        </div>
        <button type="button" className="btn-secondary btn-sm shrink-0" disabled aria-disabled="true">
          Connect a broker
        </button>
      </section>
    </div>
  );
}
