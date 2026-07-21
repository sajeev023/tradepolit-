"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "How is TradePilot different from ChatGPT?",
    a: "TradePilot runs context-aware analysis on live candlestick data, indicators, and risk metrics. Unlike general LLMs, it retains persistent memory of your trades, journals, and behavioral patterns across sessions.",
  },
  {
    q: "Do I need to connect my brokerage?",
    a: "No. TradePilot operates as a standalone copilot. You import watchlists, review indicators, log entries, and receive real-time psychology coaching — all without connecting any trading account.",
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

export function FaqAccordion() {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="space-y-3 sm:space-y-4">
      {faqs.map((faq, idx) => (
        <div
          key={idx}
          onClick={() => setExpanded(expanded === idx ? null : idx)}
          className="p-4 sm:p-5 rounded-xl border border-border bg-card/65 backdrop-blur-md cursor-pointer transition-colors hover:border-accent/40 shadow-sm"
        >
          <div className="flex items-center justify-between gap-4">
            <h4 className="text-sm font-medium text-foreground">{faq.q}</h4>
            <ChevronDown
              size={16}
              className={`text-muted-foreground transition-transform duration-300 shrink-0 ${
                expanded === idx ? "rotate-180" : ""
              }`}
            />
          </div>
          {expanded === idx && (
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed pt-2 border-t border-border">
              {faq.a}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
