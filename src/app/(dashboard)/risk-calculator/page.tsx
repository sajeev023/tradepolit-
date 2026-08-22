import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import RiskCalculatorClient from "./risk-calculator-client";

/**
 * Server page shell: static metadata (noindex) + the client calculator.
 * robots.txt deliberately does not disallow /risk-calculator, so this page
 * must carry its own noindex directive.
 */
export const metadata: Metadata = buildMetadata({
  title: "Risk Calculator",
  description:
    "Leverage-aware position sizing, margin required, and reward-to-risk math for crypto, forex, gold, and index trades.",
  path: "/risk-calculator",
  noindex: true,
});

export default function RiskCalculatorPage() {
  return <RiskCalculatorClient />;
}
