import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Providers } from "./providers";
import { SmoothScrollProvider } from "@/components/ui/smooth-scroll-provider";
import { LiquidCursor } from "@/components/ui/liquid-cursor";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GlobalLoader } from "@/components/GlobalLoader";
import { OfflineBanner } from "@/components/OfflineBanner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { JsonLd } from "@/components/JsonLd";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://tradepilot.app";
const siteName = "TradePilot";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "TradePilot — AI-Powered Trading Copilot",
    template: "%s | TradePilot",
  },
  description:
    "The AI copilot that reads your charts, remembers every session, tracks behavioral patterns, and coaches you past emotional mistakes. Built for serious traders.",
  keywords: [
    "trading",
    "AI copilot",
    "crypto",
    "forex",
    "journal",
    "analytics",
    "behavioral detection",
    "backtesting",
    "risk management",
  ],
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: "TradePilot — AI-Powered Trading Copilot",
    description: "The AI copilot that trades with your discipline. Charts, memory, behavioral detection, and coaching in one workspace.",
    siteName,
    type: "website",
    locale: "en_US",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "TradePilot — AI-Powered Trading Copilot",
    description: "The AI copilot that trades with your discipline.",
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
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__TP_START = performance.now();
              if (window.gtag) { window.gtag('event', 'page_view'); }
            `,
          }}
        />
      </head>
      <body className="antialiased selection:bg-emerald-500/20 selection:text-emerald-300">
        <JsonLd />
        <ErrorBoundary>
          <Providers>
            <Suspense fallback={null}>
              <GlobalLoader />
            </Suspense>
            <OfflineBanner />
            <Analytics />
            <SpeedInsights />
            <SmoothScrollProvider>
              <LiquidCursor />
              {children}
            </SmoothScrollProvider>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
