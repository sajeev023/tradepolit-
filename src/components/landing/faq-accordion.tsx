"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const faqs = [
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

export function FaqAccordion() {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="space-y-3 sm:space-y-4">
      {faqs.map((faq, idx) => {
        const isOpen = expanded === idx;
        return (
          <div
            key={idx}
            onClick={() => setExpanded(isOpen ? null : idx)}
            className="card p-4 sm:p-5 cursor-pointer"
          >
            <div className="flex items-center justify-between gap-4">
              <h4 className="text-sm font-medium text-[var(--color-text-primary)]">{faq.q}</h4>
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="shrink-0"
              >
                <ChevronDown size={16} style={{ color: "var(--color-text-tertiary)" }} />
              </motion.div>
            </div>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <p className="mt-3 text-xs text-[var(--color-text-tertiary)] leading-relaxed pt-2 border-t border-[var(--color-border-subtle)]">
                    {faq.a}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
