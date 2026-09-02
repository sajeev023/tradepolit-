import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown, HelpCircle, ArrowRight } from "lucide-react";
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
  return buildMetadata({ ...dict.faq.meta, path: "/faq", locale });
}

export default async function LocaleFaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = parseLocale(localeParam) as SupportedLocale;
  if (!locale || locale === "en") notFound();

  const dict = await getDictionary(locale);
  const d = dict.faq;
  const lp = (path: string) => localePath(locale, path);
  const BREADCRUMBS = [{ name: "FAQ", path: "/faq" }];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--ink)] font-sans antialiased">
      <SlimNav />
      <main className="tc-section">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 space-y-12 sm:space-y-16">
          <JsonLd data={[breadcrumbJsonLd(BREADCRUMBS), faqPageJsonLd(d.faqs)]} />

          <header className="space-y-4">
            <Breadcrumbs items={BREADCRUMBS} />
            <div className="flex items-center gap-2 text-[var(--accent)]">
              <HelpCircle size={16} />
              <span className="tp-eyebrow-mono">FAQ</span>
            </div>
            <h1 className="tp-display-xl text-3xl! sm:text-4xl! lg:text-5xl!">
              {d.h1} <span className="tp-serif-italic">{d.h1Italic}</span>
            </h1>
            <p className="tp-body max-w-2xl text-[15px] sm:text-[16px] leading-relaxed">{d.subtitle}</p>
          </header>

          <hr className="tc-rule" />

          <section className="space-y-4">
            <div className="space-y-3">
              {d.faqs.map((faq) => (
                <details key={faq.question} className="group tc-card !p-0 overflow-hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 sm:px-6 sm:py-5">
                    <h2 className="text-[15px] sm:text-[16px] font-semibold text-[var(--ink)] leading-snug">{faq.question}</h2>
                    <ChevronDown size={18} className="shrink-0 text-[var(--muted)] transition-transform duration-300 group-open:rotate-180 group-open:text-[var(--accent)]" />
                  </summary>
                  <p className="px-4 pb-4 sm:px-6 sm:pb-6 text-[13px] sm:text-[14px] text-[var(--muted)] leading-relaxed border-t border-[var(--color-border-subtle)] pt-3">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>

          <hr className="tc-rule" />

          <section className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Link href={lp("/features")} className="tc-card group hover:border-[var(--accent)] transition-colors">
                <span className="tc-arrow-link font-medium text-xs">{dict.features.h1} <ArrowRight size={13} /></span>
              </Link>
              <Link href={lp("/ai-chart-analysis")} className="tc-card group hover:border-[var(--accent)] transition-colors">
                <span className="tc-arrow-link font-medium text-xs">{dict.aiChartAnalysis.meta.title.split("—")[0].trim()} <ArrowRight size={13} /></span>
              </Link>
              <Link href={lp("/pricing")} className="tc-card group hover:border-[var(--accent)] transition-colors">
                <span className="tc-arrow-link font-medium text-xs">{dict.pricing.h1} <ArrowRight size={13} /></span>
              </Link>
            </div>
          </section>

          <section className="tc-terminal p-6 sm:p-10 text-center space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              <Link href="/signup" className="btn-primary btn-lg">{dict.common.startFree}</Link>
              <Link href="/disclaimer" className="btn-secondary btn-lg">{dict.common.readDisclaimer}</Link>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
