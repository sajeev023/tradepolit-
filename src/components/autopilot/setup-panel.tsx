"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plane } from "lucide-react";
import { RISK_PROFILES, SUPPORTED_SYMBOLS, assessGoal, type GoalVerdict } from "@/lib/autopilot/goal";
import type { RiskProfile } from "@/lib/autopilot/types";
import { Chip, Label, Panel } from "@/components/fd/primitives";
import { FormInput } from "@/components/ui/form-input";
import { HistoricalEvidence } from "./evidence";
import { signedPct, type SessionView } from "./format";

const PROFILE_COPY: Record<RiskProfile, { name: string; line: string }> = {
  CONSERVATIVE: { name: "Conservative", line: "Smallest swings" },
  BALANCED: { name: "Balanced", line: "The default" },
  AGGRESSIVE: { name: "Aggressive", line: "Bigger swings both ways" },
};

const VERDICT: Record<GoalVerdict, { label: string; tone: "gain" | "warn" | "loss" }> = {
  PLAUSIBLE: { label: "Plausible", tone: "gain" },
  AMBITIOUS: { label: "Ambitious", tone: "warn" },
  VERY_UNLIKELY: { label: "Very unlikely", tone: "loss" },
  INVALID: { label: "Check your numbers", tone: "warn" },
};

interface CreateBody {
  startingBalance: number;
  targetBalance: number;
  horizonDays: number;
  riskProfile: RiskProfile;
  symbols: string[];
}

async function createSession(body: CreateBody): Promise<SessionView> {
  const res = await fetch("/api/v1/autopilot", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error?.message || "Could not start the session");
  return json.data;
}

export function SetupPanel({ onCreated }: { onCreated: (session: SessionView) => void }) {
  const queryClient = useQueryClient();
  const [balance, setBalance] = useState("1000");
  const [target, setTarget] = useState("2000");
  const [days, setDays] = useState("90");
  const [profile, setProfile] = useState<RiskProfile>("BALANCED");
  const [symbols, setSymbols] = useState<string[]>([...SUPPORTED_SYMBOLS]);

  const start = Number(balance);
  const goal = Number(target);
  const horizon = Number(days);
  const assessment = useMemo(() => assessGoal(start, goal, horizon), [start, goal, horizon]);
  const verdict = VERDICT[assessment.verdict];
  const canStart = assessment.verdict !== "INVALID" && symbols.length > 0 && Number.isInteger(horizon);

  const mutation = useMutation({
    mutationFn: createSession,
    onSuccess: (session) => {
      toast.success("Paper session started");
      queryClient.invalidateQueries({ queryKey: ["autopilot"] });
      onCreated(session);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleSymbol = (symbol: string) =>
    setSymbols((current) => (current.includes(symbol) ? current.filter((s) => s !== symbol) : [...current, symbol]));

  return (
    <div className="flex flex-col gap-6">
      <Panel label="New paper session" title="Set the goal">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="field">
            <span className="field__label">Starting balance (paper)</span>
            <FormInput type="number" inputMode="decimal" min={100} step="any" value={balance} onChange={(e) => setBalance(e.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">Target balance</span>
            <FormInput type="number" inputMode="decimal" min={100} step="any" value={target} onChange={(e) => setTarget(e.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">Time frame (days)</span>
            <FormInput type="number" inputMode="numeric" min={7} max={730} step={1} value={days} onChange={(e) => setDays(e.target.value)} />
          </label>
        </div>

        <div
          className="mt-5 rounded-lg border p-4"
          style={{ borderColor: assessment.verdict === "INVALID" ? "var(--color-border-strong)" : "var(--hairline)", background: "var(--panel-2)" }}
          aria-live="polite"
        >
          <div className="flex items-center gap-2">
            <Label>Reality check</Label>
            <Chip tone={verdict.tone}>{verdict.label}</Chip>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-text-secondary)]">{assessment.message}</p>
        </div>

        <fieldset className="mt-6">
          <legend className="mb-2">
            <Label>Risk profile</Label>
          </legend>
          <div role="radiogroup" aria-label="Risk profile" className="grid gap-3 sm:grid-cols-3">
            {(Object.keys(PROFILE_COPY) as RiskProfile[]).map((id) => {
              const on = id === profile;
              const r = RISK_PROFILES[id];
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setProfile(id)}
                  className="cursor-pointer rounded-lg border p-4 text-left transition-colors"
                  style={{
                    borderColor: on ? "var(--accent)" : "var(--hairline)",
                    background: on ? "rgba(var(--accent-rgb), 0.06)" : "transparent",
                  }}
                >
                  <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">{PROFILE_COPY[id].name}</p>
                  <p className="text-[12px] text-[var(--color-text-tertiary)]">{PROFILE_COPY[id].line}</p>
                  <ul className="mt-3 space-y-1 font-mono text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
                    <li>Risks {r.riskPerTradePct}% per trade</li>
                    <li>Pauses for the day at {signedPct(-r.maxDailyLossPct, 0)}</li>
                    <li>Kill switch at {signedPct(-r.maxDrawdownPct, 0)} from peak</li>
                  </ul>
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="mt-6">
          <legend className="mb-2">
            <Label>Markets (spot, long-only)</Label>
          </legend>
          <div className="flex flex-wrap gap-2">
            {SUPPORTED_SYMBOLS.map((symbol) => {
              const on = symbols.includes(symbol);
              return (
                <button
                  key={symbol}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleSymbol(symbol)}
                  className="h-10 cursor-pointer rounded-lg px-4 font-mono text-[12px] font-medium transition-colors"
                  style={{
                    background: on ? "var(--accent)" : "transparent",
                    color: on ? "var(--on-accent)" : "var(--color-text-tertiary)",
                    boxShadow: on ? "none" : "inset 0 0 0 1px var(--hairline)",
                  }}
                >
                  {symbol}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-6 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "var(--hairline)" }}>
          <p className="max-w-md text-[12px] leading-relaxed text-[var(--color-text-tertiary)]">
            Simulated account on real market prices. Entries fill at the next hourly open with fees and slippage. No broker, no real money.
          </p>
          <button
            type="button"
            className="btn-primary btn-lg w-full sm:w-auto"
            disabled={!canStart || mutation.isPending}
            onClick={() => mutation.mutate({ startingBalance: start, targetBalance: goal, horizonDays: horizon, riskProfile: profile, symbols })}
          >
            {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plane size={16} />}
            Start paper session
          </button>
        </div>
      </Panel>

      {assessment.verdict !== "INVALID" && (
        <HistoricalEvidence profile={profile} requiredReturnPct={assessment.requiredReturnPct} horizonDays={horizon} />
      )}
    </div>
  );
}
