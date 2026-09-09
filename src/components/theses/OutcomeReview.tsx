"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Loader2, ClipboardList, Sparkles } from "lucide-react";
import { toast } from "sonner";

/**
 * OUTCOME REVIEW + ATTRIBUTION (V4) — closes the thesis loop and
 * grades the REASONING, not just the outcome.
 */

interface Props {
  thesisId: string;
  symbol: string;
  status: "HIT" | "INVALIDATED" | "EXPIRED";
  onDone: () => void;
}

const RESULTS = [
  { value: "WIN", label: "Win", hint: "Took it and it worked" },
  { value: "LOSS", label: "Loss", hint: "Took it and it failed" },
  { value: "BREAKEVEN", label: "Breakeven", hint: "Took it, scratched" },
  { value: "NO_TRADE", label: "Didn't trade", hint: "Watched it without committing" },
] as const;

interface LabelOption {
  value: string;
  label: string;
  hint: string;
}

const LABELS: LabelOption[] = [
  { value: "GOOD_DECISION_GOOD_OUTCOME", label: "Good decision, good outcome", hint: "Sound process, paid as expected" },
  { value: "GOOD_DECISION_BAD_OUTCOME", label: "Good decision, bad outcome", hint: "Sound process, variance won — no lesson needed" },
  { value: "BAD_DECISION_GOOD_OUTCOME", label: "Bad decision, good outcome", hint: "Flawed process, paid anyway — luck" },
  { value: "BAD_DECISION_BAD_OUTCOME", label: "Bad decision, bad outcome", hint: "Flawed process, lost — fix the process" },
  { value: "EXECUTION_ERROR", label: "Execution error", hint: "Right idea, wrong entry/timing/management" },
  { value: "RISK_MANAGEMENT_ERROR", label: "Risk error", hint: "Oversized, no stop, or stop moved" },
  { value: "REGIME_SHIFT", label: "Regime shift", hint: "Market changed character after entry" },
  { value: "INFORMATION_FAILURE", label: "Information failure", hint: "The evidence itself was wrong or missing" },
  { value: "BEHAVIORAL_ERROR", label: "Behavioral error", hint: "Emotion-driven deviation (revenge, FOMO)" },
  { value: "DATA_QUALITY_ISSUE", label: "Data-quality issue", hint: "Feed or data problem corrupted the read" },
];

interface Proposal {
  label: string;
  reasoning: string;
  alternates: string[];
  confidence: "high" | "medium" | "low";
}

