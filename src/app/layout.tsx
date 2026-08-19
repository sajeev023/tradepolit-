import type { Metadata } from "next";
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
import { MicrosoftClarity } from "@/components/MicrosoftClarity";

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
    default: "TradCopilot | Institutional Trading Terminal & Discipline Journal",
    template: "%s | TradCopilot",
  },
  description:
    "Real-time technical chart analysis, automated session trade journal, behavioral guardrails, and risk verification for active day traders.",
  keywords: [
    "trading terminal",
    "technical analysis",
    "crypto",
    "forex",
    "trading journal",
    "analytics",
    "behavioral detection",
    "backtesting",
    "risk management",
  ],
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: "TradCopilot | Institutional Trading Terminal & Discipline Journal",
    description: "Real-time technical chart analysis, trade journaling, and behavioral discipline enforcement in one workspace.",
    siteName,
    type: "website",
    locale: "en_US",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "TradCopilot | Institutional Trading Terminal & Discipline Journal",
    description: "Real-time technical chart analysis, trade journaling, and behavioral discipline enforcement.",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${spaceGrotesk.variable} ${newsreader.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://www.clarity.ms" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.clarity.ms" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__TP_START = performance.now();
              if (window.gtag) { window.gtag('event', 'page_view'); }
            `,
          }}
        />
      </head>
      <body className="antialiased">
        <JsonLd />
        <ErrorBoundary>
          <Providers>
            <Suspense fallback={null}>
              <GlobalLoader />
            </Suspense>
            <OfflineBanner />
            <Analytics />
            <SpeedInsights />
            <MicrosoftClarity />
            <SmoothScrollProvider>
              {children}
            </SmoothScrollProvider>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
