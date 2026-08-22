import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import MarketPulseClient from "./market-pulse-client";

/**
 * Server page shell: static metadata (noindex) + the client dashboard.
 * robots.txt deliberately does not disallow /market-pulse, so this page must
 * carry its own noindex directive.
 */
export const metadata: Metadata = buildMetadata({
  title: "Market Pulse Dashboard",
  description:
    "Fear & Greed Index, perpetual funding rates, and trending crypto assets in one dashboard view.",
  path: "/market-pulse",
  noindex: true,
});

export default function MarketPulsePage() {
  return <MarketPulseClient />;
}
