"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Sparkles, X } from "lucide-react";
import { useUIStore } from "@/lib/stores/ui-store";
import { titleForPath } from "./nav-config";

interface DockMessage {
  role: "user" | "assistant";
  content: string;
}

interface DockContext {
  /** Short human label shown in the "Reading" chip. */
  reading: string;
  symbol?: string;
  timeframe?: string;
  prompts: string[];
}

/** Context is derived from the route + the chart defaults the Charts page already persists. */
function useDockContext(pathname: string): DockContext {
  return useMemo(() => {
    let symbol: string | undefined;
    let timeframe: string | undefined;
    try {
      symbol = localStorage.getItem("TradCopilot-default-symbol") || undefined;
      timeframe = localStorage.getItem("TradCopilot-default-timeframe") || undefined;
    } catch {
      /* storage unavailable — context simply omits chart defaults */
    }
    if (pathname.startsWith("/charts")) {
      const s = symbol || "BTC/USD";
      return {
        reading: `${s} · ${timeframe || "4h"} chart`,
        symbol: s,
        timeframe: timeframe || "4h",
        prompts: [
          `What matters most on ${s} right now?`,
          "Where are the nearest support and resistance levels?",
          "What would invalidate a long here?",
        ],
      };
    }
    if (pathname.startsWith("/journal")) {
      return {
        reading: "Your trade journal",
        prompts: ["Analyze my most recent losing trade.", "Which of my setups is most consistent?", "What is my biggest behavioral mistake?"],
      };
    }
    if (pathname.startsWith("/risk-calculator")) {
      return {
        reading: "Risk calculator",
        prompts: ["How can I improve my risk management?", "How should I think about position size on a 1% risk?", "Is my risk-to-reward realistic?"],
      };
    }
    if (pathname.startsWith("/theses")) {
      return {
        reading: "Your theses",
        prompts: ["How well do my past theses hold up?", "What makes a good invalidation level?", "Review my win rate consistency."],
      };
    }
    return {
      reading: `${titleForPath(pathname)} · your trading history`,
      prompts: ["Summarize how my trading has been going.", "What is my biggest behavioral mistake?", "Review my win rate consistency."],
    };
  }, [pathname]);
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1" aria-label="Copilot is thinking">
      <span className="thinking-dot" /><span className="thinking-dot" /><span className="thinking-dot" />
    </span>
  );
}

