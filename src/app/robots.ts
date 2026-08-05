import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://tradcopilot.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/terms", "/privacy", "/refund", "/disclaimer", "/cookies", "/acceptable-use"],
        disallow: ["/api/", "/admin/", "/dashboard/", "/settings/", "/charts/", "/watchlist/", "/news/", "/journal/", "/login", "/signup"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
