"use client";

import { useInstrumentRow } from "./instrument-data";
import { useInViewLive } from "./motion";

/* ═══════════════════════════════════════════════════════════════════════
   InstrumentRow (3.13) — the honest instrument strip.

   Replaces the decorative duplicate-row ticker marquee (exclusion 3.16l).
   One row, six instruments, tabular-nums mono, ≤1s cadence, 150ms amber
   flash on change, session-state chips, and the "As of HH:MM UTC · For
   illustration" tag at the end. data-zone → crosshair cursor (3.15).
   Pauses off-screen (perf 4.2). Mobile → 2-column grid (5.2).
   ═══════════════════════════════════════════════════════════════════════ */

export function InstrumentRow() {
  const [ref, active] = useInViewLive<HTMLDivElement>({ rootMargin: "200px 0px" });
  const row = useInstrumentRow(active);

  return (
    <div ref={ref} className="v2-zone w-full">
      <div
        className="v2-card-flat v2-instrument-grid grid grid-cols-2 gap-px overflow-hidden md:grid-cols-6 md:gap-0"
        style={{ background: "var(--hairline)" }}
      >
        {row.instruments.map((inst) => (
          <div
            key={inst.sym}
            className="flex items-baseline gap-2 px-4 py-3"
            style={{ background: "var(--bg-surface-1)" }}
          >
            <span className="v2-mono text-[11px] v2-muted">{inst.sym}</span>
            <span
              key={inst.tick}
              className={`v2-mono v2-flash text-[13px] v2-data ${inst.dir === "up" ? "" : ""}`}
            >
              {inst.priceStr}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {row.sessions.map((s) => (
            <span key={s} className="v2-chip">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--text-secondary)" }}
              />
              {s}
            </span>
          ))}
        </div>
        <span className="v2-mono text-[10px] v2-muted">{row.tag}</span>
      </div>
    </div>
  );
}