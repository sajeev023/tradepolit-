import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";
import {
  LOCALIZABLE_PAGES,
  NON_DEFAULT_LOCALE_KEYS,
  LOCALE_CONFIGS,
  SUPPORTED_LOCALE_KEYS,
  localePath,
} from "@/lib/i18n/config";

/**
 * Public sitemap. Only canonical, indexable marketing, guide, comparison,
 * and legal routes belong here.
 *
 * International SEO: for every route that appears in LOCALIZABLE_PAGES,
 * locale-prefixed variants (e.g., /pt-br/ai-chart-analysis) are also emitted
 * with hreflang alternates pointing to all language versions.
 *
 * lastModified policy: static ISO dates that are bumped when a page's
 * content meaningfully changes.
 */

const ROUTES: Array<{
  path: string;
  priority: number;
  changeFrequency: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  /** Date of the last meaningful content change for this route. */
  lastModified: string;
}> = [
  { path: "/", priority: 1.0, changeFrequency: "weekly", lastModified: "2026-08-23" },
  { path: "/features", priority: 0.9, changeFrequency: "monthly", lastModified: "2026-08-22" },
  { path: "/ai-trading-copilot", priority: 0.9, changeFrequency: "monthly", lastModified: "2026-08-23" },
  { path: "/ai-chart-analysis", priority: 0.9, changeFrequency: "monthly", lastModified: "2026-08-22" },
  { path: "/crypto-market-analysis", priority: 0.8, changeFrequency: "monthly", lastModified: "2026-08-23" },
  { path: "/forex-market-analysis", priority: 0.8, changeFrequency: "monthly", lastModified: "2026-08-23" },
  { path: "/trading-journal", priority: 0.9, changeFrequency: "monthly", lastModified: "2026-08-22" },
  { path: "/risk-management", priority: 0.8, changeFrequency: "monthly", lastModified: "2026-08-22" },
  { path: "/trading-alerts", priority: 0.8, changeFrequency: "monthly", lastModified: "2026-08-22" },
  { path: "/pricing", priority: 0.9, changeFrequency: "monthly", lastModified: "2026-08-22" },
  { path: "/faq", priority: 0.7, changeFrequency: "monthly", lastModified: "2026-08-22" },
  { path: "/about", priority: 0.6, changeFrequency: "yearly", lastModified: "2026-08-22" },
  { path: "/compare", priority: 0.6, changeFrequency: "monthly", lastModified: "2026-08-23" },
  { path: "/compare/tradcopilot-vs-tradingview", priority: 0.7, changeFrequency: "monthly", lastModified: "2026-08-22" },
  { path: "/compare/tradcopilot-vs-chatgpt", priority: 0.7, changeFrequency: "monthly", lastModified: "2026-08-22" },
  { path: "/guides", priority: 0.6, changeFrequency: "weekly", lastModified: "2026-08-23" },
  { path: "/guides/position-sizing-guide", priority: 0.7, changeFrequency: "monthly", lastModified: "2026-08-22" },
  { path: "/guides/technical-indicators", priority: 0.7, changeFrequency: "monthly", lastModified: "2026-08-23" },
  { path: "/guides/multi-timeframe-analysis", priority: 0.7, changeFrequency: "monthly", lastModified: "2026-08-23" },
  { path: "/guides/trading-discipline", priority: 0.7, changeFrequency: "monthly", lastModified: "2026-08-22" },
  { path: "/guides/support-and-resistance", priority: 0.7, changeFrequency: "monthly", lastModified: "2026-08-22" },
  { path: "/changelog", priority: 0.7, changeFrequency: "weekly", lastModified: "2026-08-15" },
  { path: "/terms", priority: 0.4, changeFrequency: "yearly", lastModified: "2026-07-12" },
  { path: "/privacy", priority: 0.4, changeFrequency: "yearly", lastModified: "2026-07-12" },
  { path: "/refund", priority: 0.4, changeFrequency: "yearly", lastModified: "2026-07-12" },
  { path: "/disclaimer", priority: 0.4, changeFrequency: "yearly", lastModified: "2026-07-12" },
  { path: "/cookies", priority: 0.3, changeFrequency: "yearly", lastModified: "2026-07-12" },
  { path: "/acceptable-use", priority: 0.3, changeFrequency: "yearly", lastModified: "2026-07-12" },
];

/**
 * Builds hreflang alternates for a given English path (used in sitemap entries).
 * Only emitted for localizable pages.
 */
function buildAlternates(basePath: string, baseUrl: string) {
  if (!LOCALIZABLE_PAGES.includes(basePath)) return undefined;
  const languages: Record<string, string> = {};
  for (const loc of SUPPORTED_LOCALE_KEYS) {
    const config = LOCALE_CONFIGS[loc];
    const locPath = localePath(loc, basePath);
    languages[config.hreflang] = locPath === "/" ? `${baseUrl}/` : `${baseUrl}${locPath}`;
  }
  languages["x-default"] = basePath === "/" ? `${baseUrl}/` : `${baseUrl}${basePath}`;
  return { languages };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();
  const entries: MetadataRoute.Sitemap = [];

  for (const route of ROUTES) {
    const url = route.path === "/" ? `${baseUrl}/` : `${baseUrl}${route.path}`;
    const alternates = buildAlternates(route.path, baseUrl);

    // English (root) entry
    entries.push({
      url,
      lastModified: new Date(route.lastModified),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      ...(alternates ? { alternates } : {}),
    });

    // Locale entries for localizable pages
    if (LOCALIZABLE_PAGES.includes(route.path)) {
      for (const loc of NON_DEFAULT_LOCALE_KEYS) {
        const locPath = localePath(loc, route.path);
        entries.push({
          url: `${baseUrl}${locPath}`,
          lastModified: new Date(route.lastModified),
          changeFrequency: route.changeFrequency,
          priority: Math.max(route.priority - 0.1, 0.3), // Locale variants slightly lower priority
          alternates,
        });
      }
    }
  }

  return entries;
}
