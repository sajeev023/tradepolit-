import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SlimNav } from "@/components/landing/slim-nav";
import { SiteFooter } from "@/components/layout/site-footer";
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
  return buildMetadata({ ...dict.features.meta, path: "/features", locale });
}

export default async function LocaleFeaturesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = parseLocale(localeParam) as SupportedLocale;
  if (!locale || locale === "en") notFound();

  const dict = await getDictionary(locale);
  const lp = (path: string) => localePath(locale, path);

  const featureLinks = [
    { href: "/ai-chart-analysis", label: dict.aiChartAnalysis.meta.title.split("—")[0].trim() },
    { href: "/crypto-market-analysis", label: dict.cryptoMarketAnalysis.meta.title.split("—")[0].trim() },
    { href: "/forex-market-analysis", label: dict.forexMarketAnalysis.meta.title.split("—")[0].trim() },
    { href: "/trading-journal", label: dict.tradingJournal.h1 },
    { href: "/risk-management", label: dict.riskManagement.h1 },
    { href: "/trading-alerts", label: dict.tradingAlerts.h1 },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--ink)] font-sans antialiased">
      <SlimNav />
      <main className="tc-section">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 space-y-12 sm:space-y-16">
          <JsonLd data={[breadcrumbJsonLd([{ name: dict.features.h1, path: "/features" }])]} />
          <header className="space-y-4">
            <h1 className="tp-display-xl text-3xl! sm:text-4xl! lg:text-5xl!">{dict.features.h1}</h1>
          </header>
          <hr className="tc-rule" />
          <section className="grid gap-4 sm:grid-cols-2">
            {featureLinks.map((f) => (
              <Link key={f.href} href={lp(f.href)} className="tc-card group block space-y-2 hover:border-[var(--accent)] transition-colors">
                <span className="tc-arrow-link font-medium text-sm block">{f.label} <ArrowRight size={14} /></span>
              </Link>
            ))}
          </section>
          <hr className="tc-rule" />
          <section className="tc-terminal p-6 sm:p-10 text-center space-y-4">
            <h2 className="tp-h2">{dict.pricing.h1}</h2>
            <p className="tp-body max-w-xl mx-auto text-[13px] sm:text-[14px]">{dict.pricing.subtitle}</p>
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
