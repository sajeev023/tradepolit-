"use client";

import React from "react";
import { 
  Compass, 
  Target, 
  Layers, 
  ShieldCheck, 
  Activity, 
  Award, 
  ArrowRight, 
  Clock, 
  TrendingUp, 
  Sparkles, 
  CheckCircle2,
  RefreshCw
} from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { DecisionBrief } from "@/components/theses/DecisionBrief";
import { DecisionTimeline } from "@/components/theses/DecisionTimeline";

const LOOP_STEPS = [
  { step: "01", name: "DISCOVER", desc: "Regime & orderflow anomaly detection" },
  { step: "02", name: "ANALYZE", desc: "Deterministic telemetry + indicators" },
  { step: "03", name: "DECISION BRIEF", desc: "Evidence for/against with provenance" },
  { step: "04", name: "COMMIT", desc: "Timestamped risk plan committed" },
  { step: "05", name: "MONITOR", desc: "5-minute windowed high/low checking" },
  { step: "06", name: "RESOLVE", desc: "Conservative target or stop resolution" },
  { step: "07", name: "GRADE", desc: "Attribution: process vs variance" },
  { step: "08", name: "LEARN", desc: "Empirical calibration curve update" },
];

export function DecisionLoop() {
  return (
    <section id="decision-intelligence" className="tc-section tc-section--wide scroll-mt-20 py-16 sm:py-24 border-t border-[var(--color-border-subtle)]">
      {/* Eyebrow and Headline */}
      <Reveal blur className="text-center space-y-3 mb-10 sm:mb-14 max-w-3xl mx-auto">
        <span className="tp-eyebrow-mono text-[var(--accent)] font-bold">
          THE FINANCIAL DECISION INTELLIGENCE SYSTEM
        </span>
        <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[var(--ink)]">
          Financial decisions, <span className="tp-serif-italic">measured.</span>
        </h2>
        <p className="text-sm sm:text-base text-[var(--muted)] leading-relaxed">
          TradeCoPilot is not another trading bot or generic AI assistant. It is a precision operating system that records what you knew, validates your plan, monitors execution against verified market extremes, and grades decision quality.
        </p>
      </Reveal>

      {/* The 8-Step Interactive Cycle Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-12">
        {LOOP_STEPS.map((s, idx) => (
          <div
            key={s.step}
            className="p-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--bg-band)]/60 hover:border-[var(--accent)]/40 transition-colors flex flex-col justify-between select-none"
          >
            <div>
              <span className="text-[10px] font-mono font-bold text-[var(--accent)] block mb-1">
                {s.step}
              </span>
              <span className="text-xs font-bold text-[var(--ink)] tracking-tight block">
                {s.name}
              </span>
            </div>
            <p className="text-[10px] text-[var(--muted)] mt-1 leading-snug">
              {s.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Real Product UI Showcase: Decision Brief + Decision Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: The Real Signature Decision Brief */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-mono font-semibold uppercase text-[var(--accent)] flex items-center gap-1.5">
              <Compass size={14} /> Signature Artifact: The Decision Brief
            </span>
            <span className="text-[10px] font-mono text-[var(--muted)]">
              Interactive Product UI
            </span>
          </div>

          <DecisionBrief
            symbol="BTC/USD"
            timeframe="4h"
            currentPrice={67420}
            bias="LONG"
            setupQuality="A+ SELECT"
            confidence="HIGH"
            confidenceScore={78}
            marketRegime="TRENDING_UP"
            entryZone={67420}
            target={70500}
            stopLoss={65800}
            invalidation={65800}
            riskReward={2.85}
            evidenceFor={[
              "RSI 61.4 momentum aligned",
              "EMA 20/50 bullish separation",
              "MTF 1d/4h trend confluence",
              "VWAP institutional support hold",
            ]}
            evidenceAgainst={[
              "Overhead resistance at $68,200",
              "Upcoming CPI macro volatility",
            ]}
            invalidationConditions="Thesis invalid on a 4h candle close below $65,800."
            aiSummary="High-conviction trend continuation following liquidity sweep above 4h dynamic EMA support."
            isCommitted={false}
          />
        </div>

        {/* Right: Decision Timeline & Calibration Preview */}
        <div className="lg:col-span-5 space-y-6">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-mono font-semibold uppercase text-[var(--accent)] flex items-center gap-1.5">
              <Clock size={14} /> Chronological Decision Life
            </span>
            <span className="text-[10px] font-mono text-[var(--muted)]">
              End-to-end Audit Trail
            </span>
          </div>

          <DecisionTimeline
            thesisData={{
              symbol: "BTC/USD",
              timeframe: "4h",
              bias: "LONG",
              entryZone: 67420,
              target: 70500,
              invalidation: 65800,
              status: "HIT",
              resolvedPrice: 70650,
              confidence: "HIGH",
              regimeAtCreation: "TRENDING_UP",
              regimeAtResolution: "TRENDING_UP",
              evidenceFor: ["RSI 61.4 aligned", "MTF confluence", "VWAP support hold"],
              evidenceAgainst: ["Macro event risk"],
              outcome: {
                result: "WIN",
                attribution: "GOOD_DECISION_GOOD_OUTCOME",
                whatILearned: "Patience on pullbacks to the 20-EMA produces maximum asymmetric R:R.",
              },
            }}
          />

          {/* Calibration Callout Box */}
          <div className="p-5 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--bg-band)]/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award size={15} className="text-[var(--accent)]" />
                <span className="text-xs font-bold text-[var(--ink)]">
                  The Calibration Moat
                </span>
              </div>
              <span className="text-[10px] font-mono text-[var(--green)] font-semibold border border-[var(--green)]/30 bg-[var(--green)]/10 px-1.5 py-0.2 rounded">
                WELL CALIBRATED
              </span>
            </div>
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              When TradeCoPilot asserts HIGH confidence, historical observations demonstrate a 75% target hit rate ($N=86$). We never guess — we measure.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
