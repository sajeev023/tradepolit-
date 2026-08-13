"use client";

/* ═══════════════════════════════════════════════════════════════════════
   instrument-data.ts — the honest instrument row (3.13).

   Pre-baked DETERMINISTIC demo sequence (constraint 14c). Zero network.
   No Math.random, no fabricated "live" feed: prices drift on fixed sine
   curves so the row feels alive while being fully reproducible. The row
   is explicitly labelled "For illustration" per 14(b).

   Cadence ≤1s (perf 4.5 / 3.13). 150ms amber flash on change (3.13).
   Session-state chips derived from the current UTC hour. The caller passes
   `active` (from a viewport observer) so the interval pauses off-screen.
   ═══════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import { TIMING } from "./motion";

export interface Instrument {
  sym: string;
  priceStr: string;
  /** increments on every value change — use as a React key to retrigger the flash */
  tick: number;
  dir: "up" | "down" | "flat";
}

export interface InstrumentRow {
  instruments: Instrument[];
  /** currently-open session labels, e.g. ["NY OPEN", "LONDON"] */
  sessions: string[];
  /** "As of HH:MM UTC · For illustration" */
  tag: string;
}

interface Seed {
  sym: string;
  base: number;
  amp: number; // drift amplitude
  freq: number; // radians per second
  phase: number;
  decimals: number;
}

const SEEDS: Seed[] = [
  { sym: "NQ", base: 20412.5, amp: 18, freq: 0.06, phase: 0.0, decimals: 1 },
  { sym: "BTC", base: 64250, amp: 45, freq: 0.04, phase: 1.2, decimals: 0 },
  { sym: "ETH", base: 3142, amp: 6, freq: 0.05, phase: 2.4, decimals: 1 },
  { sym: "ES", base: 4521.75, amp: 3.5, freq: 0.07, phase: 3.1, decimals: 1 },
  { sym: "EUR/USD", base: 1.0842, amp: 0.0009, freq: 0.03, phase: 0.6, decimals: 4 },
  { sym: "GBP/USD", base: 1.2715, amp: 0.0011, freq: 0.035, phase: 1.9, decimals: 4 },
];

function formatPrice(v: number, decimals: number): string {
  return v.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Sessions open at a given UTC hour (approximate, deterministic). */
function openSessions(utcHour: number): string[] {
  const out: string[] = [];
  // New York: 14:30–21:00 UTC (09:30–16:00 ET)
  if (utcHour >= 14 && utcHour < 21) out.push("NY OPEN");
  // London: 08:00–16:30 UTC
  if (utcHour >= 8 && utcHour < 17) out.push("LONDON");
  // Asia: 00:00–09:00 UTC; "ASIA CLOSE" in the last hour
  if (utcHour >= 8 && utcHour < 9) out.push("ASIA CLOSE");
  else if (utcHour >= 0 && utcHour < 8) out.push("ASIA");
  return out;
}

function tagFor(d: Date): string {
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `As of ${hh}:${mm} UTC · For illustration`;
}

function snapshot(elapsed: number): Instrument[] {
  return SEEDS.map((s) => {
    const v = s.base + s.amp * Math.sin(elapsed * s.freq + s.phase);
    return {
      sym: s.sym,
      priceStr: formatPrice(v, s.decimals),
      tick: 0,
      dir: "flat" as const,
    };
  });
}

/**
 * useInstrumentRow — deterministic, network-free instrument strip.
 * @param active when false the update interval is not scheduled (off-screen pause).
 */
export function useInstrumentRow(active: boolean): InstrumentRow {
  const [row, setRow] = useState<InstrumentRow>(() => ({
    instruments: snapshot(0).map((i) => ({ ...i, tick: 1 })),
    sessions: openSessions(new Date().getUTCHours()),
    tag: tagFor(new Date()),
  }));
  const prev = useRef<Instrument[]>(snapshot(0));

  useEffect(() => {
    if (!active) return;
    let n = 0;
    const update = () => {
      n += 1;
      const elapsed = n; // seconds
      const next = SEEDS.map((s, i) => {
        const v = s.base + s.amp * Math.sin(elapsed * s.freq + s.phase);
        const prevPrice = prev.current[i].priceStr;
        const priceStr = formatPrice(v, s.decimals);
        const changed = priceStr !== prevPrice;
        return {
          sym: s.sym,
          priceStr,
          tick: changed ? prev.current[i].tick + 1 : prev.current[i].tick,
          dir: (changed
            ? v > s.base + s.amp * Math.sin((elapsed - 1) * s.freq + s.phase)
              ? "up"
              : "down"
            : "flat") as "up" | "down" | "flat",
        };
      });
      prev.current = next;
      const now = new Date();
      setRow({
        instruments: next,
        sessions: openSessions(now.getUTCHours()),
        tag: tagFor(now),
      });
    };
    const iv = setInterval(update, TIMING.instrumentCadence);
    return () => clearInterval(iv);
  }, [active]);

  return row;
}