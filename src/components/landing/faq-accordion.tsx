"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

const faqs = [
  {
    q: "How does TradePilot analyze market data?",
    a: "TradePilot computes technical indicators directly from real-time exchange feeds (Binance & OANDA) and evaluates RSI, MACD divergence, EMA trend alignment, and structural support/resistance levels. Responses are grounded in your session history and calculated risk metrics.",
  },
  {
    q: "How does the behavioral discipline engine work?",
    a: "The terminal compares pending trade setups against your historical 20-trade journal patterns and declared risk rules. If a sizing spike, rapid re-entry, or revenge pattern is detected, the terminal displays an immediate risk alert before you deploy capital.",
  },
  {
    q: "Do I need to connect broker credentials or custody funds?",
    a: "No. TradePilot is strictly read-only. We do not connect to your exchange accounts, do not custody funds, and cannot execute orders. Your assets and keys remain solely under your control.",
  },
  {
    q: "Which markets and asset classes are supported?",
    a: "Major crypto pairs (BTC, ETH, SOL), major forex pairs (EUR/USD, GBP/USD), and global indices. You can use your primary broker or charting software alongside TradePilot.",
  },
  {
    q: "How does the 7-day Pro trial and cancellation work?",
    a: "You can start the Free tier with no credit card required. Pro subscriptions include a 7-day trial and can be paused or cancelled at any time directly in your account settings with a single click.",
  },
];

export function FaqAccordion() {
  const [expanded, setExpanded] = useState<number | null>(0);

  return (
    <div className="divide-y divide-[var(--hairline)] overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--panel-1)]">
      {faqs.map((faq, idx) => {
        const open = expanded === idx;
        return (
          <div key={idx}>
            <button
              onClick={() => setExpanded(open ? null : idx)}
              className="flex min-h-[56px] w-full cursor-pointer items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-[var(--panel-2)] sm:px-6"
              aria-expanded={open}
              aria-controls={`faq-panel-${idx}`}
            >
              <span className="font-mono text-[11px] tabular-nums text-[var(--color-text-quaternary)]">{String(idx + 1).padStart(2, "0")}</span>
              <h3 className="flex-1 text-[15px] font-medium leading-snug text-[var(--ink)] sm:text-[16.5px]">{faq.q}</h3>
              <Plus
                size={18}
                className={`shrink-0 transition-transform duration-300 ${open ? "rotate-45 text-[var(--accent)]" : "text-[var(--color-text-tertiary)]"}`}
              />
            </button>
            <div
              id={`faq-panel-${idx}`}
              role="region"
              className="grid transition-[grid-template-rows] duration-300 ease-out"
              style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <p className="px-4 pb-5 pl-[52px] text-[13.5px] leading-[1.7] text-[var(--color-text-secondary)] sm:pl-[68px] sm:pr-10 sm:text-[14.5px]">
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
