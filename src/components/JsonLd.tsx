const siteUrl = "https://tradcopilot.com";

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "TradCopilot",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "AI-powered trading copilot that analyzes charts, tracks behavioral patterns, and provides real-time coaching for crypto and forex traders.",
  url: siteUrl,
  offers: [
    {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free plan with 5 analyses per day",
    },
    {
      "@type": "Offer",
      price: "7.49",
      priceCurrency: "USD",
      description: "Pro plan with unlimited analyses",
    },
  ],
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "TradCopilot",
  url: siteUrl,
  description:
    "AI-powered trading copilot for crypto and forex traders.",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${siteUrl}/search?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "TradCopilot Inc.",
  url: siteUrl,
  description:
    "Builds AI-powered trading tools for retail traders.",
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How is TradCopilot different from ChatGPT?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "TradCopilot runs context-aware analysis on live candlestick data, indicators, and risk metrics. Unlike general LLMs, it retains persistent memory of your trades, journals, and behavioral patterns across sessions.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need to connect my brokerage?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. TradCopilot operates as a standalone copilot. You import watchlists, review indicators, log entries, and receive real-time psychology coaching — all without connecting any trading account.",
      },
    },
    {
      "@type": "Question",
      name: "What markets do you support?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "All major cryptocurrencies (BTC, ETH, SOL), Forex pairs (EUR/USD, GBP/USD), and indices. Equities and futures support is actively being expanded.",
      },
    },
    {
      "@type": "Question",
      name: "Is there a free trial for Pro?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes — a 7-day free trial on the Pro plan gives you unlimited analyses, alerts, weekly reports, and behavioral detection risk-free.",
      },
    },
    {
      "@type": "Question",
      name: "Can I cancel anytime?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Absolutely. Cancel, pause, or adjust your plan from Settings with a single click. No lock-in contracts.",
      },
    },
    {
      "@type": "Question",
      name: "How does behavioral detection work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The system monitors trade velocity, loss ratios, sizing errors, and drawdown patterns. If it detects overtrading or revenge trading, it alerts you inside the copilot panel before you deploy capital.",
      },
    },
  ],
};

export function JsonLd() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema),
        }}
      />
    </>
  );
}
