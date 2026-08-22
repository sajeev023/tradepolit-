import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/pricing",
          "/changelog",
          "/terms",
          "/privacy",
          "/refund",
          "/disclaimer",
          "/cookies",
          "/acceptable-use",
        ],
        disallow: [
          "/api/",
          "/auth/",
          "/admin/",
          "/dashboard/",
          "/settings/",
          "/charts/",
          "/watchlist/",
          "/news/",
          "/journal/",
          "/ai-assistant/",
          "/alerts/",
          "/analytics/",
          "/backtester/",
          "/market-pulse/",
          "/risk-calculator/",
          "/login",
          "/signup",
          "/forgot-password",
          "/reset-password",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

