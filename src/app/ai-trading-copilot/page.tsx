import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bot } from "lucide-react";
import { SlimNav } from "@/components/landing/slim-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import {
  buildMetadata,
  breadcrumbJsonLd,
  faqPageJsonLd,
  type FaqItem,
} from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "What Is an AI Trading Copilot? Definition, Capabilities & Limits",
  description:
    "An AI trading copilot is software that uses AI to help you analyze markets and improve your own decisions — not to trade for you. How the category works, what it can and cannot do, and how TradCopilot implements it.",
  path: "/ai-trading-copilot",
  keywords: [
    "what is an ai trading copilot",
    "ai trading copilot",
    "ai trading assistant",
    "ai market analysis tool",
    "ai chart analysis",
  ],
});

const BREADCRUMBS = [{ name: "AI Trading Copilot", path: "/ai-trading-copilot" }];

const COPILOT_FAQS: FaqItem[] = [
  {
    question: "Does an AI trading copilot execute trades?",
    answer:
      "A copilot, by definition, should not. It analyzes, explains, journals, and warns while you keep full control of execution. TradCopilot in particular has no order placement anywhere in the product, holds no funds, and never connects to a brokerage or exchange account.",
  },
  {
    question: "How is an AI trading copilot different from a trading bot?",
    answer:
      "A bot automates decisions and places orders on your behalf. A copilot does the opposite: it improves the quality of your decisions — objective indicator readings, structured setup analysis, behavioral warnings — but the human stays the executor. One manages your capital; the other sharpens your judgment.",
  },
  {
    question: "How can AI help analyze trading setups?",
    answer:
      "Reliably, when the pipeline is built correctly: deterministic code computes indicators like RSI, MACD, EMA, ATR, and VWAP from live candles first, then language models turn those exact readings into a plain-language thesis with bias, entry, stop, target, and invalidation levels — validated for internal consistency before display. The AI explains the numbers; it must not invent them.",
  },
  {
    question: "Can an AI trading copilot predict where price will go?",
    answer:
      "No honest one will claim that. Markets are uncertain, and any system promising guaranteed predictions should be treated as a red flag. What a well-built copilot does is remove subjectivity from measurement — what the indicators actually say right now, whether the setup is internally consistent, and whether your current behavior matches your own rules.",
  },
];

