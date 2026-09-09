/**
 * src/lib/seo.ts
 *
 * Central SEO layer for TradCopilot's public marketing surface.
 *
 * Responsibilities:
 *  - Canonical site constants (single source of truth alongside lib/site-url.ts).
 *  - buildMetadata(): per-page Metadata with correct canonical, Open Graph and
 *    Twitter values. Root layout deliberately does NOT set alternates.canonical;
 *    every indexable page must derive its canonical from here so pages stop
 *    inheriting the homepage canonical (the old behaviour collapsed /pricing,
 *    /changelog and all legal pages onto "/" for search engines).
 *  - JSON-LD builders (schema.org) restricted to truthful, code-verifiable
 *    claims. See docs/PRODUCT_SPEC.md and src/lib/* for ground truth:
 *    9 supported instruments, RSI/MACD/EMA/ATR/VWAP indicators, revenge-trade
 *    and overtrading detectors, read-only (no execution, no broker links),
 *    $0 free tier (5 analyses/day) and $7.49/month Pro.
 *  - International SEO: locale-aware metadata, hreflang alternates, OG locale,
 *    and JSON-LD inLanguage for all supported locales.
 *
 * Usage on any server page/layout:
 *   // English (default — backwards compatible):
 *   export const metadata = buildMetadata({ title: "...", description: "...", path: "/pricing" });
 *   // Localized:
 *   export const metadata = buildMetadata({ title: "...", description: "...", path: "/pricing", locale: "pt-br" });
 */

import type { Metadata } from "next";
import {
  type SupportedLocale,
  DEFAULT_LOCALE,
  LOCALE_CONFIGS,
  SUPPORTED_LOCALE_KEYS,
  LOCALIZABLE_PAGES,
  localePath,
} from "@/lib/i18n/config";

/** Canonical production origin. Never localhost — see lib/site-url.ts for env-aware dev fallbacks. */
export const SITE_URL = "https://tradcopilot.com";
export const SITE_NAME = "TradCopilot";
/** Public support address shown in the landing footer (mailto link on "/"). */
export const SUPPORT_EMAIL = "hello@tradcopilot.com";
/** Public social profiles linked from the landing footer. Used for Organization.sameAs. */
export const SOCIAL_PROFILES = [
  "https://x.com/tradcopilot",
  "https://linkedin.com/company/tradcopilot",
];

/**
 * One-line entity definition used consistently across metadata, JSON-LD and
 * page copy so search engines and answer engines see a single description of
 * what TradCopilot is.
 */
export const ENTITY_DEFINITION =
  "TradCopilot is a web-based, read-only AI trading copilot for crypto and forex day traders: it computes technical indicators from live candlestick data, explains setups in plain language, journals every session, and warns against emotional patterns like revenge trading and overtrading.";

// ---------------------------------------------------------------------------
// Page metadata
// ---------------------------------------------------------------------------

export interface PageMetaInput {
  /** Page title. Rendered through the root "%s | TradCopilot" template unless absolute. */
  title: string;
  /** Unique meta description (150–165 chars recommended). */
  description: string;
  /** Canonical path on the production origin, e.g. "/", "/pricing", "/guides/x".
   *  For localized pages, this is the BASE English path (e.g. "/pricing"),
   *  not the locale-prefixed path. The locale prefix is derived from the locale param. */
  path: string;
  /** Locale for this page. Defaults to "en" (backwards compatible). */
  locale?: SupportedLocale;
  /** Absolute title override (bypasses template). Only the homepage needs this. */
  titleAbsolute?: boolean;
  /** A handful of genuinely topical keywords. Optional; never stuffed. */
  keywords?: string[];
  /** Open Graph type; "article" for dated editorial content. Defaults to "website". */
  ogType?: "website" | "article";
  /** Published/modified ISO timestamps for article-type pages. */
  publishedTime?: string;
  modifiedTime?: string;
  /** Emit robots noindex (crawlable but non-indexable) for utility pages. */
  noindex?: boolean;
}

