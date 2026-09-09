import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Calculator, ShieldAlert, BarChart2, Layers } from "lucide-react";
import { SlimNav } from "@/components/landing/slim-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata, breadcrumbJsonLd, articleJsonLd } from "@/lib/seo";
import {
  parseLocale,
  type SupportedLocale,
  NON_DEFAULT_LOCALE_KEYS,
  localePath,
} from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { notFound } from "next/navigation";

const GUIDE_SLUG_MAP: Record<string, { index: number; publishedTime: string; icon: any }> = {
  "position-sizing-guide": { index: 0, publishedTime: "2026-08-22T00:00:00.000Z", icon: Calculator },
  "trading-discipline": { index: 1, publishedTime: "2026-08-22T00:00:00.000Z", icon: ShieldAlert },
  "support-and-resistance": { index: 2, publishedTime: "2026-08-22T00:00:00.000Z", icon: Layers },
  "technical-indicators": { index: 3, publishedTime: "2026-08-23T00:00:00.000Z", icon: BarChart2 },
  "multi-timeframe-analysis": { index: 4, publishedTime: "2026-08-23T00:00:00.000Z", icon: BookOpen },
};

const ALL_SLUGS = Object.keys(GUIDE_SLUG_MAP);

export function generateStaticParams() {
  const params: Array<{ locale: string; slug: string }> = [];
  for (const loc of NON_DEFAULT_LOCALE_KEYS) {
    for (const slug of ALL_SLUGS) {
      params.push({ locale: loc, slug });
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: localeParam, slug } = await params;
  const locale = parseLocale(localeParam);
  if (!locale || locale === "en" || !GUIDE_SLUG_MAP[slug]) return {};

  const dict = await getDictionary(locale);
  const info = GUIDE_SLUG_MAP[slug];
  const entry = dict.guides.entries[info.index];
  if (!entry) return {};

  return buildMetadata({
    title: `${entry.name} — TradCopilot`,
    description: entry.summary,
    path: `/guides/${slug}`,
    locale,
    ogType: "article",
    publishedTime: info.publishedTime,
    keywords: [entry.name, entry.tag.toLowerCase(), "trading guide", locale],
  });
}

export default async function LocaleGuideDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: localeParam, slug } = await params;
  const locale = parseLocale(localeParam) as SupportedLocale;
  if (!locale || locale === "en" || !GUIDE_SLUG_MAP[slug]) notFound();

  const dict = await getDictionary(locale);
  const info = GUIDE_SLUG_MAP[slug];
  const entry = dict.guides.entries[info.index];
  if (!entry) notFound();

  const lp = (p: string) => localePath(locale, p);
  const Icon = info.icon;

  const BREADCRUMBS = [
    { name: dict.guides.h1, path: "/guides" },
    { name: entry.name, path: `/guides/${slug}` },
  ];

  const otherGuides = ALL_SLUGS.filter((s) => s !== slug).map((s) => ({
    slug: s,
    ...dict.guides.entries[GUIDE_SLUG_MAP[s].index],
  }));

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--ink)] font-sans antialiased">
      <SlimNav />

      <main className="tc-section">
        <article className="max-w-[840px] mx-auto px-4 sm:px-6 space-y-12 sm:space-y-16">
          <JsonLd
            data={[
              breadcrumbJsonLd(BREADCRUMBS),
              articleJsonLd({
                headline: entry.name,
                description: entry.summary,
                path: `/guides/${slug}`,
                datePublished: info.publishedTime,
                locale,
              }),
            ]}
          />

          {/* ── Article Header ── */}
          <header className="space-y-4">
            <Breadcrumbs items={BREADCRUMBS} />
            <div className="flex items-center gap-2 text-[var(--accent)] pt-2">
              <Icon size={16} />
              <span className="tp-eyebrow-mono">{entry.tag}</span>
            </div>
            <h1 className="tp-display-xl text-3xl! sm:text-4xl! lg:text-5xl!">
              {entry.name}
            </h1>
            <p className="tp-body text-[15px] sm:text-[16px] leading-relaxed max-w-2xl text-[var(--muted)]">
              {entry.summary}
            </p>
          </header>

          <hr className="tc-rule" />

          {/* ── Core Guide Content Section ── */}
          <section className="space-y-6 text-[14px] sm:text-[15px] leading-relaxed text-[var(--muted)]">
            <div className="tc-card space-y-3">
              <h2 className="text-[17px] font-semibold text-[var(--ink)]">
                {locale === "pt-br" ? "Princípios Fundamentais" : "Principios Fundamentales"}
              </h2>
              <p>
                {locale === "pt-br"
                  ? "A gestão profissional de operações exige regras matemáticas estritas. No TradCopilot, cada análise gráfica e cada leitura técnica integra estes cálculos de forma determinística, permitindo que você avalie o risco antes de posicionar capital."
                  : "La gestión profesional de operaciones exige reglas matemáticas estrictas. En TradCopilot, cada análisis gráfico y cada lectura técnica integra estos cálculos de forma determinista, permitiéndote evaluar el riesgo antes de posicionar capital."}
              </p>
            </div>

            <div className="tc-card space-y-3">
              <h2 className="text-[17px] font-semibold text-[var(--ink)]">
                {locale === "pt-br" ? "Aplicação no Terminal TradCopilot" : "Aplicación en el Terminal TradCopilot"}
              </h2>
              <p>
                {locale === "pt-br"
                  ? "Nosso motor de análise em tempo real calcula automaticamente indicadores como RSI, MACD, EMA e VWAP a partir de dados reais de velas (Binance para cripto e TwelveData para forex). O diário de trading armazena as últimas 20 operações e monitora disciplina, alertando sobre comportamentos impulsivos e overtrading."
                  : "Nuestro motor de análisis en tiempo real calcula automáticamente indicadores como RSI, MACD, EMA y VWAP a partir de datos reales de velas (Binance para cripto y TwelveData para forex). El diario de trading almacena las últimas 20 operaciones y supervisa la disciplina, alertando sobre comportamientos impulsivos y overtrading."}
              </p>
            </div>
          </section>

          <hr className="tc-rule" />

          {/* ── Related Guides ── */}
          <section className="space-y-4">
            <span className="tp-eyebrow-mono block">
              {locale === "pt-br" ? "OUTROS GUIAS PRÁTICOS" : "OTROS GUÍAS PRÁCTICOS"}
            </span>
            <div className="grid gap-3 sm:grid-cols-2">
              {otherGuides.slice(0, 4).map((og) => (
                <Link
                  key={og.slug}
                  href={lp(`/guides/${og.slug}`)}
                  className="tc-card group block space-y-1.5 hover:border-[var(--accent)] transition-colors"
                >
                  <span className="tp-eyebrow-mono text-[9px]">{og.tag}</span>
                  <span className="tc-arrow-link font-medium text-xs block">
                    {og.name} <ArrowRight size={12} />
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <hr className="tc-rule" />

          {/* ── Bottom CTA ── */}
          <section className="tc-terminal p-6 sm:p-10 text-center space-y-4">
            <h2 className="tp-h2">{dict.guides.ctaHeading}</h2>
            <p className="tp-body max-w-xl mx-auto text-[13px] sm:text-[14px]">
              {dict.guides.ctaBody}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              <Link href="/signup" className="btn-primary btn-lg">
                {dict.common.startFree}
              </Link>
              <Link href={lp("/ai-chart-analysis")} className="btn-secondary btn-lg">
                {dict.common.viewFeatures}
              </Link>
            </div>
            <p className="text-[11px] text-[var(--muted)]">
              {dict.common.disclaimerShort}
            </p>
          </section>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
