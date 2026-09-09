import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import NewsClient from "./news-client";

/**
 * Server page shell: static metadata (noindex) + the client news feed.
 * robots.txt deliberately does not disallow /news, so this page must carry
 * its own noindex directive.
 */
export const metadata: Metadata = buildMetadata({
  title: "Market News Feed",
  description:
    "Aggregated crypto and forex headlines with keyword-based bullish, bearish, or neutral sentiment classification.",
  path: "/news",
  noindex: true,
});

export default function NewsPage() {
  return <NewsClient />;
}