export function buildMetadata({
  title,
  description,
  path,
  locale = DEFAULT_LOCALE,
  titleAbsolute = false,
  keywords,
  ogType = "website",
  publishedTime,
  modifiedTime,
  noindex = false,
}: PageMetaInput): Metadata {
  const localeConfig = LOCALE_CONFIGS[locale];
  // Build the actual canonical path for this locale
  const canonicalPath = localePath(locale, path);
  const url = canonicalPath === "/" ? SITE_URL : `${SITE_URL}${canonicalPath}`;
  const ogTitle = titleAbsolute ? title : `${title} | ${SITE_NAME}`;

  // Build hreflang alternates: only include locales where this page is localizable
  const isLocalizable = LOCALIZABLE_PAGES.includes(path);
  const languages: Record<string, string> = {};
  if (isLocalizable) {
    for (const loc of SUPPORTED_LOCALE_KEYS) {
      const config = LOCALE_CONFIGS[loc];
      const locPath = localePath(loc, path);
      const locUrl = locPath === "/" ? `${SITE_URL}/` : `${SITE_URL}${locPath}`;
      languages[config.hreflang] = locUrl;
    }
    // x-default points to the English (root) version
    const defaultPath = path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`;
    languages["x-default"] = defaultPath;
  }

  const metadata: Metadata = {
    title: titleAbsolute ? { absolute: title } : title,
    description,
    alternates: {
      // Relative paths resolve against metadataBase from the root layout.
      // "/" intentionally emits the bare origin (https://tradcopilot.com),
      // matching how Next normalizes the trailing-slash 308.
      canonical: canonicalPath,
      ...(isLocalizable && Object.keys(languages).length > 0
        ? { languages }
        : {}),
    },
    openGraph: {
      title: ogTitle,
      description,
      url,
      siteName: SITE_NAME,
      type: ogType,
      locale: localeConfig.ogLocale,
      ...(ogType === "article" && publishedTime ? { publishedTime } : {}),
      ...(ogType === "article" && modifiedTime ? { modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
    },
  };

  if (keywords && keywords.length > 0) {
    metadata.keywords = keywords;
  }

  if (noindex) {
    metadata.robots = {
      index: false,
      follow: true,
    };
  }

  return metadata;
}

// ---------------------------------------------------------------------------
// JSON-LD builders — truthful, code-verifiable claims only.
// ---------------------------------------------------------------------------

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

export interface FaqItem {
  question: string;
  answer: string;
}

/** Organization entity — establishes who is behind TradCopilot. */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon.svg`,
    description:
      "Maker of TradCopilot, a read-only AI trading copilot that analyzes crypto and forex charts, journals sessions, and coaches trading discipline.",
    email: SUPPORT_EMAIL,
    sameAs: SOCIAL_PROFILES,
  };
}

/** WebSite entity — identity of the site itself. No SearchAction: there is no public /search route.
 *  Accepts an optional locale to set the correct inLanguage. */
export function websiteJsonLd(locale: SupportedLocale = DEFAULT_LOCALE) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: LOCALE_CONFIGS[locale].code,
    description:
      "AI-powered trading copilot for crypto and forex market analysis, journaling, and risk awareness.",
    publisher: { "@id": ORGANIZATION_ID },
  };
}

/** SoftwareApplication — the product entity. Offers/prices mirror src/lib/entitlements.ts and Stripe checkout ($0 free tier, $7.49/month Pro). */
export function softwareApplicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: SITE_URL,
    description:
      "Read-only AI trading copilot for crypto and forex: live technical analysis (RSI, MACD, EMA, ATR, VWAP), session journaling, behavioral guardrails, risk position sizing, and backtesting in one workspace.",
    isAccessibleForFree: true,
    offers: [
      {
        "@type": "Offer",
        name: "Free",
        price: "0",
        priceCurrency: "USD",
        description:
          "Free plan: 5 AI chart analyses per day, 3 alerts per day, trading journal, and watchlists.",
      },
      {
        "@type": "Offer",
        name: "Pro Terminal",
        price: "7.49",
        priceCurrency: "USD",
        description:
          "Pro plan at $7.49 per month: unlimited AI analyses and alerts, performance analytics dashboard, weekly reports, and behavioral event logging.",
      },
    ],
    featureList: [
      "AI chart analysis computed from live candlestick data (RSI, MACD, EMA, ATR, VWAP)",
      "Structured trade setups with bias, setup quality, entry/stop/target ideas, and invalidation levels",
      "Automated session trade journal with emotion and mistake tagging",
      "Revenge-trade and overtrading detection with pre-trade risk warnings",
      "Position size calculator with leverage-aware outputs for crypto, forex, gold, and indices",
      "Rule-based EMA-crossover strategy backtesting on recent candle history",
      "Price, RSI, EMA-cross, and trend-change alerts",
      "Crypto and forex news feed with keyword-based sentiment classification",
      "Market pulse dashboard: Fear & Greed Index, funding rates, trending assets",
    ],
    publisher: { "@id": ORGANIZATION_ID },
  };
}

/** FAQPage — ONLY render on pages whose visible content contains these exact questions and answers. */
export function faqPageJsonLd(faqs: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export interface BreadcrumbItem {
  name: string;
  /** Path beginning with "/" — the root item uses "/". */
  path: string;
}

/** BreadcrumbList — pass the visible trail; the root (Home) is prepended automatically unless already present. */
export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  const trail =
    items[0]?.path === "/" ? items : [{ name: "Home", path: "/" }, ...items];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.path === "/" ? `${SITE_URL}/` : `${SITE_URL}${item.path}`,
    })),
  };
}

/** BlogPosting for dated editorial/guide pages. */
export function articleJsonLd({
  headline,
  description,
  path,
  datePublished,
  dateModified,
  locale = DEFAULT_LOCALE,
}: {
  headline: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified?: string;
  locale?: SupportedLocale;
}) {
  const fullPath = localePath(locale, path);
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline,
    description,
    mainEntityOfPage: `${SITE_URL}${fullPath}`,
    url: `${SITE_URL}${fullPath}`,
    datePublished,
    ...(dateModified ? { dateModified } : {}),
    author: { "@id": ORGANIZATION_ID },
    publisher: {
      "@type": "Organization",
      "@id": ORGANIZATION_ID,
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.svg` },
    },
    inLanguage: LOCALE_CONFIGS[locale].code,
  };
}

/**
 * Resolve a site-relative path to an absolute production URL (for nav data,
 * sitemaps, and cross-linking helpers).
 */
export function absoluteUrl(path: string): string {
  return path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`;
}
