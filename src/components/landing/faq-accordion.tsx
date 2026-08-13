"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "Is this just ChatGPT with a chart skin?",
    a: "No. TradCopilot runs context-aware analysis on live candlestick data, real indicators, and your risk metrics — not a generic LLM prompt. It retains persistent memory of your trades, journal, and behavioral patterns across sessions, so the coaching is calibrated to you, not a stranger.",
  },
  {
    q: "Will it actually stop me from revenge trading, or just nag me?",
    a: "It flags revenge trades, sizing spikes, and overtrading inside the workspace before you deploy capital — using the pattern of your last 20 trades, not a generic rulebook. You stay in control; the copilot surfaces the pattern and blocks the entry pending your review. It won't execute anything for you.",
  },
  {
    q: "Do I have to connect my brokerage?",
    a: "Never. TradCopilot is read-only. You import watchlists, review indicators, log entries, and get coaching — without connecting any trading account or custodial balance. We can't touch your capital.",
  },
  {
    q: "Is the 'AI analysis' real or generated?",
    a: "Real. Every analysis is assembled from live exchange telemetry (Binance, TwelveData) — RSI, MACD, EMA, support/resistance, volume — then graded for bias, setup quality, and confidence. If a feed is ever unavailable, the UI labels it illustrative rather than pretending otherwise.",
  },
  {
    q: "What markets can I actually trade with it?",
    a: "Major crypto (BTC, ETH, SOL), forex (EUR/USD, GBP/USD), and indices. Equities and futures support is actively being expanded. You keep your existing charting platform; TradCopilot adds the analysis, journaling, and coaching layer on top.",
  },
  {
    q: "Can I cancel without a phone call?",
    a: "Yes. Cancel, pause, or adjust your plan from Settings in one click. No lock-in contracts, no retention call. The 7-day Pro trial is risk-free and requires no card to start the Free tier.",
  },
];

export function FaqAccordion() {
  const [expanded, setExpanded] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {faqs.map((faq, idx) => {
        const open = expanded === idx;
        return (
          <div
            key={idx}
            className="tc-card !p-0 overflow-hidden"
          >
            <button
              onClick={() => setExpanded(open ? null : idx)}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left cursor-pointer"
              aria-expanded={open}
            >
              <h4 className="text-[17px] sm:text-[18px] font-semibold text-[var(--ink)] leading-snug">
                {faq.q}
              </h4>
              <ChevronDown
                size={18}
                className={`shrink-0 text-[var(--muted)] transition-transform duration-300 ${
                  open ? "rotate-180 text-[var(--accent)]" : ""
                }`}
              />
            </button>
            <div
              className="grid transition-[grid-template-rows] duration-300 ease-out"
              style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-5 text-[14px] text-[var(--muted)] leading-relaxed">
                  {faq.a}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}