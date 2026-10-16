import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { TrendingUp, ArrowLeft } from "lucide-react";
import { PricingCards } from "@/components/pricing/pricing-cards";
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
  return buildMetadata({ ...dict.pricing.meta, path: "/pricing", locale });
}

export default async function LocalePricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = parseLocale(localeParam) as SupportedLocale;
  if (!locale || locale === "en") notFound();

  const dict = await getDictionary(locale);
  const lp = (path: string) => localePath(locale, path);

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      <JsonLd data={[breadcrumbJsonLd([{ name: dict.pricing.h1, path: "/pricing" }])]} />
      <nav className="h-12 sm:h-14 glass sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 lg:px-10 select-none border-b border-[var(--color-border-subtle)]">
        <Link href={lp("/")} className="flex items-center gap-2 flex-shrink-0">
          <div
            className="flex items-center justify-center rounded-md w-6 h-6"
            style={{ background: "linear-gradient(135deg, var(--accent-bright), var(--accent))" }}
          >
            <TrendingUp size={13} color="#09090B" strokeWidth={2.5} />
          </div>
          <span className="text-[13px] font-semibold tracking-[-0.01em] text-[var(--color-text-primary)]">
            TradCopilot
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <Link href={lp("/")} className="btn-ghost text-[13px] gap-1.5">
            <ArrowLeft size={14} />
            {dict.common.backToHome}
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-16 lg:py-24">
        <div className="text-center space-y-2 sm:space-y-3 mb-6 sm:mb-12 lg:mb-16 animate-enter">
          <span className="section-eyebrow">{dict.common.nav.pricing}</span>
          <h1 className="text-[28px] sm:text-[38px] lg:text-[44px] font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">
            {dict.pricing.h1}
          </h1>
          <p className="text-[13px] sm:text-[15px] text-[var(--color-text-secondary)] max-w-md mx-auto leading-relaxed">
            {dict.pricing.subtitle}
          </p>
        </div>

        <Suspense
          fallback={
            <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {[1, 2].map((i) => (
                <div key={i} className="card p-7 space-y-5 animate-pulse">
                  <div className="h-4 w-24 bg-[var(--color-bg-tertiary)] rounded" />
                  <div className="h-10 w-20 bg-[var(--color-bg-tertiary)] rounded" />
                  <div className="h-10 w-full bg-[var(--color-bg-tertiary)] rounded" />
                </div>
              ))}
            </div>
          }
        >
          <PricingCards />
        </Suspense>

        <p className="text-center text-[12px] text-[var(--color-text-quaternary)] mt-10">
          USD pricing · {dict.common.disclaimerShort}
        </p>
      </div>
    </div>
  );
}
