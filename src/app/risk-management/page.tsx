import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SlimNav } from "@/components/landing/slim-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata, faqPageJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { FAQS } from "@/lib/faq-data";

export const metadata: Metadata = buildMetadata({
  title: "Risk Management Tools — Position Sizing & Behavioral Guardrails",
  description:
    "A leverage-aware position size calculator with forex lot outputs, plus behavioral warnings for revenge trading and overtrading. Read-only — it warns, never blocks.",
  path: "/risk-management",
  keywords: [
    "position size calculator",
    "trading risk management",
    "revenge trading",
    "overtrading",
    "risk reward ratio",
  ],
});

const BREADCRUMBS = [
  { name: "Features", path: "/features" },
  { name: "Risk Management", path: "/risk-management" },
];

const RISK_FAQS = FAQS.filter((faq) =>
  [
    "How does the behavioral discipline engine work?",
    "Do I need to connect my broker or share exchange keys?",
    "Does TradCopilot execute trades or give financial advice?",
  ].includes(faq.question),
);

/** Illustrative worked example rows — arithmetic checked, clearly labeled as an example. */
const EXAMPLE_ROWS: Array<[string, string]> = [
  ["Account balance", "$5,000"],
  ["Risk per trade", "1% — $50 maximum loss"],
  ["Direction · entry", "Long BTC/USD at $60,000"],
  ["Stop-loss", "$59,800 — $200 below entry"],
  ["Position size", "$50 ÷ $200 = 0.25 BTC"],
  ["Notional exposure", "$15,000"],
  ["Margin at 5× leverage", "$3,000"],
  ["Target at $60,600", "+$600 move — a 3:1 setup (3R)"],
];

const RELATED_LINKS = [
  {
    href: "/guides/position-sizing-guide",
    label: "The complete position sizing guide",
    desc: "Fixed-fractional sizing, leverage, and lot math in depth.",
  },
  {
    href: "/guides/trading-discipline",
    label: "The trading discipline guide",
    desc: "Why process rules beat willpower, and how to audit your own.",
  },
  {
    href: "/trading-journal",
    label: "The trade journal",
    desc: "Every trade logged with emotions and mistake tags — the fuel for the guardrails.",
  },
  {
    href: "/ai-chart-analysis",
    label: "AI chart analysis",
    desc: "Structured setups with entry, stop, target, and invalidation ideas.",
  },
];