export function CopilotDock() {
  const pathname = usePathname();
  const { copilotOpen, setCopilotOpen, copilotSeed } = useUIStore();
  const ctx = useDockContext(pathname);
  const [messages, setMessages] = useState<DockMessage[]>([]);
  const [chatId, setChatId] = useState<string | undefined>();
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || pending) return;
      setError(null);
      setDraft("");
      setMessages((m) => [...m, { role: "user", content: message }]);
      setPending(true);
      try {
        const res = await fetch("/api/v1/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatId, message, symbol: ctx.symbol, timeframe: ctx.timeframe }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error?.message || "Copilot couldn't answer that.");
        if (body.data?.chat?.id) setChatId(body.data.chat.id);
        setMessages((m) => [...m, { role: "assistant", content: String(body.data?.reply ?? "") }]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Copilot couldn't answer that.");
      } finally {
        setPending(false);
      }
    },
    [chatId, ctx.symbol, ctx.timeframe, pending],
  );

  // A prompt queued by another surface (askCopilot) is sent once when the dock opens.
  useEffect(() => {
    if (copilotOpen && copilotSeed) {
      useUIStore.setState({ copilotSeed: null });
      void send(copilotSeed);
    }
  }, [copilotOpen, copilotSeed, send]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  useEffect(() => {
    if (copilotOpen) inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && copilotOpen && setCopilotOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [copilotOpen, setCopilotOpen]);

  const newThread = () => {
    setMessages([]);
    setChatId(undefined);
    setError(null);
  };

  return (
    <AnimatePresence>
      {copilotOpen && (
        <>
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] bg-black/50 lg:bg-transparent"
            onClick={() => setCopilotOpen(false)}
          />
          <motion.aside
            key="dock"
            role="dialog"
            aria-label="Copilot"
            initial={{ x: "100%", opacity: 0.6 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.6 }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="fixed bottom-0 right-0 z-[60] flex w-full flex-col border-l max-lg:top-[12dvh] max-lg:rounded-t-2xl max-lg:border-t lg:top-[calc(var(--spacing-demo-banner)+var(--spacing-topbar))] lg:w-[420px]"
            style={{
              background: "var(--panel-1)",
              borderColor: "var(--color-border-strong)",
              boxShadow: "-30px 0 60px -30px rgba(0,0,0,0.7)",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",            }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b px-4 py-3" style={{ borderColor: "var(--hairline)" }}>
              <span className="flex h-7 w-7 items-center justify-center rounded-md" style={{ background: "rgba(var(--accent-rgb),0.12)", color: "var(--accent)" }}>
                <Sparkles size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold leading-tight text-[var(--color-text-primary)]">Copilot</p>
                <p className="flex items-center gap-1.5 truncate font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--color-text-quaternary)]">
                  <span className="live-dot" style={{ width: 5, height: 5 }} />
                  Reading · {ctx.reading}
                </p>
              </div>
              {messages.length > 0 && (
                <button onClick={newThread} className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]">
                  New
                </button>
              )}
              <button onClick={() => setCopilotOpen(false)} className="icon-button" aria-label="Close Copilot">
                <X size={16} />
              </button>
            </div>

            {/* Thread */}
            <div ref={scrollRef} className="custom-scrollbar flex-1 space-y-5 overflow-y-auto px-4 py-5" data-lenis-prevent>
              {messages.length === 0 && !pending ? (
                <div className="animate-enter">
                  <h2 className="font-serif text-[30px] leading-[1.05] tracking-[-0.01em] text-[var(--color-text-primary)]">
                    What should we <em className="text-[var(--accent)]">look at?</em>
                  </h2>
                  <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-text-tertiary)]">
                    I read your journal, theses and the chart you have open. Ask me anything about them.
                  </p>
                  <div className="mt-5 flex flex-col gap-2">
                    {ctx.prompts.map((p, i) => (
                      <button
                        key={p}
                        onClick={() => send(p)}
                        className="group flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-3 text-left text-[13px] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
                        style={{ borderColor: "var(--hairline)", background: "var(--panel-2)", animation: `enter 0.4s var(--ease-out-expo) ${60 * i}ms both` }}
                      >
                        <span className="flex-1">{p}</span>
                        <ArrowUp size={14} className="rotate-45 text-[var(--color-text-quaternary)] transition-colors group-hover:text-[var(--accent)]" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m, i) =>
                  m.role === "user" ? (
                    <div key={i} className="animate-message-in ml-8 rounded-xl rounded-br-sm px-3.5 py-2.5 text-[13px] leading-relaxed text-[var(--color-text-primary)]" style={{ background: "var(--panel-3)" }}>
                      {m.content}
                    </div>
                  ) : (
                    <div key={i} className="animate-message-in relative border-l-2 pl-3.5 text-[13px] leading-[1.65] text-[var(--color-text-secondary)]" style={{ borderColor: "var(--accent)" }}>
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    </div>
                  ),
                )
              )}
              {pending && (
                <div className="border-l-2 pl-3.5" style={{ borderColor: "rgba(var(--accent-rgb),0.4)" }}>
                  <ThinkingDots />
                </div>
              )}
              {error && (
                <div role="alert" className="rounded-lg border px-3.5 py-2.5 text-[12px]" style={{ borderColor: "rgba(var(--red-rgb),0.3)", background: "var(--color-loss-bg)", color: "var(--color-loss)" }}>
                  {error}
                </div>
              )}
            </div>

            {/* Composer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send(draft);
              }}
              className="border-t p-3"
              style={{ borderColor: "var(--hairline)" }}
            >
              <div className="flex items-end gap-2 rounded-xl border p-1.5 focus-within:border-[rgba(var(--accent-rgb),0.5)]" style={{ background: "var(--panel-2)", borderColor: "var(--color-border-default)" }}>
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send(draft);
                    }
                  }}
                  rows={1}
                  maxLength={2000}
                  style={{ outline: "none" }}
                  placeholder="Ask Copilot anything…"
                  className="max-h-28 min-h-[36px] flex-1 resize-none bg-transparent px-2.5 py-2 text-[13px] text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-quaternary)]"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || pending}
                  aria-label="Send"
                  className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-all active:scale-90 disabled:cursor-not-allowed disabled:opacity-30"
                  style={{ background: "var(--accent)", color: "var(--on-accent)" }}
                >
                  <ArrowUp size={16} strokeWidth={2.4} />
                </button>
              </div>
              <p className="mt-2 px-1 font-mono text-[9.5px] uppercase tracking-[0.06em] text-[var(--color-text-quaternary)]">
                Educational analysis · not financial advice<span className="max-lg:hidden"> · ⌘J to toggle</span>
              </p>
            </form>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
