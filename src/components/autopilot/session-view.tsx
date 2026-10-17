"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Pause, Play, Square } from "lucide-react";
import { EquityCurveChart } from "@/components/ui/equity-curve-chart";
import { Chip, Label, Panel, Stat } from "@/components/fd/primitives";
import { shortDate, shortDateTime, signedPct, signedUsd, usd, type SessionView } from "./format";

type Tone = "gain" | "loss" | "warn" | "signal" | "neutral";

const STATUS: Record<SessionView["status"], { label: string; tone: Tone }> = {
  ACTIVE: { label: "Active", tone: "signal" },
  PAUSED: { label: "Paused", tone: "warn" },
  GOAL_REACHED: { label: "Goal reached", tone: "gain" },
  HALTED: { label: "Halted", tone: "loss" },
  STOPPED: { label: "Stopped", tone: "neutral" },
};

const EXIT_LABEL = { STOP: "Stop", TARGET: "Target", KILL_SWITCH: "Kill switch", GOAL: "Goal", MANUAL: "Manual" } as const;

function eventChip(e: SessionView["events"][number]): { label: string; tone: Tone } {
  switch (e.kind) {
    case "ENTRY_SIGNAL":
      return { label: "Signal", tone: "signal" };
    case "ENTRY_FILLED":
      return { label: "Bought", tone: "gain" };
    case "ENTRY_VETOED":
      return { label: "AI veto", tone: "warn" };
    case "ENTRY_CANCELLED":
      return { label: "Cancelled", tone: "neutral" };
    case "EXIT":
      return { label: "Sold", tone: e.message.includes("−$") ? "loss" : "gain" };
    case "GUARDRAIL":
      return { label: "Guardrail", tone: "warn" };
    default:
      return { label: "Status", tone: "neutral" };
  }
}

const price = (n: number) => usd(n, n < 10 ? 4 : 2);
const pnlTone = (n: number) => (n >= 0 ? "var(--color-profit)" : "var(--color-loss)");