export default function RiskManagementPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--ink)] font-sans antialiased">
      <SlimNav />

      <main className="tc-section">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 space-y-14 sm:space-y-20">
          {/* ── Header ─────────────────────────────────────────────── */}
          <header className="space-y-5">
            <Breadcrumbs items={BREADCRUMBS} />
            <span className="tp-eyebrow-mono">Risk Management</span>
            <h1 className="tp-h1 tp-display-xl max-w-[22ch]">
              Size every trade correctly —{" "}
              <span className="tp-serif-italic">and catch yourself when you slip</span>
            </h1>
            <p className="tp-body max-w-[62ch]">
              Retail risk management has two halves. The{" "}
              <span className="tp-serif-italic">mathematical</span> half is position
              sizing: turning “I’m willing to lose 1% on this idea” into an exact number
              of units, lots, or contracts. The{" "}
              <span className="tp-serif-italic">behavioral</span> half is discipline:
              noticing, before you commit capital, that you are about to re-enter out of
              frustration or take your sixth trade of the day out of restlessness. Most
              tools cover one half.{" "}
              <Link href="/features" className="text-[var(--accent)] hover:underline">
                TradCopilot
              </Link>{" "}
              covers both — a precision{" "}
              <Link
                href="/guides/position-sizing-guide"
                className="text-[var(--accent)] hover:underline"
              >
                position size calculator
              </Link>{" "}
              alongside a behavioral engine that reads your own recent trades and warns
              you when a familiar pattern is starting again.
            </p>
          </header>

          {/* ── Position size calculator ───────────────────────────── */}
          <section className="space-y-6">
            <h2 className="tp-h2">The position size calculator</h2>
            <div className="space-y-4">
              <p className="tp-body">
                The method behind the calculator is{" "}
                <span className="tp-serif-italic">fixed-fractional sizing</span>: you
                decide in advance what fraction of the account one mistake may cost, and
                every other number follows from that decision. You supply five inputs —
                account balance, risk percentage per trade, entry price, stop-loss price,
                and optionally a take-profit target and leverage. The tool derives the
                rest:
              </p>
              <ul className="tp-body space-y-2 pl-1">
                {[
                  "Dollar risk — balance × risk %. Risk 1% of $5,000 and the maximum damage of the trade is $50, decided before entry.",
                  "Stop distance — the difference between entry and stop, which converts your dollar risk into a position size: dollars at risk ÷ distance per unit.",
                  "Units, contracts, and forex lots — the same risk budget expressed as crypto quantity, and as standard (100,000), mini (10,000), and micro (1,000) lots for EUR/USD, GBP/USD, and USD/JPY.",
                  "Margin required and R-multiple — how much of the account the position ties up at your chosen leverage, and what the optional target is worth relative to what you risk.",
                  "Warnings — surfaced when the inputs deserve a second look before you act on them.",
                ].map((item) => (
                  <li key={item.slice(0, 24)} className="flex items-start gap-2.5">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {/* Illustrative example */}
              <div className="tc-terminal p-0 overflow-hidden">
                <div className="flex items-center gap-2 border-b border-[var(--color-border-subtle)] px-4 py-2.5 sm:px-5">
                  <span className="tp-eyebrow-mono">Illustrative example</span>
                  <span className="text-xs text-[var(--muted)]">
                    — not a prediction or a recommendation
                  </span>
                </div>
                <dl className="divide-y divide-[var(--color-border-subtle)]">
                  {EXAMPLE_ROWS.map(([label, value]) => (
                    <div
                      key={label}
                      className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-4 py-2.5 sm:px-5"
                    >
                      <dt className="text-xs font-mono uppercase tracking-[0.06em] text-[var(--muted)]">
                        {label}
                      </dt>
                      <dd className="tp-mono text-[13px] sm:text-sm text-[var(--ink)] tabular-nums">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
              <p className="tp-body">
                Why insist on a formula instead of gut feel? Because gut feel scales risk{" "}
                <span className="tp-serif-italic">up</span> after losses, exactly when it
                should shrink. Fixed fractions do the opposite: after each loss you
                automatically risk slightly fewer dollars, so a losing streak decelerates.
                The arithmetic is stark and worth internalizing — at a fixed 1% per trade,
                ten consecutive losses leave you down about 9.6% of the account; at a
                typical gut-feel 10%, the same streak erases roughly 65%. Survival is the
                prerequisite for every other skill in trading.
              </p>
              <p className="tp-body">
                Leverage is handled honestly rather than glamorized. Leverage multiplies{" "}
                <span className="tp-serif-italic">exposure</span>, never edge — your risk
                is still defined by the distance to your stop. The calculator checks your
                requested leverage against the instrument’s maximum, reports the margin
                the position actually requires, and warns when the size your risk budget
                demands does not comfortably fit the account. And because lot math
                punishes sloppy arithmetic — a micro lot of USD/JPY behaves differently
                from a micro lot of EUR/USD — the computation runs on high-precision
                decimal math rather than floating point.
              </p>
            </div>
          </section>

          <hr className="tc-rule" />

          {/* ── Behavioral guardrails ──────────────────────────────── */}
          <section className="space-y-6">
            <h2 className="tp-h2">Behavioral guardrails — warnings, not walls</h2>
            <p className="tp-body">
              Sizing formulas fail quietly when the person entering the numbers is not
              calm. So alongside the calculator, TradCopilot watches how you trade — not
              what to trade — using the record kept in your{" "}
              <Link href="/trading-journal" className="text-[var(--accent)] hover:underline">
                trade journal
              </Link>
              . Every check runs against your own last twenty logged trades and the risk
              rules you set for yourself.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  title: "Revenge re-entry",
                  body: "Opening a new position less than 30 minutes after a losing trade closes gets flagged, with the pattern named plainly before you deploy capital.",
                },
                {
                  title: "Overtrading",
                  body: "More than five trades in a single day raises a flag — volume at that pace usually signals chasing, not strategy.",
                },
                {
                  title: "Cutting winners early",
                  body: "When your average win is smaller than 0.6× your average loss, the engine points it out: that exit asymmetry quietly makes every edge harder to keep.",
                },
              ].map((flag) => (
                <div key={flag.title} className="tc-card">
                  <span className="tc-card__badge">{flag.title}</span>
                  <p className="tc-card__body">{flag.body}</p>
                </div>
              ))}
            </div>
            <p className="tp-body">
              Emotion tags and mistake tags from your journal give the flags their
              context, and a weekly summary rolls the patterns up so a rough week is
              visible as a shape, not a blur of individual trades. And the philosophy is
              non-negotiable:{" "}
              <span className="text-[var(--ink)]">
                the engine warns — it never blocks a trade, forces a pause, or locks you
                out.
              </span>{" "}
              TradCopilot is read-only by architecture: it has no connection to your
              broker, cannot place or refuse an order, and never takes control of the
              account. You get the observation while the decision — and the
              responsibility — stays entirely yours.
            </p>
          </section>

          <hr className="tc-rule" />

          {/* ── Why the patterns destroy accounts ──────────────────── */}
          <section className="space-y-6">
            <h2 className="tp-h2">Why revenge trading and overtrading destroy accounts</h2>
            <p className="tp-body">
              Revenge trading is loss-chasing with a deadline. After a loss, the goal
              quietly shifts from executing a plan to recovering the money as fast as
              possible — and that deadline warps every input. Setups you would normally
              skip start looking tradable. Size goes up, because a normal-sized position
              “takes too long” to win the loss back. Stops get widened so the idea is
              never technically wrong. The result is that your risk per trade becomes
              largest at precisely the moment your judgment is worst, and drawdown stops
              being a slow slope and becomes a staircase.
            </p>
            <p className="tp-body">
              Overtrading destroys accounts more politely, which is why it lasts longer.
              Every trade pays the spread, so a stream of low-conviction entries bleeds
              costs that scale with frequency while fatigue drags down selection quality —
              the tenth trade of the day is rarely your best idea, it is just your latest.
              Worse, rapid-fire positions in one session are often the same view expressed
              several times, so the “diversified” day is really one concentrated bet,
              compounded. TradCopilot’s answer to both patterns is the same: make the
              pattern visible before the next click. This page is education, not
              financial advice — see our{" "}
              <Link href="/disclaimer" className="text-[var(--accent)] hover:underline">
                full disclaimer
              </Link>
              .
            </p>
          </section>

          {/* ── Related reading ───────────────────────────────────── */}
          <section className="space-y-5">
            <span className="tp-eyebrow-mono">Go deeper</span>
            <div className="grid gap-3 sm:grid-cols-2">
              {RELATED_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="tc-card group">
                  <span className="tc-arrow-link">
                    {link.label}
                    <ArrowUpRight
                      size={14}
                      className="text-[var(--muted)] group-hover:text-[var(--accent)]"
                    />
                  </span>
                  <span className="tc-card__body">{link.desc}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* ── FAQ ────────────────────────────────────────────────── */}
          <section className="space-y-5">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="tp-h2">Risk management FAQ</h2>
              <Link
                href="/faq"
                className="shrink-0 text-xs font-mono uppercase tracking-[0.08em] text-[var(--accent)] hover:underline"
              >
                All questions →
              </Link>
            </div>
            <div className="space-y-3">
              {RISK_FAQS.map((faq) => (
                <details
                  key={faq.question}
                  className="group rounded-xl border border-[var(--color-border-default)] bg-[var(--surface)] px-4 py-3.5 sm:px-5 [&_summary::-webkit-details-marker]:hidden"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                    <span className="font-display text-[15px] sm:text-base font-semibold tracking-[-0.01em] text-[var(--ink)]">
                      {faq.question}
                    </span>
                    <span
                      aria-hidden
                      className="tp-mono shrink-0 text-base text-[var(--accent)] transition-transform duration-200 group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="tp-body mt-3 text-sm sm:text-[15px]">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>

          {/* ── CTA ────────────────────────────────────────────────── */}
          <section className="tc-band-alt -mx-4 sm:-mx-6 rounded-xl border border-[var(--color-border-default)] px-4 py-10 text-center sm:mx-0 sm:px-10">
            <h2 className="tp-h3">Know your size. Know your state.</h2>
            <p className="tp-body mx-auto mt-3 max-w-[52ch]">
              Put the calculator and the guardrails on your desk before your next
              session. Compare plans any time on{" "}
              <Link href="/pricing" className="text-[var(--accent)] hover:underline">
                pricing
              </Link>{" "}
              — the free tier includes the journal and daily analyses.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/signup" className="btn-primary btn-lg">
                Start free — 5 analyses a day, no card required
              </Link>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />

      <JsonLd
        data={[
          breadcrumbJsonLd(BREADCRUMBS),
          faqPageJsonLd(RISK_FAQS),
        ]}
      />
    </div>
  );
}
