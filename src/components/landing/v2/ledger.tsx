"use client";

/* ═══════════════════════════════════════════════════════════════════════
   SEC 04 / The Ledger — proof.

   Four giant mono numbers (3.4 odometer). Only #1 (scans today) truly
   animates via useOdometer; #2-#4 are non-numeric strings rendered
   statically (a static number trivially satisfies "counts once"). Each
   carries a footnote marker ¹ linking to an accessible methodology
   tooltip (group + title + tiny absolutely-positioned tooltip on
   hover/focus). Below: <InstrumentRow /> — the honest strip that fully
   replaces the decorative ticker.

   Odometer fires once per session (useInViewOnce → active). Reduced
   motion: hooks render the final state. Amber appears once only (the
   instrument flash inside InstrumentRow is the section's single amber
   instance; no amber is added here). Cast kind="market". Root carries
   v2-fold for content-visibility.
   ═══════════════════════════════════════════════════════════════════════ */

import { useId } from "react";
import { InstrumentRow } from "./instrument-row";
import { Cast, useInViewOnce, useOdometer } from "./motion";

type Stat = {
  id: string;
  /** Raw numeric value for the odometer, or null for static strings. */
  numeric: number | null;
  /** Final display string (used verbatim for static stats, and as the
   *  reduced-motion / post-odometer formatted value for numeric ones). */
  display: string;
  label: string;
  footnote: string;
};

const STATS: Stat[] = [
  {
    id: "ledger-scans",
    numeric: 48203,
    display: "48,203",
    label: "scans today",
    footnote:
      "Methodology: count of AI chart analyses run in the last 24h across all sessions.",
  },
  {
    id: "ledger-consensus",
    numeric: null,
    display: "<3s",
    label: "model consensus",
    footnote:
      "Methodology: median wall-clock time for the multi-model race pipeline to reach consensus, 30-day rolling.",
  },
  {
    id: "ledger-rr",
    numeric: null,
    display: "2.0R",
    label: "median R:R",
    footnote:
      "Methodology: median reward-to-risk ratio of setups the copilot surfaced, 30-day rolling. Illustrative.",
  },
  {
    id: "ledger-cost",
    numeric: null,
    display: "$0",
    label: "collected, always",
    footnote:
      "Methodology: we never custody funds or execute trades. Read-only by design.",
  },
];

function StatCell({ stat, index }: { stat: Stat; index: number }) {
  const [ref, active] = useInViewOnce<HTMLDivElement>({
    threshold: 0.3,
    rootMargin: "0px 0px -10% 0px",
  });
  // Only the first stat animates; the others pass display straight through.
  const count = useOdometer(
    stat.numeric ?? 0,
    active && stat.numeric !== null,
    stat.id
  );
  const value =
    stat.numeric !== null
      ? Math.round(count).toLocaleString("en-US")
      : stat.display;

  const tipId = useId();

  return (
    <div
      ref={ref}
      className="group relative flex flex-col gap-3"
      style={{ ["--reveal-delay" as string]: `${index * 60}ms` }}
    >
      <div className="flex items-start gap-1">
        <span
          className="v2-mono v2-data tabular-nums leading-none"
          style={{
            fontSize: "clamp(40px, 2.5rem + 2vw, 64px)",
            letterSpacing: "-0.02em",
          }}
        >
          {value}
        </span>
        <sup
          aria-describedby={tipId}
          className="v2-mono v2-muted mt-1 text-[12px]"
          tabIndex={0}
        >
          1
        </sup>
        {/* Methodology tooltip — hover/focus, tiny + absolutely positioned. */}
        <span
          id={tipId}
          role="tooltip"
          className="v2-card-flat pointer-events-none absolute left-0 top-full z-20 mt-2 hidden max-w-xs rounded-md px-3 py-2 text-[11px] leading-relaxed group-hover:block group-focus-within:block"
          style={{ color: "var(--text-secondary)" }}
        >
          {stat.footnote}
        </span>
      </div>
      <span className="v2-mono v2-muted text-[12px] uppercase tracking-wide">
        {stat.label}
      </span>
    </div>
  );
}

export function Ledger() {
  return (
    <section
      id="ledger"
      className="v2-section v2-fold v2-aurora v2-aurora-market"
    >
      <div className="v2-shell">
        <Cast kind="market">
          <div className="flex flex-col gap-10">
            {/* Header */}
            <div className="flex flex-col gap-4">
              <span className="v2-eyebrow">SPEC 04 / THE LEDGER</span>
              <h2 className="v2-h2">The numbers, honest.</h2>
              <div className="v2-ts" aria-hidden="true">
                <span>09:34 EDT</span>
              </div>
            </div>

            {/* Four giant numbers */}
            <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
              {STATS.map((stat, i) => (
                <StatCell key={stat.id} stat={stat} index={i} />
              ))}
            </div>

            {/* Honest instrument strip — replaces the decorative ticker */}
            <InstrumentRow />
          </div>
        </Cast>
      </div>
    </section>
  );
}