/**
 * src/lib/i18n/config.ts
 *
 * Central i18n configuration for TradCopilot's international SEO surface.
 *
 * Only PUBLIC marketing/SEO pages are localized. The authenticated app
 * (dashboard, charts, journal, etc.) remains English-only.
 *
 * Adding a new locale:
 *  1. Add an entry to SUPPORTED_LOCALES below.
 *  2. Create the corresponding dictionary in ./dictionaries/<locale>.ts.
 *  3. Add the locale to getDictionary() in ./get-dictionary.ts.
 *  4. Add localized content pages under src/app/[locale]/.
 *  5. Run `npm run typecheck && npm run build` to verify.
 */

// ---------------------------------------------------------------------------
// Locale types
// ---------------------------------------------------------------------------

/** Supported locale codes. Keep in sync with dictionaries and [locale] routes. */
export type SupportedLocale = "en" | "pt-br" | "es";

/** Metadata for each supported locale. */
export interface LocaleConfig {
  /** BCP 47 code used in <html lang> and hreflang. */
  code: string;
  /** ISO language tag for hreflang attribute (lowercase with region). */
  hreflang: string;
  /** OpenGraph locale string (e.g., "pt_BR"). */
  ogLocale: string;
  /** Native language name displayed in the language switcher. */
  nativeName: string;
  /** English name for internal reference. */
  englishName: string;
  /** URL path prefix. Empty string for default locale (English). */
  pathPrefix: string;
  /** Whether this is the default locale (English). */
  isDefault: boolean;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export const DEFAULT_LOCALE: SupportedLocale = "en";

export const LOCALE_CONFIGS: Record<SupportedLocale, LocaleConfig> = {
  en: {
    code: "en",
    hreflang: "en",
    ogLocale: "en_US",
    nativeName: "English",
    englishName: "English",
    pathPrefix: "",
    isDefault: true,
  },
  "pt-br": {
    code: "pt-BR",
    hreflang: "pt-BR",
    ogLocale: "pt_BR",
    nativeName: "Português",
    englishName: "Portuguese (Brazil)",
    pathPrefix: "/pt-br",
    isDefault: false,
  },
  es: {
    code: "es",
    hreflang: "es",
    ogLocale: "es_ES",
    nativeName: "Español",
    englishName: "Spanish",
    pathPrefix: "/es",
    isDefault: false,
  },
};

/** All supported locale keys. */
export const SUPPORTED_LOCALE_KEYS = Object.keys(LOCALE_CONFIGS) as SupportedLocale[];

/** Non-default locale keys (used in [locale] routing). */
export const NON_DEFAULT_LOCALE_KEYS = SUPPORTED_LOCALE_KEYS.filter(
  (k) => !LOCALE_CONFIGS[k].isDefault
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Validates and returns a SupportedLocale from a route parameter.
 * Returns undefined if the locale is not supported.
 */
export function parseLocale(value: string | undefined): SupportedLocale | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase();
  if (SUPPORTED_LOCALE_KEYS.includes(lower as SupportedLocale)) {
    return lower as SupportedLocale;
  }
  return undefined;
}

/**
 * Returns the config for a given locale, falling back to the default.
 */
export function getLocaleConfig(locale: SupportedLocale): LocaleConfig {
  return LOCALE_CONFIGS[locale] ?? LOCALE_CONFIGS[DEFAULT_LOCALE];
}

/**
 * Builds the full path for a page in a given locale.
 * English (default) → bare path. Others → prefixed path.
 *
 * @example
 *   localePath("en", "/ai-chart-analysis")     → "/ai-chart-analysis"
 *   localePath("pt-br", "/ai-chart-analysis")   → "/pt-br/ai-chart-analysis"
 *   localePath("pt-br", "/")                     → "/pt-br"
 */
export function localePath(locale: SupportedLocale, path: string): string {
  const config = LOCALE_CONFIGS[locale];
  if (config.isDefault) return path;
  if (path === "/") return config.pathPrefix;
  return `${config.pathPrefix}${path}`;
}

/**
 * SEO-indexable pages that should be localized.
 * Maps to the English path that each locale version mirrors.
 */
export const LOCALIZABLE_PAGES: string[] = [
  "/",
  "/ai-trading-copilot",
  "/ai-chart-analysis",
  "/crypto-market-analysis",
  "/forex-market-analysis",
  "/trading-journal",
  "/risk-management",
  "/trading-alerts",
  "/features",
  "/pricing",
  "/faq",
  "/guides",
  "/guides/position-sizing-guide",
  "/guides/technical-indicators",
  "/guides/multi-timeframe-analysis",
  "/guides/trading-discipline",
  "/guides/support-and-resistance",
];
