import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

/**
 * Public sitemap. Only canonical, indexable marketing, guide, comparison,
 * and legal routes belong here.
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
  { path: "/", priority: 1.0, changeFrequency: "weekly", lastModified: "2026-08-22" },
  { path: "/features", priority: 0.9, changeFrequency: "monthly", lastModified: "2026-08-22" },
  { path: "/ai-chart-analysis", priority: 0.9, changeFrequency: "monthly", lastModified: "2026-08-22" },
  { path: "/trading-journal", priority: 0.9, changeFrequency: "monthly", lastModified: "2026-08-22" },
  { path: "/risk-management", priority: 0.8, changeFrequency: "monthly", lastModified: "2026-08-22" },
  { path: "/trading-alerts", priority: 0.8, changeFrequency: "monthly", lastModified: "2026-08-22" },
  { path: "/pricing", priority: 0.9, changeFrequency: "monthly", lastModified: "2026-08-22" },
  { path: "/faq", priority: 0.7, changeFrequency: "monthly", lastModified: "2026-08-22" },
  { path: "/about", priority: 0.6, changeFrequency: "yearly", lastModified: "2026-08-22" },
  { path: "/compare/tradcopilot-vs-tradingview", priority: 0.7, changeFrequency: "monthly", lastModified: "2026-08-22" },
  { path: "/compare/tradcopilot-vs-chatgpt", priority: 0.7, changeFrequency: "monthly", lastModified: "2026-08-22" },
  { path: "/guides/position-sizing-guide", priority: 0.7, changeFrequency: "monthly", lastModified: "2026-08-22" },
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

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();

  return ROUTES.map((route) => ({
    url: route.path === "/" ? `${baseUrl}/` : `${baseUrl}${route.path}`,
    lastModified: new Date(route.lastModified),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
