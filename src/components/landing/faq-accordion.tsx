"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "How does TradCopilot analyze market data?",
    a: "TradCopilot computes technical indicators directly from real-time exchange feeds (Binance & OANDA) and evaluates RSI, MACD divergence, EMA trend alignment, and structural support/resistance levels. Responses are grounded in your session history and calculated risk metrics.",
  },
  {
    q: "How does the behavioral discipline engine work?",
    a: "The terminal compares pending trade setups against your historical 20-trade journal patterns and declared risk rules. If a sizing spike, rapid re-entry, or revenge pattern is detected, the terminal displays an immediate risk alert before you deploy capital.",
  },
  {
    q: "Do I need to connect broker credentials or custody funds?",
    a: "No. TradCopilot is strictly read-only. We do not connect to your exchange accounts, do not custody funds, and cannot execute orders. Your assets and keys remain solely under your control.",
  },
  {
    q: "Which markets and asset classes are supported?",
    a: "Major crypto pairs (BTC, ETH, SOL), major forex pairs (EUR/USD, GBP/USD), and global indices. You can use your primary broker or charting software alongside TradCopilot.",
  },
  {
    q: "How does the 7-day Pro trial and cancellation work?",
    a: "You can start the Free tier with no credit card required. Pro subscriptions include a 7-day trial and can be paused or cancelled at any time directly in your account settings with a single click.",
  },
];

export function FaqAccordion() {
  const [expanded, setExpanded] = useState<number | null>(0);

  return (
    <div className="space-y-2 sm:space-y-3">
      {faqs.map((faq, idx) => {
        const open = expanded === idx;
        return (
          <div
            key={idx}
            className="tc-card !p-0 overflow-hidden"
          >
            <button
              onClick={() => setExpanded(open ? null : idx)}
              className="w-full flex items-center justify-between gap-3 px-3.5 py-3 sm:px-5 sm:py-4 text-left cursor-pointer"
              aria-expanded={open}
            >
              <h3 className="text-[14px] sm:text-[17px] font-semibold text-[var(--ink)] leading-snug">
                {faq.q}
              </h3>
              <ChevronDown
                size={16}
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
                <p className="px-3.5 pb-3.5 sm:px-5 sm:pb-5 text-[12px] sm:text-[14px] text-[var(--muted)] leading-relaxed">
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