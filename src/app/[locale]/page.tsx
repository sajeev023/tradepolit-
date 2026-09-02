import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SlimNav } from "@/components/landing/slim-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { JsonLd } from "@/components/JsonLd";
import {
  buildMetadata,
  websiteJsonLd,
  organizationJsonLd,
  softwareApplicationJsonLd,
  faqPageJsonLd,
} from "@/lib/seo";
import { parseLocale, type SupportedLocale, NON_DEFAULT_LOCALE_KEYS, localePath } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return NON_DEFAULT_LOCALE_KEYS.map((loc) => ({ locale: loc }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale = parseLocale(localeParam);
  if (!locale || locale === "en") return {};

  const dict = await getDictionary(locale);
  return buildMetadata({
    title: dict.home.meta.title,
    titleAbsolute: true,
    description: dict.home.meta.description,
    path: "/",
    locale,
    keywords: dict.home.meta.keywords,
  });
}

export default async function LocaleHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = parseLocale(localeParam) as SupportedLocale;
  if (!locale || locale === "en") notFound();

  const dict = await getDictionary(locale);
  const lp = (path: string) => localePath(locale, path);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--ink)] font-sans antialiased">
      <SlimNav />

      <JsonLd
        data={[
          organizationJsonLd(),
          websiteJsonLd(locale),
          softwareApplicationJsonLd(),
          faqPageJsonLd(dict.faq.faqs),
        ]}
      />

      <main className="tc-section">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 space-y-16 sm:space-y-24">

          {/* ── Hero ── */}
          <header className="space-y-6 text-center pt-8 sm:pt-16">
            <h1 className="tp-display-xl text-3xl! sm:text-4xl! lg:text-5xl!">
              {dict.home.h1}{" "}
              <span className="tp-serif-italic">{dict.home.h1Italic}</span>
            </h1>
            <p className="tp-body max-w-2xl mx-auto text-[15px] sm:text-[16px] leading-relaxed">
              {dict.home.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link href="/signup" className="btn-primary btn-lg">
                {dict.common.startFree}
              </Link>
              <Link href={lp("/features")} className="btn-secondary btn-lg">
                {dict.common.viewFeatures}
              </Link>
            </div>
            <p className="text-xs text-[var(--muted)]">
              {dict.common.disclaimerShort}
            </p>
          </header>

          <hr className="tc-rule" />

          {/* ── Product Highlights ── */}
          <section className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Link href={lp("/ai-chart-analysis")} className="tc-card group block space-y-2 hover:border-[var(--accent)] transition-colors">
                <span className="tp-eyebrow-mono text-[10px]">{dict.aiChartAnalysis.eyebrow}</span>
                <span className="tc-arrow-link font-medium text-sm block">
                  {dict.aiChartAnalysis.meta.title.split("—")[0].trim()} <ArrowRight size={14} />
                </span>
              </Link>
              <Link href={lp("/crypto-market-analysis")} className="tc-card group block space-y-2 hover:border-[var(--accent)] transition-colors">
                <span className="tp-eyebrow-mono text-[10px]">{dict.cryptoMarketAnalysis.eyebrow}</span>
                <span className="tc-arrow-link font-medium text-sm block">
                  {dict.cryptoMarketAnalysis.meta.title.split("—")[0].trim()} <ArrowRight size={14} />
                </span>
              </Link>
              <Link href={lp("/forex-market-analysis")} className="tc-card group block space-y-2 hover:border-[var(--accent)] transition-colors">
                <span className="tp-eyebrow-mono text-[10px]">{dict.forexMarketAnalysis.eyebrow}</span>
                <span className="tc-arrow-link font-medium text-sm block">
                  {dict.forexMarketAnalysis.meta.title.split("—")[0].trim()} <ArrowRight size={14} />
                </span>
              </Link>
            </div>
          </section>

          <hr className="tc-rule" />

          {/* ── More links ── */}
          <section className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Link href={lp("/trading-journal")} className="tc-card group hover:border-[var(--accent)] transition-colors">
                <span className="tc-arrow-link font-medium text-xs">{dict.tradingJournal.h1} <ArrowRight size={13} /></span>
              </Link>
              <Link href={lp("/risk-management")} className="tc-card group hover:border-[var(--accent)] transition-colors">
                <span className="tc-arrow-link font-medium text-xs">{dict.riskManagement.h1} <ArrowRight size={13} /></span>
              </Link>
              <Link href={lp("/trading-alerts")} className="tc-card group hover:border-[var(--accent)] transition-colors">
                <span className="tc-arrow-link font-medium text-xs">{dict.tradingAlerts.h1} <ArrowRight size={13} /></span>
              </Link>
            </div>
          </section>

          <hr className="tc-rule" />

          {/* ── FAQ Section ── */}
          <section className="space-y-4">
            <span className="tp-eyebrow-mono block">{dict.home.faqSubheading}</span>
            <h2 className="tp-h2">{dict.home.faqHeading}</h2>
            <div className="space-y-3">
              {dict.faq.faqs.slice(0, 5).map((faq) => (
                <details key={faq.question} className="group tc-card !p-0 overflow-hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 sm:px-6 sm:py-5">
                    <h3 className="text-[15px] sm:text-[16px] font-semibold text-[var(--ink)] leading-snug">
                      {faq.question}
                    </h3>
                  </summary>
                  <p className="px-4 pb-4 sm:px-6 sm:pb-6 text-[13px] sm:text-[14px] text-[var(--muted)] leading-relaxed border-t border-[var(--color-border-subtle)] pt-3">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
            <Link href={lp("/faq")} className="tc-arrow-link text-xs">
              {dict.common.readFullFaq} <ArrowRight size={12} />
            </Link>
          </section>

          <hr className="tc-rule" />

          {/* ── Guides ── */}
          <section className="space-y-4">
            <h2 className="tp-h2">{dict.guides.h1} <span className="tp-serif-italic">{dict.guides.h1Italic}</span></h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {dict.guides.entries.slice(0, 4).map((g, i) => {
                const guidePaths = [
                  "/guides/position-sizing-guide",
                  "/guides/trading-discipline",
                  "/guides/support-and-resistance",
                  "/guides/technical-indicators",
                  "/guides/multi-timeframe-analysis",
                ];
                return (
                  <Link key={g.name} href={lp(guidePaths[i] ?? "/guides")} className="tc-card group block space-y-2 hover:border-[var(--accent)] transition-colors">
                    <span className="tp-eyebrow-mono text-[10px]">{g.tag}</span>
                    <span className="tc-arrow-link font-medium text-xs block">
                      {g.name} <ArrowRight size={13} />
                    </span>
                  </Link>
                );
              })}
            </div>
            <Link href={lp("/guides")} className="tc-arrow-link text-xs">
              {dict.common.viewFeatures} <ArrowRight size={12} />
            </Link>
          </section>

          <hr className="tc-rule" />

          {/* ── Final CTA ── */}
          <section className="tc-terminal p-6 sm:p-10 text-center space-y-4">
            <h2 className="tp-h2">{dict.pricing.h1}</h2>
            <p className="tp-body max-w-xl mx-auto text-[13px] sm:text-[14px]">
              {dict.pricing.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              <Link href="/signup" className="btn-primary btn-lg">
                {dict.common.startFree}
              </Link>
              <Link href={lp("/pricing")} className="btn-secondary btn-lg">
                {dict.common.seePricing}
              </Link>
            </div>
            <p className="text-[11px] text-[var(--muted)]">
              {dict.common.disclaimerShort}
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
