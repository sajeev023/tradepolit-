import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
  return buildMetadata({ ...dict.tradingAlerts.meta, path: "/trading-alerts", locale });
}

export default async function LocaleTradingAlertsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = parseLocale(localeParam) as SupportedLocale;
  if (!locale || locale === "en") notFound();

  const dict = await getDictionary(locale);
  const d = dict.tradingAlerts;
  const lp = (path: string) => localePath(locale, path);
  const BREADCRUMBS = [{ name: dict.features.h1, path: "/features" }, { name: d.h1, path: "/trading-alerts" }];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--ink)] font-sans antialiased">
      <SlimNav />
      <main className="tc-section">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 space-y-12 sm:space-y-16">
          <JsonLd data={[breadcrumbJsonLd(BREADCRUMBS)]} />
          <header className="space-y-4">
            <Breadcrumbs items={BREADCRUMBS} />
            <h1 className="tp-display-xl text-3xl! sm:text-4xl! lg:text-5xl!">{d.h1}</h1>
            <p className="tp-body max-w-2xl text-[15px] sm:text-[16px] leading-relaxed">{d.intro}</p>
          </header>
          <hr className="tc-rule" />
          <section className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Link href={lp("/ai-chart-analysis")} className="tc-card group hover:border-[var(--accent)] transition-colors">
                <span className="tc-arrow-link font-medium text-xs">{dict.aiChartAnalysis.meta.title.split("—")[0].trim()} <ArrowRight size={13} /></span>
              </Link>
              <Link href={lp("/trading-journal")} className="tc-card group hover:border-[var(--accent)] transition-colors">
                <span className="tc-arrow-link font-medium text-xs">{dict.tradingJournal.h1} <ArrowRight size={13} /></span>
              </Link>
              <Link href={lp("/pricing")} className="tc-card group hover:border-[var(--accent)] transition-colors">
                <span className="tc-arrow-link font-medium text-xs">{dict.pricing.h1} <ArrowRight size={13} /></span>
              </Link>
            </div>
          </section>
          <section className="tc-terminal p-6 sm:p-10 text-center space-y-4">
            <h2 className="tp-h2">{dict.pricing.h1}</h2>
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
