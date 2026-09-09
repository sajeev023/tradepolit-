import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

/**
 * robots.txt strategy:
 *
 *  - Genuinely private surfaces (APIs, auth flow internals, the authenticated
 *    app) are disallowed with PREFIX patterns WITHOUT trailing slashes —
 *    "Disallow: /dashboard/" never matched "/dashboard" itself under the old
 *    list, so most of the previous disallow block blocked nothing.
 *
 *  - Pages that must stay crawlable but non-indexable (login/signup and the
 *    three anonymous utility tools) are NOT listed here. Blocking them in
 *    robots.txt would prevent crawlers from ever seeing their <meta
 *    name="robots" content="noindex"> directive; those pages carry noindex
 *    metadata instead.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/auth/",
          // Authenticated app surfaces (prefix match covers subpaths too).
          "/admin",
          "/dashboard",
          "/settings",
          "/charts",
          "/watchlist",
          "/journal",
          "/alerts",
          "/analytics",
          "/backtester",
          "/ai-assistant",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