export default function AiTradingCopilotPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--ink)] font-sans antialiased">
      <SlimNav />

      <main className="tc-section">
        <article className="max-w-[900px] mx-auto px-4 sm:px-6 space-y-12 sm:space-y-16">
          <JsonLd
            data={[
              breadcrumbJsonLd(BREADCRUMBS),
              faqPageJsonLd(COPILOT_FAQS),
            ]}
          />

          {/* ── Header ── */}
          <header className="space-y-4">
            <Breadcrumbs items={BREADCRUMBS} />
            <div className="flex items-center gap-2 text-[var(--accent)]">
              <Bot size={16} />
              <span className="tp-eyebrow-mono">CATEGORY GUIDE</span>
            </div>
            <h1 className="tp-display-xl text-3xl! sm:text-4xl! lg:text-5xl!">
              What is an <span className="tp-serif-italic">AI trading copilot?</span>
            </h1>
            <p className="tp-body max-w-2xl text-[15px] sm:text-[16px] leading-relaxed">
              An AI trading copilot is software that uses AI models to help you analyze
              markets and improve your own trading decisions — not to trade for you. It
              reads charts and market data, explains setups in plain language, keeps memory
              of your past sessions, and coaches discipline, while you keep full control of
              every order.
            </p>
          </header>

          <hr className="tc-rule" />

          {/* ── Definition ── */}
          <section className="space-y-5 max-w-[65ch]">
            <span className="tp-eyebrow-mono block">01 · DEFINITION</span>
            <h2 className="tp-h2">The category, precisely</h2>
            <p className="tp-body">
              The word &ldquo;copilot&rdquo; is doing real work here. Aviation copilots don&rsquo;t replace
              pilots — they monitor instruments, cross-check decisions, and speak up before
              mistakes become accidents. An AI trading copilot applies the same model to
              markets:
            </p>
            <ul className="space-y-2.5">
              {[
                "It measures objectively. Indicator values are computed from live candlestick data by deterministic code, so the readings don't depend on mood, fatigue, or hope.",
                "It explains in language. AI models translate raw numbers — RSI levels, MACD crossovers, volatility — into a written thesis: bias, setup quality, entry, stop-loss, target, and invalidation level.",
                "It remembers. Every logged trade becomes context, so future analyses reference your actual history instead of starting from zero each session.",
                "It guards behavior. Patterns like revenge-style re-entries or overtrading days get flagged against your own declared rules — before capital goes out.",
                "It executes nothing. You keep the order ticket, the broker relationship, and the responsibility.",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-[13px] sm:text-[14px] leading-relaxed text-[var(--muted)]"
                >
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <hr className="tc-rule" />

          {/* ── Copilot vs Bot vs Chatbot ── */}
          <section className="space-y-5 max-w-[65ch]">
            <span className="tp-eyebrow-mono block">02 · DISTINCTIONS</span>
            <h2 className="tp-h2">Copilot, bot, chatbot — three different tools</h2>
            <p className="tp-body">
              These terms get used interchangeably in marketing. They shouldn&rsquo;t be:
            </p>
            <div className="overflow-x-auto tc-card !p-0">
              <table className="w-full min-w-[560px] text-left border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--color-border-strong)]">
                    <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-[var(--muted)]">Type</th>
                    <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-[var(--muted)]">Decides</th>
                    <th className="px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-[var(--muted)]">Executes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[var(--color-border-subtle)]">
                    <td className="px-4 py-3 font-semibold text-[var(--ink)]">Trading bot</td>
                    <td className="px-4 py-3 text-[var(--muted)]">Algorithm decides and acts on rules you configured (or it invented)</td>
                    <td className="px-4 py-3 text-[var(--muted)]">Yes — places orders</td>
                  </tr>
                  <tr className="border-b border-[var(--color-border-subtle)]">
                    <td className="px-4 py-3 font-semibold text-[var(--ink)]">General AI chatbot</td>
                    <td className="px-4 py-3 text-[var(--muted)]">Answers whatever you paste, with no live data guarantee</td>
                    <td className="px-4 py-3 text-[var(--muted)]">No — but also can&apos;t verify what you showed it</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-[var(--accent)]">Trading copilot</td>
                    <td className="px-4 py-3 text-[var(--muted)]">You decide; it measures, explains, journals, and warns</td>
                    <td className="px-4 py-3 text-[var(--muted)]">No — read-only by design</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="tp-body">
              If a product both decides and executes, it&rsquo;s a bot — which brings automation risk,
              connectivity to your funds, and regulatory weight. If it neither verifies live
              data nor remembers you, it&rsquo;s a chatbot wrapper. The copilot category exists
              between those two: decision support with real data and persistent memory, minus
              execution.
            </p>
          </section>

          <hr className="tc-rule" />

          {/* ── How TradCopilot implements it ── */}
          <section className="space-y-5 max-w-[65ch]">
            <span className="tp-eyebrow-mono block">03 · IMPLEMENTATION</span>
            <h2 className="tp-h2">How TradCopilot builds this category</h2>
            <p className="tp-body">
              TradCopilot is a web-based, read-only AI trading copilot for crypto and forex
              day traders. Its pipeline makes one thing non-negotiable:{" "}
              <strong className="text-[var(--ink)]">deterministic code computes the market first; the AI only explains it.</strong>
            </p>
            <ol className="space-y-3 list-decimal list-inside text-[13px] sm:text-[14px] text-[var(--muted)] leading-relaxed">
              <li>
                Live OHLCV candles stream in for nine instruments — BTC/USD, ETH/USD, SOL/USD,
                EUR/USD, GBP/USD, USD/JPY, gold, NASDAQ, and S&P 500 — across timeframes from
                1 minute to 1 week.
              </li>
              <li>
                Server-side code computes RSI(14), MACD(12,26,9), EMA alignment (9/21/50),
                ATR(14), rolling VWAP, volume surge, swing support/resistance, and session
                context.
              </li>
              <li>
                Multiple AI providers (Groq, Google Gemini, NVIDIA-hosted, and OpenAI models)
                race in parallel; the first valid structured response wins.
              </li>
              <li>
                A consistency gate rejects outputs whose stop-loss side contradicts the bias
                or whose reward-to-risk doesn&rsquo;t clear roughly 1.5.
              </li>
              <li>
                The result arrives with telemetry — the exact price and timestamp analyzed —
                and data points tagged confirmed, estimated, or unverified.
              </li>
            </ol>
            <p className="tp-body">
              Around that core sit the copilot&rsquo;s other jobs: an automated session journal
              with emotion and mistake tagging, behavioral guardrails against revenge trading
              and overtrading, a leverage-aware position-size calculator, rule-based strategy
              backtesting, technical alerts, and a sentiment layer of news and market pulse.
              See the{" "}
              <Link href="/features" className="text-[var(--accent)] hover:underline">
                complete feature list
              </Link>{" "}
              for specifics.
            </p>
          </section>

          <hr className="tc-rule" />

          {/* ── Honest limits ── */}
          <section className="space-y-5 max-w-[65ch]">
            <span className="tp-eyebrow-mono block">04 · LIMITS</span>
            <h2 className="tp-h2">What an AI trading copilot cannot do</h2>
            <ul className="space-y-2.5">
              {[
                "Predict the future. No model knows where price goes next; anyone claiming certainty is selling something.",
                "Replace risk management. Position sizing and stop discipline remain the trader's job — tools can only compute and warn.",
                "Act without you. In a read-only copilot there is deliberately no path from analysis to order.",
                "Substitute financial advice. Output is educational analysis; TradCopilot is not a registered investment advisor or broker-dealer.",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-[13px] sm:text-[14px] leading-relaxed text-[var(--muted)]"
                >
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="tp-body text-[13px] text-[var(--muted)]">
              Trading involves substantial risk of loss. Read our{" "}
              <Link href="/disclaimer" className="text-[var(--accent)] hover:underline">full disclaimer</Link>.
            </p>
          </section>

          <hr className="tc-rule" />

          {/* ── FAQ ── */}
          <section className="space-y-4">
            <span className="tp-eyebrow-mono block">FAQ</span>
            <h2 className="tp-h2">Common questions about AI trading copilots</h2>
            <div>
              {COPILOT_FAQS.map((faq) => (
                <details
                  key={faq.question}
                  className="group tc-card !p-0 overflow-hidden"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 sm:px-6 sm:py-5">
                    <h3 className="text-[15px] sm:text-[16px] font-semibold text-[var(--ink)] leading-snug">
                      {faq.question}
                    </h3>
                    <span
                      aria-hidden
                      className="font-mono text-[var(--accent)] text-lg leading-none shrink-0"
                    >
                      <span className="group-open:hidden">+</span>
                      <span className="hidden group-open:inline">−</span>
                    </span>
                  </summary>
                  <p className="px-4 pb-4 sm:px-6 sm:pb-6 text-[13px] sm:text-[14px] text-[var(--muted)] leading-relaxed border-t border-[var(--color-border-subtle)] pt-3">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
            <p className="tp-body text-[13px] sm:text-[14px]">
              Product-specific questions — pricing, privacy, supported markets — are answered in the{" "}
              <Link href="/faq" className="text-[var(--accent)] hover:underline">full FAQ</Link>.
              Curious how the analysis differs from asking ChatGPT? See the{" "}
              <Link href="/compare/tradcopilot-vs-chatgpt" className="text-[var(--accent)] hover:underline">
                TradCopilot vs ChatGPT comparison
              </Link>.
            </p>
          </section>

          {/* ── CTA ── */}
          <section className="tc-terminal p-6 sm:p-10 text-center space-y-4">
            <span className="tp-eyebrow-mono block">SEE IT WORK</span>
            <h2 className="tp-h2">Run a copilot analysis on a live chart</h2>
            <p className="tp-body max-w-xl mx-auto text-[13px] sm:text-[14px]">
              The 15-minute demo needs no signup: 2 full AI analyses and 1 alert, end to end.
              Free accounts add the journal, watchlists, and 5 analyses a day.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              <Link href="/signup" className="btn-primary btn-lg">
                Start free — no card required
              </Link>
              <Link href="/ai-chart-analysis" className="btn-secondary btn-lg">
                How the analysis engine works <ArrowRight size={14} />
              </Link>
            </div>
          </section>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
