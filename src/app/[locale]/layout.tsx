import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { parseLocale, LOCALE_CONFIGS, NON_DEFAULT_LOCALE_KEYS } from "@/lib/i18n/config";

/**
 * Tell Next.js which locale segments to pre-render at build time.
 * Only non-default locales (pt-br, es) get routes under [locale].
 * English is served from the root without a prefix.
 */
export function generateStaticParams() {
  return NON_DEFAULT_LOCALE_KEYS.map((loc) => ({ locale: loc }));
}

/**
 * Layout for locale-prefixed SEO pages (e.g., /pt-br/*, /es/*).
 *
 * This layout:
 *  1. Validates the locale segment against supported locales.
 *  2. Does NOT wrap with <html>/<body> — that's the root layout's job.
 *     Instead, it sets the lang attribute via Next.js metadata.
 *  3. Passes the locale to children via params.
 */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = parseLocale(localeParam);

  // Invalid locale → 404
  if (!locale || locale === "en") {
    notFound();
  }

  return (
    <div lang={LOCALE_CONFIGS[locale].code}>
      {children}
    </div>
  );
}
