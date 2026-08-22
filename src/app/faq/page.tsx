import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown, HelpCircle, ArrowRight } from "lucide-react";
import { SlimNav } from "@/components/landing/slim-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata, breadcrumbJsonLd, faqPageJsonLd } from "@/lib/seo";
import { FAQS } from "@/lib/faq-data";

export const metadata: Metadata = buildMetadata({
  title: "Frequently Asked Questions — TradCopilot Terminal & Architecture FAQ",
  description:
    "Comprehensive answers regarding TradCopilot's AI chart analysis, indicator math, session journaling, risk guardrails, pricing, and read-only security model.",
  path: "/faq",
  keywords: [
    "tradcopilot faq",
    "ai trading questions",
    "how ai trading copilot works",
    "tradcopilot pricing",
    "trading copilot security",
  ],
});

const BREADCRUMBS = [{ name: "FAQ", path: "/faq" }];

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--ink)] font-sans antialiased">
      <SlimNav />

      <main className="tc-section">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 space-y-12 sm:space-y-16">
          <JsonLd
            data={[
              breadcrumbJsonLd(BREADCRUMBS),
              faqPageJsonLd(FAQS),
            ]}
          />

          {/* ── Header ── */}
          <header className="space-y-4">
            <Breadcrumbs items={BREADCRUMBS} />
            <div className="flex items-center gap-2 text-[var(--accent)]">
              <HelpCircle size={16} />
              <span className="tp-eyebrow-mono">KNOWLEDGE BASE</span>
            </div>
            <h1 className="tp-display-xl text-3xl! sm:text-4xl! lg:text-5xl!">
              Frequently Asked <span className="tp-serif-italic">Questions.</span>
            </h1>
            <p className="tp-body max-w-2xl text-[15px] sm:text-[16px] leading-relaxed">
              Clear, transparent answers about how TradCopilot works, our multi-model AI race, indicator calculations, security, and billing.
            </p>
          </header>

          <hr className="tc-rule" />

          {/* ── FAQ List ── */}
          <section className="space-y-4">
            <div className="space-y-3">
              {FAQS.map((faq) => (
                <details
                  key={faq.question}
                  className="group tc-card !p-0 overflow-hidden"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 sm:px-6 sm:py-5">
                    <h2 className="text-[15px] sm:text-[16px] font-semibold text-[var(--ink)] leading-snug">
                      {faq.question}
                    </h2>
                    <ChevronDown
                      size={18}
                      className="shrink-0 text-[var(--muted)] transition-transform duration-300 group-open:rotate-180 group-open:text-[var(--accent)]"
                    />
                  </summary>
                  <p className="px-4 pb-4 sm:px-6 sm:pb-6 text-[13px] sm:text-[14px] text-[var(--muted)] leading-relaxed border-t border-[var(--color-border-subtle)] pt-3">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </section>

          <hr className="tc-rule" />

          {/* ── Quick Nav Hub ── */}
          <section className="space-y-4">
            <span className="tp-eyebrow-mono block">EXPLORE THE PRODUCT</span>
            <div className="grid gap-3 sm:grid-cols-3">
              <Link href="/features" className="tc-card group hover:border-[var(--accent)] transition-colors">
                <span className="tc-arrow-link font-medium text-xs">
                  Features <ArrowRight size={13} />
                </span>
                <p className="text-xs text-[var(--muted)] mt-1">Full terminal capabilities.</p>
              </Link>
              <Link href="/ai-chart-analysis" className="tc-card group hover:border-[var(--accent)] transition-colors">
                <span className="tc-arrow-link font-medium text-xs">
                  Chart Analysis <ArrowRight size={13} />
                </span>
                <p className="text-xs text-[var(--muted)] mt-1">Deterministic indicator math.</p>
              </Link>
              <Link href="/pricing" className="tc-card group hover:border-[var(--accent)] transition-colors">
                <span className="tc-arrow-link font-medium text-xs">
                  Pricing Plans <ArrowRight size={13} />
                </span>
                <p className="text-xs text-[var(--muted)] mt-1">Free vs Pro breakdown.</p>
              </Link>
            </div>
          </section>

          {/* ── CTA ── */}
          <section className="tc-terminal p-6 sm:p-10 text-center space-y-4">
            <h2 className="tp-h2">Still have questions?</h2>
            <p className="tp-body max-w-xl mx-auto text-[13px] sm:text-[14px]">
              Try the 15-minute anonymous demo with no signup required, or reach out directly to hello@tradcopilot.com.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              <Link href="/signup" className="btn-primary btn-lg">
                Start Free Account
              </Link>
              <Link href="/disclaimer" className="btn-secondary btn-lg">
                Read Disclaimer
              </Link>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