function Meter({ value, max, tone }: { value: number; max: number; tone: "signal" | "warn" | "loss" }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const color = tone === "signal" ? "var(--accent)" : tone === "warn" ? "var(--color-warning)" : "var(--color-loss)";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--panel-3)" }}>
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function SessionViewPanel({
  session,
  busy,
  onAction,
}: {
  session: SessionView;
  busy: boolean;
  onAction: (action: "pause" | "resume" | "stop") => void;
}) {
  const [confirmStop, setConfirmStop] = useState(false);
  const { summary, config, risk } = session;
  const status = STATUS[session.status];
  const live = session.status === "ACTIVE" || session.status === "PAUSED";

  const peak = Math.max(config.startingBalance, summary.equity, ...session.equityCurve.map((p) => p.e));
  const drawdownNow = peak > 0 ? Math.max(0, ((peak - summary.equity) / peak) * 100) : 0;
  const progress = Math.min(100, Math.max(0, summary.progressToGoalPct));
  const pnl = summary.equity - config.startingBalance;

  // Hourly points collapse to one per day on longer sessions, so axis labels don't repeat.
  const chartData = useMemo(() => {
    const points = session.equityCurve;
    const cents = (n: number) => Math.round(n * 100) / 100;
    const spanDays = points.length ? (points[points.length - 1].t - points[0].t) / 86_400_000 : 0;
    if (spanDays < 3) return points.map((p) => ({ date: shortDateTime(p.t), equity: cents(p.e) }));
    const lastOfDay = new Map<string, number>();
    for (const p of points) lastOfDay.set(shortDate(p.t), p.e);
    return [...lastOfDay].map(([date, equity]) => ({ date, equity: cents(equity) }));
  }, [session.equityCurve]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone={status.tone} dot>
              {status.label}
            </Chip>
            <Chip tone="neutral">Paper</Chip>
            <Chip tone="neutral">{config.riskProfile.toLowerCase()}</Chip>
          </div>
          <h2 className="mt-2 truncate text-[18px] font-semibold tracking-[-0.01em] text-[var(--color-text-primary)]">{session.name}</h2>
          <p className="mt-1 font-mono text-[11px] text-[var(--color-text-tertiary)]">
            {config.symbols.join(" · ")} · started {shortDateTime(config.startedAt)}
          </p>
        </div>

        {live && (
          <div className="flex flex-wrap items-center gap-2">
            {confirmStop ? (
              <>
                <span className="text-[12px] text-[var(--color-text-secondary)]">Close all positions and end the session?</span>
                <button type="button" className="btn-secondary btn-sm" onClick={() => setConfirmStop(false)} disabled={busy}>
                  Keep running
                </button>
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  disabled={busy}
                  onClick={() => {
                    setConfirmStop(false);
                    onAction("stop");
                  }}
                >
                  Stop session
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn-secondary btn-sm" disabled={busy} onClick={() => onAction(session.status === "PAUSED" ? "resume" : "pause")}>
                  {session.status === "PAUSED" ? <Play size={14} /> : <Pause size={14} />}
                  {session.status === "PAUSED" ? "Resume" : "Pause"}
                </button>
                <button type="button" className="btn-secondary btn-sm" disabled={busy} onClick={() => setConfirmStop(true)}>
                  <Square size={14} /> Stop
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {session.warning && (
        <div className="flex items-start gap-2.5 rounded-lg border p-3.5 text-[12.5px] leading-relaxed" style={{ borderColor: "var(--color-warning)", background: "var(--color-warning-bg)", color: "var(--color-text-secondary)" }} role="status">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" style={{ color: "var(--color-warning)" }} />
          {session.warning}
        </div>
      )}
      {session.haltedReason && (
        <div className="flex items-start gap-2.5 rounded-lg border p-3.5 text-[12.5px] leading-relaxed" style={{ borderColor: "var(--color-loss)", background: "var(--color-loss-bg)", color: "var(--color-text-secondary)" }} role="status">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" style={{ color: "var(--color-loss)" }} />
          {session.haltedReason}. Everything was closed and the session stopped trading, as designed.
        </div>
      )}

      <div className="card grid grid-cols-2 gap-x-6 gap-y-6 p-5 sm:p-6 lg:grid-cols-4">
        <div className="col-span-2 min-w-0 sm:col-span-1">
          <Stat label="Equity" value={usd(summary.equity)} note={`Cash ${usd(session.cash)}`} size="lg" />
        </div>
        <div className="col-span-2 min-w-0 sm:col-span-1">
          <Stat label="Profit / loss" value={signedUsd(pnl)} note={signedPct(summary.returnPct, 2)} tone={pnl >= 0 ? "gain" : "loss"} size="lg" />
        </div>
        <Stat
          label="Win rate"
          value={summary.winRatePct === null ? "—" : `${summary.winRatePct.toFixed(0)}%`}
          note={`${summary.wins} of ${summary.trades} trades`}
        />
        <Stat label="Fees paid" value={usd(summary.totalFees)} note="Included in P/L" />
      </div>

      <Panel label="Goal" title={`${usd(config.startingBalance, 0)} → ${usd(config.targetBalance, 0)} in ${config.horizonDays} days`}>
        <Meter value={progress} max={100} tone="signal" />
        <p className="mt-2.5 text-[12.5px] text-[var(--color-text-tertiary)]">
          {summary.progressToGoalPct >= 0 ? `${summary.progressToGoalPct.toFixed(1)}% of the way there.` : `${Math.abs(summary.progressToGoalPct).toFixed(1)}% of the goal distance below the start.`}{" "}
          Autopilot will not raise its risk to chase the target.
        </p>
      </Panel>

      <Panel label="Guardrails" title="Hard limits, always on">
        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <Label>Per trade</Label>
            <p className="mt-1.5 font-mono text-[20px] tabular-nums text-[var(--color-text-primary)]">{risk.riskPerTradePct}%</p>
            <p className="mt-1 text-[11.5px] text-[var(--color-text-tertiary)]">of equity risked to the stop · max {risk.maxOpenPositions} positions · no leverage</p>
          </div>
          <div>
            <Label>Daily loss limit</Label>
            <p className="mt-1.5 font-mono text-[20px] tabular-nums" style={{ color: session.entriesBlockedForDay ? "var(--color-warning)" : "var(--color-text-primary)" }}>
              {session.entriesBlockedForDay ? "Reached" : `${signedPct(-risk.maxDailyLossPct, 0)}`}
            </p>
            <p className="mt-1 text-[11.5px] text-[var(--color-text-tertiary)]">
              {session.entriesBlockedForDay ? "No new entries until the next UTC day." : "Stops new entries for the rest of the day."}
            </p>
          </div>
          <div>
            <Label>Drawdown from peak</Label>
            <p className="mt-1.5 font-mono text-[20px] tabular-nums text-[var(--color-text-primary)]">
              {drawdownNow.toFixed(1)}% <span className="text-[13px] text-[var(--color-text-tertiary)]">/ {risk.maxDrawdownPct}% kill switch</span>
            </p>
            <div className="mt-2">
              <Meter value={drawdownNow} max={risk.maxDrawdownPct} tone={drawdownNow > risk.maxDrawdownPct * 0.66 ? "loss" : drawdownNow > risk.maxDrawdownPct * 0.33 ? "warn" : "signal"} />
            </div>
          </div>
        </div>
      </Panel>

      <Panel label="Equity" title="Account value over time" padded={false}>
        <div className="px-3 pb-4 pt-2 sm:px-5">
          <EquityCurveChart data={chartData} dataKey="equity" xKey="date" height={240} yDomain={["auto", "auto"]} />
        </div>
      </Panel>

      <Panel label="Positions" title={`Open (${session.positions.length})`}>
        {session.positions.length === 0 && session.pending.length === 0 ? (
          <p className="text-[13px] text-[var(--color-text-tertiary)]">
            {live ? "Flat. Autopilot is waiting for a trend breakout that meets its rules — most hours, there isn't one." : "No open positions."}
          </p>
        ) : (
          <ul className="space-y-3">
            {session.positions.map((p) => (
              <li key={p.id} className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border p-3.5 sm:grid-cols-5 sm:items-center" style={{ borderColor: "var(--hairline)" }}>
                <div className="order-1 sm:order-none">
                  <p className="font-mono text-[14px] font-semibold text-[var(--color-text-primary)]">{p.symbol}</p>
                  <p className="font-mono text-[11px] text-[var(--color-text-tertiary)]">{p.qty.toPrecision(4)} units</p>
                </div>
                <div className="order-3 col-span-2 sm:order-none sm:col-span-1">
                  <Label>Entry → now</Label>
                  <p className="font-mono text-[12.5px] tabular-nums text-[var(--color-text-secondary)]">
                    {price(p.entryPrice)} → {price(p.mark)}
                  </p>
                </div>
                <div className="order-4 col-span-2 sm:order-none sm:col-span-1">
                  <Label>Stop / target</Label>
                  <p className="font-mono text-[12.5px] tabular-nums text-[var(--color-text-secondary)]">
                    {price(p.stop)} / {price(p.target)}
                  </p>
                </div>
                <div className="order-5 sm:order-none">
                  <Label>Risk</Label>
                  <p className="font-mono text-[12.5px] tabular-nums text-[var(--color-text-secondary)]">{usd(p.initialRisk)}</p>
                </div>
                <div className="order-2 text-right sm:order-none sm:text-left">
                  <Label>Unrealised</Label>
                  <p className="font-mono text-[14px] font-medium tabular-nums" style={{ color: pnlTone(p.unrealisedPnl) }}>
                    {signedUsd(p.unrealisedPnl)}
                  </p>
                </div>
              </li>
            ))}
            {session.pending.map((p) => (
              <li key={`${p.symbol}-${p.signalAt}`} className="rounded-lg border border-dashed p-3.5 text-[12.5px] text-[var(--color-text-secondary)]" style={{ borderColor: "var(--color-border-strong)" }}>
                <span className="font-mono font-semibold text-[var(--color-text-primary)]">{p.symbol}</span> — signal confirmed, buying at the next hourly open.
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel label="Decision log" title="Every decision, in order">
        {session.events.length === 0 ? (
          <p className="text-[13px] text-[var(--color-text-tertiary)]">Nothing yet.</p>
        ) : (
          <ol className="max-h-[420px] space-y-3.5 overflow-y-auto pr-1">
            {session.events.map((e, i) => {
              const chip = eventChip(e);
              return (
                <li key={`${e.ts}-${i}`} className="grid grid-cols-[84px_1fr] gap-x-3 gap-y-1 sm:grid-cols-[112px_1fr]">
                  <span className="pt-0.5 font-mono text-[10.5px] text-[var(--color-text-quaternary)]">{shortDateTime(e.ts)}</span>
                  <div className="min-w-0">
                    <Chip tone={chip.tone}>{chip.label}</Chip>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]">{e.message}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Panel>

      <Panel label="History" title={`Closed trades (${summary.trades})`}>
        {session.closed.length === 0 ? (
          <p className="text-[13px] text-[var(--color-text-tertiary)]">No closed trades yet.</p>
        ) : (
          <ul className="space-y-2.5">
            {session.closed.map((t) => (
              <li key={t.id}>
                <details className="rounded-lg border p-3.5" style={{ borderColor: "var(--hairline)" }}>
                  <summary className="grid cursor-pointer list-none grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 sm:grid-cols-[1.1fr_1.6fr_auto_auto]">
                    <span className="font-mono text-[13px] font-semibold text-[var(--color-text-primary)]">{t.symbol}</span>
                    <span
                      className="col-start-2 row-start-1 whitespace-nowrap text-right font-mono text-[13px] font-medium tabular-nums sm:col-start-4"
                      style={{ color: pnlTone(t.pnl) }}
                    >
                      {signedUsd(t.pnl)}
                    </span>
                    <span className="col-span-2 row-start-2 font-mono text-[11.5px] text-[var(--color-text-tertiary)] sm:col-span-1 sm:col-start-2 sm:row-start-1">
                      {price(t.entryPrice)} → {price(t.exitPrice)} · {EXIT_LABEL[t.exitReason]}
                      <span className="sm:hidden"> · {t.rMultiple.toFixed(2)}R</span>
                    </span>
                    <span className="hidden whitespace-nowrap font-mono text-[11px] text-[var(--color-text-tertiary)] sm:col-start-3 sm:row-start-1 sm:block">
                      {t.rMultiple.toFixed(2)}R
                    </span>
                  </summary>
                  <p className="mt-3 text-[12px] leading-relaxed text-[var(--color-text-tertiary)]">
                    <span className="text-[var(--color-text-secondary)]">Why it entered:</span> {t.reason}. Opened {shortDateTime(t.openedAt)}, closed {shortDateTime(t.closedAt)}, fees {usd(t.fees)}.
                  </p>
                </details>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
