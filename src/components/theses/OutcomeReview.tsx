"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Loader2, ClipboardList, Sparkles, ChevronDown } from "lucide-react";
import { toast } from "sonner";

/**
 * OUTCOME REVIEW + ATTRIBUTION (V2.5) — closes the thesis loop and
 * grades the REASONING, not just the outcome.
 *
 * Flow:
 *   1. User reports result / took-trade / plan adherence / lesson.
 *   2. The attribution engine (deterministic) PROPOSES a label — shown
 *      with its reasoning, pre-selected.
 *   3. The user can accept it or override — the human is the final
 *      authority; the engine is the default.
 *
 * This write is the core of the labeled-decision dataset: decision +
 * evidence + outcome + attribution, per thesis.
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

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm p-0 md:p-4">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-t-2xl md:rounded-2xl p-6 space-y-5 max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-blue-400" />
              <h2 className="text-white font-semibold">Review outcome</h2>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              {symbol} thesis {status === "HIT" ? "reached its target" : status === "INVALIDATED" ? "was invalidated" : "expired"}. What happened — and what should it teach you?
            </p>
          </div>
          <button onClick={onDone} className="text-zinc-500 hover:text-zinc-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Result */}
        <div>
          <label className="text-xs text-zinc-400 mb-2 block">Result</label>
          <div className="grid grid-cols-2 gap-2">
            {RESULTS.map((r) => (
              <button
                key={r.value}
                onClick={() => setResult(r.value)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  result === r.value
                    ? "border-blue-500/50 bg-blue-500/10 text-blue-200"
                    : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700"
                }`}
              >
                <div className="text-sm font-medium">{r.label}</div>
                <div className="text-[11px] text-zinc-500">{r.hint}</div>
              </button>
            ))}
          </div>
        </div>

        {/* R multiple (only when traded) */}
        {result && result !== "NO_TRADE" && (
          <div>
            <label className="text-xs text-zinc-400 mb-1.5 block">R multiple (optional)</label>
            <input
              type="number"
              step="0.1"
              value={rMultiple}
              onChange={(e) => setRMultiple(e.target.value)}
              placeholder="e.g. 2.5 or -1"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50"
            />
          </div>
        )}

        {/* Plan adherence */}
        {result && result !== "NO_TRADE" && (
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Did you follow the plan?</label>
            <div className="flex gap-2">
              <button
                onClick={() => setFollowedPlan(true)}
                className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-colors ${
                  followedPlan === true ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300" : "border-zinc-800 bg-zinc-900 text-zinc-300"
                }`}
              >
                Yes — followed the thesis
              </button>
              <button
                onClick={() => setFollowedPlan(false)}
                className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-colors ${
                  followedPlan === false ? "border-amber-500/50 bg-amber-500/10 text-amber-300" : "border-zinc-800 bg-zinc-900 text-zinc-300"
                }`}
              >
                No — deviated
              </button>
            </div>
          </div>
        )}

        {/* Attribution — the engine proposes, the user confirms/overrides */}
        <div className="space-y-2">
          <label className="text-xs text-zinc-400 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-violet-400" />
            What KIND of decision was this?
          </label>

          {proposal && !attributionTouched && (
            <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 text-xs leading-relaxed">
              <div className="text-violet-300 font-medium flex items-center justify-between">
                <span>Engine proposal: {LABELS.find((l) => l.value === proposal.label)?.label ?? proposal.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${proposal.confidence === "high" ? "border-emerald-500/30 text-emerald-400" : "border-zinc-700 text-zinc-400"}`}>
                  {proposal.confidence} confidence
                </span>
              </div>
              <p className="text-zinc-400 mt-1">{proposal.reasoning}</p>
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
                  className={`p-2.5 rounded-lg border text-left transition-colors ${
                    attribution === l.value
                      ? "border-violet-500/50 bg-violet-500/10"
                      : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                  }`}
                >
                  <div className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
                    {l.label}
                    {isEnginePick && (
                      <span className="text-[9px] text-violet-300 border border-violet-500/30 rounded px-1">engine</span>
                    )}
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">{l.hint}</div>
                </button>
              );
            })}
          </div>
          {engineMatch && attributionTouched && (
            <p className="text-[10px] text-zinc-500">You picked the same label the engine proposed.</p>
          )}
        </div>

        {/* Lesson */}
        <div>
          <label className="text-xs text-zinc-400 mb-1.5 block">What did you learn? (optional)</label>
          <textarea
            value={whatILearned}
            onChange={(e) => setWhatILearned(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="One sentence is enough. This is what your future self will read."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 resize-none"
          />
        </div>

        <button
          onClick={() => result && mutation.mutate()}
          disabled={!result || mutation.isPending}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Log outcome & attribution
        </button>
      </div>
    </div>
  );
}

export default OutcomeReview;