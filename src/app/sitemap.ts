import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://tradcopilot.com";

  const staticRoutes = [
    { path: "", priority: 1.0, changeFreq: "weekly" as const },
    { path: "/pricing", priority: 0.9, changeFreq: "weekly" as const },
    { path: "/terms", priority: 0.4, changeFreq: "monthly" as const },
    { path: "/privacy", priority: 0.4, changeFreq: "monthly" as const },
    { path: "/refund", priority: 0.4, changeFreq: "monthly" as const },
    { path: "/disclaimer", priority: 0.3, changeFreq: "monthly" as const },
    { path: "/cookies", priority: 0.3, changeFreq: "monthly" as const },
    { path: "/acceptable-use", priority: 0.3, changeFreq: "monthly" as const },
  ];

  return staticRoutes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: new Date().toISOString(),
    changeFrequency: route.changeFreq,
    priority: route.priority,
  }));
}
