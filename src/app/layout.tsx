import type { Metadata } from "next";
import type { Viewport } from "next";
import { Suspense } from "react";
import { Inter, Space_Grotesk, JetBrains_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { SmoothScrollProvider } from "@/components/ui/smooth-scroll-provider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GlobalLoader } from "@/components/GlobalLoader";
import { OfflineBanner } from "@/components/OfflineBanner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { JsonLd } from "@/components/JsonLd";
import {
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/seo";

const siteUrl = "https://tradcopilot.com";
const siteName = "TradCopilot";

/* Self-hosted variable fonts (next/font) — no external requests at runtime.
   Inter = body/UI sans, Space Grotesk = technical display (eyebrows/labels),
   Newsreader = editorial serif (landing headlines — the "voice" layer),
   JetBrains Mono = eyebrows/badges/data values (the "data" layer). CSS
   variables are consumed by --font-sans / --font-display / --font-serif /
   --font-mono in globals.css. */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display-font",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-serif-font",
  display: "swap",
  style: ["normal", "italic"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "TradCopilot | AI Trading Copilot for Crypto & Forex Analysis",
    template: "%s | TradCopilot",
  },
  description:
    "Read-only AI trading copilot: live technical chart analysis (RSI, MACD, EMA, ATR), automated session journaling, behavioral guardrails, and risk tools for crypto & forex day traders.",
  keywords: [
    "AI trading copilot",
    "AI chart analysis",
    "crypto market analysis",
    "forex analysis tool",
    "technical analysis",
    "trading journal",
    "risk management",
    "trading discipline",
  ],
  // NOTE: no root alternates.canonical here. Every page sets its own canonical
  // via buildMetadata() in lib/seo.ts — a root-level canonical used to collapse
  // every subpage onto the homepage for search engines.
  openGraph: {
    title: "TradCopilot | AI Trading Copilot for Crypto & Forex Analysis",
    description:
      "Live technical chart analysis, session trade journaling, behavioral guardrails, and risk tools for active crypto & forex traders.",
    siteName,
    type: "website",
    locale: "en_US",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "TradCopilot | AI Trading Copilot for Crypto & Forex Analysis",
    description:
      "Live technical chart analysis, trade journaling, and behavioral discipline guardrails for crypto & forex traders.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#05070B",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${spaceGrotesk.variable} ${newsreader.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        {/* Entity-level structured data: Organization + WebSite on every page.
            Page-specific schemas (SoftwareApplication, FAQPage, BreadcrumbList,
            BlogPosting) are rendered by their own pages via lib/seo.ts builders.
            No SearchAction: there is no public /search route. */}
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
      </head>
      <body className="antialiased">
        <ErrorBoundary>
          <Providers>
            <Suspense fallback={null}>
              <GlobalLoader />
            </Suspense>
            <OfflineBanner />
            <Analytics />
            <SpeedInsights />
            <SmoothScrollProvider>
              {children}
            </SmoothScrollProvider>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