export function OutcomeReview({ thesisId, symbol, status, onDone }: Props) {
  const queryClient = useQueryClient();
  const [result, setResult] = useState<(typeof RESULTS)[number]["value"] | null>(null);
  const [rMultiple, setRMultiple] = useState("");
  const [followedPlan, setFollowedPlan] = useState<boolean | null>(null);
  const [whatILearned, setWhatILearned] = useState("");
  const [attribution, setAttribution] = useState<string | null>(null);
  const [attributionTouched, setAttributionTouched] = useState(false);

  // Pre-fetch the engine's deterministic proposal (with thesis evidence).
  const { data: proposalData } = useQuery<{ proposal: Proposal }>({
    queryKey: ["thesis-proposal", thesisId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/theses/${thesisId}?proposal=1`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to load proposal");
      return body.data;
    },
  });

  // Default to the engine's proposal unless the user overrides.
  useEffect(() => {
    if (proposalData?.proposal && !attributionTouched) {
      setAttribution(proposalData.proposal.label);
    }
  }, [proposalData, attributionTouched]);

  const proposal = proposalData?.proposal;

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/theses/${thesisId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outcome: {
            result,
            tookTrade: result !== "NO_TRADE",
            rMultiple: rMultiple ? parseFloat(rMultiple) : undefined,
            followedPlan: followedPlan ?? undefined,
            whatILearned: whatILearned || undefined,
            attribution: attribution ?? undefined,
          },
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to log outcome");
      return body.data;
    },
    onSuccess: () => {
      toast.success("Outcome logged — your decision record just got smarter");
      queryClient.invalidateQueries({ queryKey: ["theses"] });
      queryClient.invalidateQueries({ queryKey: ["insights"] });
      onDone();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const engineMatch = proposal && attribution === proposal.label;

  const statusVerb = status === "HIT" ? "target reached" : status === "INVALIDATED" ? "invalidated" : "expired";

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm p-0 md:p-4">
      <div className="w-full max-w-lg rounded-t-2xl md:rounded-2xl p-6 space-y-5 max-h-[92vh] overflow-y-auto border"
        style={{ backgroundColor: "var(--color-bg-secondary)", borderColor: "var(--color-border-strong)" }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-[var(--color-accent-primary)]" />
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Review Outcome & Attribution</h2>
            </div>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
              {symbol} thesis {statusVerb}. Close the loop so your DecisionScore and calibration can improve.
            </p>
          </div>
          <button onClick={onDone} className="text-[var(--color-text-quaternary)] hover:text-[var(--color-text-primary)] transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Result */}
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-2 block">What happened?</label>
          <div className="grid grid-cols-2 gap-2">
            {RESULTS.map((r) => (
              <button
                key={r.value}
                onClick={() => setResult(r.value)}
                className={`p-3 rounded-lg border text-left transition-colors text-xs ${
                  result === r.value
                    ? "border-[var(--color-accent-primary)] bg-[var(--color-accent-primary-subtle)] text-[var(--color-accent-primary)]"
                    : "border-[var(--color-border-subtle)] bg-[var(--color-bg-deepest)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-default)]"
                }`}
              >
                <div className="font-semibold">{r.label}</div>
                <div className="text-[10px] text-[var(--color-text-quaternary)] mt-0.5">{r.hint}</div>
              </button>
            ))}
          </div>
        </div>

        {/* R multiple + Plan adherence */}
        {result && result !== "NO_TRADE" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-1.5 block">R multiple</label>
              <input
                type="number"
                step="0.1"
                value={rMultiple}
                onChange={(e) => setRMultiple(e.target.value)}
                placeholder="e.g. 2.5 or -1"
                className="w-full bg-[var(--color-bg-deepest)] border border-[var(--color-border-subtle)] rounded-lg px-3 py-2 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-quaternary)] focus:outline-none focus:border-[var(--color-accent-primary)]"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-1.5 block">Followed plan?</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFollowedPlan(true)}
                  className={`flex-1 px-3 py-2 rounded-lg border text-xs transition-colors ${
                    followedPlan === true
                      ? "border-[var(--color-profit)] bg-[var(--color-profit-bg)] text-[var(--color-profit)]"
                      : "border-[var(--color-border-subtle)] bg-[var(--color-bg-deepest)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-default)]"
                  }`}
                >
                  Yes
                </button>
                <button
                  onClick={() => setFollowedPlan(false)}
                  className={`flex-1 px-3 py-2 rounded-lg border text-xs transition-colors ${
                    followedPlan === false
                      ? "border-[var(--color-warning)] bg-[var(--color-warning-bg)] text-[var(--color-warning)]"
                      : "border-[var(--color-border-subtle)] bg-[var(--color-bg-deepest)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-default)]"
                  }`}
                >
                  No
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Attribution */}
        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-[var(--color-accent-primary)]" />
            What kind of decision was this?
          </label>

          {proposal && !attributionTouched && (
            <div className="rounded-lg border p-3 text-xs leading-relaxed" style={{ borderColor: "rgba(var(--accent-rgb), 0.25)", backgroundColor: "var(--color-accent-primary-subtle)" }}>
              <div className="text-[var(--color-accent-primary)] font-medium flex items-center justify-between">
                <span>Engine proposal: {LABELS.find((l) => l.value === proposal.label)?.label ?? proposal.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${proposal.confidence === "high" ? "border-[var(--color-profit)] text-[var(--color-profit)]" : "border-[var(--color-border-subtle)] text-[var(--color-text-tertiary)]"}`}>
                  {proposal.confidence} confidence
                </span>
              </div>
              <p className="text-[var(--color-text-secondary)] mt-1">{proposal.reasoning}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {LABELS.map((l) => {
              const isEnginePick = proposal?.label === l.value;
              return (
                <button
                  key={l.value}
                  onClick={() => {
                    setAttribution(l.value);
                    setAttributionTouched(true);
                  }}
                  className={`p-2.5 rounded-lg border text-left transition-colors text-xs ${
                    attribution === l.value
                      ? "border-[var(--color-accent-primary)] bg-[var(--color-accent-primary-subtle)]"
                      : "border-[var(--color-border-subtle)] bg-[var(--color-bg-deepest)] hover:border-[var(--color-border-default)]"
                  }`}
                >
                  <div className="font-medium text-[var(--color-text-primary)] flex items-center gap-1.5">
                    {l.label}
                    {isEnginePick && (
                      <span className="text-[9px] text-[var(--color-accent-primary)] border border-[var(--color-accent-primary)]/30 rounded px-1">engine</span>
                    )}
                  </div>
                  <div className="text-[10px] text-[var(--color-text-quaternary)] mt-0.5">{l.hint}</div>
                </button>
              );
            })}
          </div>
          {engineMatch && attributionTouched && (
            <p className="text-[10px] text-[var(--color-text-quaternary)]">You picked the same label the engine proposed.</p>
          )}
        </div>

        {/* Lesson */}
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-1.5 block">What did you learn?</label>
          <textarea
            value={whatILearned}
            onChange={(e) => setWhatILearned(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="One sentence is enough. This is what your future self will read."
            className="w-full bg-[var(--color-bg-deepest)] border border-[var(--color-border-subtle)] rounded-lg px-3 py-2 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-quaternary)] focus:outline-none focus:border-[var(--color-accent-primary)] resize-none"
          />
        </div>

        <button
          onClick={() => result && mutation.mutate()}
          disabled={!result || mutation.isPending}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: "var(--color-accent-primary)", color: "#05070B" }}
        >
          {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Log outcome & attribution
        </button>
      </div>
    </div>
  );
}

export default OutcomeReview;