import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SlimNav } from "@/components/landing/slim-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata, breadcrumbJsonLd, faqPageJsonLd } from "@/lib/seo";
import { parseLocale, type SupportedLocale, NON_DEFAULT_LOCALE_KEYS, localePath } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return NON_DEFAULT_LOCALE_KEYS.map((loc) => ({ locale: loc }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale = parseLocale(localeParam);
  if (!locale || locale === "en") return {};
  const dict = await getDictionary(locale);
  return buildMetadata({ ...dict.forexMarketAnalysis.meta, path: "/forex-market-analysis", locale });
}

export default async function LocaleForexMarketAnalysisPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = parseLocale(localeParam) as SupportedLocale;
  if (!locale || locale === "en") notFound();

  const dict = await getDictionary(locale);
  const d = dict.forexMarketAnalysis;
  const lp = (path: string) => localePath(locale, path);
  const BREADCRUMBS = [{ name: d.meta.title.split("—")[0].trim(), path: "/forex-market-analysis" }];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--ink)] font-sans antialiased">
      <SlimNav />
      <main className="tc-section">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 space-y-12 sm:space-y-16">
          <JsonLd data={[breadcrumbJsonLd(BREADCRUMBS), faqPageJsonLd(d.faqs)]} />

          <header className="space-y-4">
            <Breadcrumbs items={BREADCRUMBS} />
            <div className="flex items-center gap-2 text-[var(--accent)]">
              <span className="tp-eyebrow-mono">{d.eyebrow}</span>
            </div>
            <h1 className="tp-display-xl text-3xl! sm:text-4xl! lg:text-5xl!">
              {d.h1} <span className="tp-serif-italic">{d.h1Italic}</span>
            </h1>
            <p className="tp-body max-w-2xl text-[15px] sm:text-[16px] leading-relaxed">{d.intro}</p>
          </header>

          <hr className="tc-rule" />
          <section className="space-y-4"><h2 className="tp-h2">{d.coverageHeading}</h2></section>
          <hr className="tc-rule" />
          <section className="space-y-4"><h2 className="tp-h2">{d.analysisHeading}</h2></section>
          <hr className="tc-rule" />
          <section className="space-y-4"><h2 className="tp-h2">{d.riskMathHeading}</h2></section>
          <hr className="tc-rule" />
          <section className="space-y-4"><h2 className="tp-h2">{d.safetyHeading}</h2></section>
          <hr className="tc-rule" />

          <section className="space-y-4">
            <h2 className="tp-h2">{d.faqHeading}</h2>
            <div className="space-y-3">
              {d.faqs.map((faq) => (
                <details key={faq.question} className="group tc-card !p-0 overflow-hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 sm:px-6 sm:py-5">
                    <h3 className="text-[15px] sm:text-[16px] font-semibold text-[var(--ink)] leading-snug">{faq.question}</h3>
                  </summary>
                  <p className="px-4 pb-4 sm:px-6 sm:pb-6 text-[13px] sm:text-[14px] text-[var(--muted)] leading-relaxed border-t border-[var(--color-border-subtle)] pt-3">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>

          <hr className="tc-rule" />

          <section className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Link href={lp("/crypto-market-analysis")} className="tc-card group hover:border-[var(--accent)] transition-colors">
                <span className="tc-arrow-link font-medium text-xs">{dict.cryptoMarketAnalysis.meta.title.split("—")[0].trim()} <ArrowRight size={13} /></span>
              </Link>
              <Link href={lp("/risk-management")} className="tc-card group hover:border-[var(--accent)] transition-colors">
                <span className="tc-arrow-link font-medium text-xs">{dict.riskManagement.h1} <ArrowRight size={13} /></span>
              </Link>
              <Link href={lp("/guides/position-sizing-guide")} className="tc-card group hover:border-[var(--accent)] transition-colors">
                <span className="tc-arrow-link font-medium text-xs">{dict.guides.entries[0].name} <ArrowRight size={13} /></span>
              </Link>
            </div>
          </section>

          <section className="tc-terminal p-6 sm:p-10 text-center space-y-4">
            <h2 className="tp-h2">{d.ctaHeading}</h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              <Link href="/signup" className="btn-primary btn-lg">{dict.common.startFree}</Link>
              <Link href={lp("/pricing")} className="btn-secondary btn-lg">{dict.common.seePricing}</Link>
            </div>
            <p className="text-[11px] text-[var(--muted)]">{dict.common.disclaimerShort}</p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
