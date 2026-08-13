"use client";

/* ═══════════════════════════════════════════════════════════════════════
   BuildLog (SEC 06) — the founder story, retold as mono-timestamped journal
   entries that read like trading-journal rows. A hairline left rail ties the
   entries into a single log. Below: a 4-up changelog strip (3.14) that fades
   up once on first scroll-into-view, then sits static.

   Color law: this is a market-actor section. No amber is used here — the
   journal entries carry a NEUTRAL hairline left accent, not amber. Cast
   kind="market".
   ═══════════════════════════════════════════════════════════════════════ */

import { Cast, Reveal, TIMING } from "./motion";

/* ── Journal entries (mono-timestamped, neutral hairline rail) ── */
const ENTRIES: { ts: string; body: string }[] = [
  { ts: "2026-02-11 03:40", body: "couldn't hold discipline for the 11th day. started building." },
  { ts: "06 hours later", body: "first MVP. ugly, but it read a chart and wrote a note." },
  { ts: "2026-04", body: "40 traders tore it apart. every bug became a feature request." },
  { ts: "2026-08", body: "every feature came from a real trader's complaint. none from a roadmap." },
];

/* ── Changelog strip (3.14): dated, mono, static after first reveal ── */
const CHANGELOG: { date: string; text: string }[] = [
  { date: "Jul 30", text: "behavioral flag latency cut 40%" },
  { date: "Jul 16", text: "circuit-breaker v2" },
  { date: "Jul 02", text: "journal memory doubled" },
  { date: "Jun 18", text: "first 100 traders" },
];

export function BuildLog() {
  return (
    <section
      id="build-log"
      className="v2-section v2-aurora v2-aurora-market v2-fold"
    >
      <Cast kind="market">
        <div className="v2-shell">
          {/* Eyebrow + headline */}
          <Reveal>
            <p className="v2-eyebrow mb-4">SPEC 06 / THE BUILD LOG</p>
            <h2 className="v2-h2 mb-6 max-w-3xl">
              Built from an 11-day losing streak, not a trend.
            </h2>
          </Reveal>

          <div className="v2-ts mb-10" aria-hidden="true">
            <span>09:34 EDT</span>
          </div>

          {/* Journal entries — vertical list with a hairline left rail */}
          <div className="relative pl-6 md:pl-8">
            {/* the rail itself */}
            <div
              className="absolute left-0 top-0 bottom-0 hidden sm:block"
              style={{ width: "1px", background: "var(--hairline)" }}
              aria-hidden="true"
            />
            <ol className="flex flex-col gap-5">
              {ENTRIES.map((e, i) => (
                <Reveal key={e.ts} delay={i * TIMING.revealStagger}>
                  <li className="v2-card-flat relative">
                    {/* neutral left border accent — NOT amber */}
                    <div
                      className="absolute left-0 top-0 bottom-0"
                      style={{
                        width: "2px",
                        background: "var(--hairline)",
                      }}
                      aria-hidden="true"
                    />
                    <div className="px-5 py-4">
                      <p className="v2-mono text-[11px] v2-muted mb-1.5">
                        {e.ts}
                      </p>
                      <p className="v2-body text-[13px] leading-relaxed v2-fg">
                        {e.body}
                      </p>
                    </div>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>

          {/* Founder note */}
          <Reveal delay={ENTRIES.length * TIMING.revealStagger}>
            <p className="v2-body text-[13px] v2-muted italic mt-8 max-w-2xl">
              Two of us. One trades every day, one builds. Every line of code
              answers a complaint from a real trader — not a template.
            </p>
          </Reveal>

          {/* Changelog strip (3.14) */}
          <div className="mt-14">
            <Reveal>
              <p className="v2-eyebrow mb-4">CHANGELOG</p>
            </Reveal>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {CHANGELOG.map((c, i) => (
                <Reveal key={c.date} delay={i * TIMING.changelog}>
                  <div className="v2-card-flat p-4">
                    <p className="v2-mono text-[11px] v2-muted mb-1.5">
                      {c.date}
                    </p>
                    <p className="v2-mono text-[12px] v2-data leading-snug">
                      {c.text}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

        </div>
      </Cast>
    </section>
  );
}