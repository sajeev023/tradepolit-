"use client";

/* ═══════════════════════════════════════════════════════════════════════
   SEC 07 — The Prospectus (trust)
   How the copilot decides (static AI decision tree, one typewriter pass),
   what it cannot do (Cash App style asterisked disclaimers), the read-only
   architecture diagram, and the FAQ accordion (real content preserved).
   AI section: violet cast, violet caret. No amber. No glow.
   ═══════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Cast, useInViewOnce, useTypewriter, usePrefersReducedMotion, TIMING } from "./motion";

/* ── Part A: the decision tree (static after one typewriter pass) ── */
const DECISION_TREE = `entry logic
  └─ symbol selected → load OHLCV + indicators
  └─ confluence gates
     ├─ RSI in range? + trend alignment? + volume confirms?
     └─ ≥2 of 3 required to proceed
  └─ risk sizing
     └─ account % → stop distance → position size
  └─ behavioral flags
     └─ revenge / overtrading / sizing-anomaly checks vs last 20 trades`;

/* ── Part B: what it cannot do ── */
const CANNOT = [
  "Cannot predict news spikes.*",
  "No guarantees on outcomes.*",
  "Not financial advice.*",
];

/* ── Part D: FAQ content (verbatim, preserved) ── */
const FAQ = [
  {
    q: "How is TradCopilot different from ChatGPT?",
    a: "TradCopilot runs context-aware analysis on live candlestick data, indicators, and risk metrics. Unlike general LLMs, it retains persistent memory of your trades, journals, and behavioral patterns across sessions.",
  },
  {
    q: "Do I need to connect my brokerage?",
    a: "No. TradCopilot operates as a standalone copilot. You import watchlists, review indicators, log entries, and receive real-time psychology coaching — all without connecting any trading account.",
  },
  {
    q: "What markets do you support?",
    a: "All major cryptocurrencies (BTC, ETH, SOL), Forex pairs (EUR/USD, GBP/USD), and indices. Equities and futures support is actively being expanded.",
  },
  {
    q: "Is there a free trial for Pro?",
    a: "Yes — a 7-day free trial on the Pro plan gives you unlimited analyses, alerts, weekly reports, and behavioral detection risk-free.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Absolutely. Cancel, pause, or adjust your plan from Settings with a single click. No lock-in contracts.",
  },
  {
    q: "How does behavioral detection work?",
    a: "The system monitors trade velocity, loss ratios, sizing errors, and drawdown patterns. If it detects overtrading or revenge trading, it alerts you inside the copilot panel before you deploy capital.",
  },
];

function FaqItem({
  index,
  open,
  onToggle,
  q,
  a,
}: {
  index: number;
  open: boolean;
  onToggle: (i: number) => void;
  q: string;
  a: string;
}) {
  const reduced = usePrefersReducedMotion();
  return (
    <div className="v2-card-flat">
      <button
        type="button"
        onClick={() => onToggle(index)}
        aria-expanded={open}
        aria-controls={`prospectus-faq-${index}`}
        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
      >
        <span className="v2-body text-[14px] v2-fg">{q}</span>
        <ChevronDown
          size={16}
          className="shrink-0 v2-muted transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      {/* Transform/opacity only (no height tween — perf 4.1). The content
          fades + lifts in; layout closes when the exit completes. Under
          reduced motion it appears/disappears with no transition. */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={`prospectus-faq-${index}`}
            key="content"
            initial={reduced ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -8 }}
            transition={
              reduced
                ? { duration: 0 }
                : { duration: TIMING.toggle / 1000, ease: "easeInOut" }
            }
            className="overflow-hidden"
          >
            <p className="v2-body v2-muted px-4 pb-4 text-[13px] leading-relaxed">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Prospectus() {
  const [treeRef, treeInView] = useInViewOnce<HTMLDivElement>({ threshold: 0.2 });
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const typed = useTypewriter(DECISION_TREE, treeInView, "prospectus-tree");
  const treeDone = typed.length === DECISION_TREE.length;

  const toggleFaq = (i: number) =>
    setOpenFaq((prev) => (prev === i ? null : i));

  return (
    <section
      id="prospectus"
      className="v2-section v2-fold v2-aurora v2-aurora-ai"
    >
      <Cast kind="ai">
        <div className="v2-shell">
          {/* Header */}
          <div className="v2-eyebrow v2-muted">SPEC 07 / THE PROSPECTUS</div>
          <h2 className="v2-h2 mt-3 v2-fg">
            How the copilot decides — and what it can&apos;t.
          </h2>
          <div className="v2-ts mt-6" aria-hidden="true">
            <span>09:34 EDT</span>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
            {/* PART A — decision tree */}
            <div className="flex flex-col gap-4">
              <div className="v2-eyebrow v2-muted">A · HOW THE COPILOT DECIDES</div>
              <div
                ref={treeRef}
                className="v2-card-flat v2-zone data-zone relative overflow-hidden"
              >
                <pre
                  className="v2-mono v2-data whitespace-pre-wrap p-4 text-[12px] leading-[1.55]"
                  aria-label="Copilot decision logic"
                >
                  {typed}
                  <span className="v2-caret" aria-hidden="true">
                    {" "}
                  </span>
                </pre>
              </div>
              <p className="v2-mono v2-muted text-[10px]">
                {treeDone ? "stream · idle" : "stream · live"}
              </p>
            </div>

            {/* PART B — what it cannot do */}
            <div className="flex flex-col gap-4">
              <div className="v2-eyebrow v2-muted">B · WHAT IT CANNOT DO</div>
              <ul className="flex flex-col gap-2.5">
                {CANNOT.map((line) => (
                  <li key={line} className="v2-body text-[13px] v2-fg">
                    {line}
                  </li>
                ))}
              </ul>
              <p className="v2-mono v2-muted text-[10px] leading-relaxed">
                * Markets carry risk. The copilot observes and surfaces; you
                decide and execute.
              </p>

              {/* PART C — read-only architecture diagram */}
              <div className="v2-eyebrow v2-muted mt-2">C · READ-ONLY ARCHITECTURE</div>
              <div className="v2-card-flat">
                <pre
                  className="v2-mono v2-data whitespace-pre-wrap p-4 text-[11px] leading-[1.55]"
                  aria-label="Read-only data flow"
                >
                  {"Binance WS → indicators → bias engine → you"}
                </pre>
                <div
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 pb-4 v2-mono text-[11px] v2-muted"
                >
                  <span className="v2-diff-minus">✗ no broker link</span>
                  <span className="v2-diff-minus">✗ no fund access</span>
                  <span className="v2-diff-minus">✗ no execution</span>
                </div>
              </div>
            </div>
          </div>

          {/* PART D — FAQ accordion */}
          <div className="mt-14 flex flex-col gap-4">
            <div className="v2-eyebrow v2-muted">D · FREQUENTLY ASKED</div>
            <div className="flex flex-col gap-2">
              {FAQ.map((item, i) => (
                <FaqItem
                  key={item.q}
                  index={i}
                  open={openFaq === i}
                  onToggle={toggleFaq}
                  q={item.q}
                  a={item.a}
                />
              ))}
            </div>
          </div>
        </div>
      </Cast>
    </section>
  );
}