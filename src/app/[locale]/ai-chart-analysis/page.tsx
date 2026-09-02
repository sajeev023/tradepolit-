import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart2 } from "lucide-react";
import { SlimNav } from "@/components/landing/slim-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
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
  return buildMetadata({ ...dict.aiChartAnalysis.meta, path: "/ai-chart-analysis", locale });
}

export default async function LocaleAiChartAnalysisPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = parseLocale(localeParam) as SupportedLocale;
  if (!locale || locale === "en") notFound();

  const dict = await getDictionary(locale);
  const d = dict.aiChartAnalysis;
  const lp = (path: string) => localePath(locale, path);
  const BREADCRUMBS = [{ name: d.meta.title.split("—")[0].trim(), path: "/ai-chart-analysis" }];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--ink)] font-sans antialiased">
      <SlimNav />
      <main className="tc-section">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 space-y-12 sm:space-y-16">
          <JsonLd data={[breadcrumbJsonLd(BREADCRUMBS)]} />

          <header className="space-y-4">
            <Breadcrumbs items={BREADCRUMBS} />
            <div className="flex items-center gap-2 text-[var(--accent)]">
              <BarChart2 size={16} />
              <span className="tp-eyebrow-mono">{d.eyebrow}</span>
            </div>
            <h1 className="tp-display-xl text-3xl! sm:text-4xl! lg:text-5xl!">{d.h1}</h1>
            <p className="tp-body max-w-2xl text-[15px] sm:text-[16px] leading-relaxed">{d.intro}</p>
          </header>

          <hr className="tc-rule" />

          <section className="space-y-4">
            <h2 className="tp-h2">{d.instrumentLayerHeading}</h2>
          </section>

          <hr className="tc-rule" />

          <section className="space-y-4">
            <h2 className="tp-h2">{d.judgmentLayerHeading}</h2>
          </section>

          <hr className="tc-rule" />

          <section className="space-y-4">
            <h2 className="tp-h2">{d.pipelineHeading}</h2>
          </section>

          <hr className="tc-rule" />

          <section className="space-y-4">
            <h2 className="tp-h2">{d.coverageHeading}</h2>
          </section>

          <hr className="tc-rule" />

          <section className="space-y-4">
            <h2 className="tp-h2">{d.responsibleHeading}</h2>
          </section>

          <hr className="tc-rule" />

          <section className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Link href={lp("/crypto-market-analysis")} className="tc-card group hover:border-[var(--accent)] transition-colors">
                <span className="tc-arrow-link font-medium text-xs">{dict.cryptoMarketAnalysis.meta.title.split("—")[0].trim()} <ArrowRight size={13} /></span>
              </Link>
              <Link href={lp("/forex-market-analysis")} className="tc-card group hover:border-[var(--accent)] transition-colors">
                <span className="tc-arrow-link font-medium text-xs">{dict.forexMarketAnalysis.meta.title.split("—")[0].trim()} <ArrowRight size={13} /></span>
              </Link>
              <Link href={lp("/guides/technical-indicators")} className="tc-card group hover:border-[var(--accent)] transition-colors">
                <span className="tc-arrow-link font-medium text-xs">{dict.guides.entries[3].name} <ArrowRight size={13} /></span>
              </Link>
            </div>
          </section>

          <section className="tc-terminal p-6 sm:p-10 text-center space-y-4">
            <h2 className="tp-h2">{d.ctaHeading}</h2>
            <p className="tp-body max-w-xl mx-auto text-[13px] sm:text-[14px]">{d.ctaBody}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              <Link href="/signup" className="btn-primary btn-lg">{dict.common.startFree}</Link>
              <Link href={lp("/pricing")} className="btn-secondary btn-lg">{dict.common.seePricing}</Link>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
