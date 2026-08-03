import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    instantNavigationDevToolsToggle: true,
  },
  async redirects() {
    return [
      {
        source: "/ai-assistant",
        destination: "/charts",
        permanent: true,
      },
    ];
  },
  async headers() {
    const isProduction = process.env.NODE_ENV === "production";
    const isDev = process.env.NODE_ENV === "development";

    // Static Content-Security-Policy (no nonces). A nonce-based policy would
    // require the proxy/middleware to generate a per-request nonce and force
    // every page into dynamic rendering (disabling ISR/CDN caching) — a
    // performance regression and a larger structural change. The static policy
    // instead allows the specific third-party origins the app actually uses
    // (TradingView chart embed, Binance live WebSocket, Microsoft Clarity,
    // Supabase auth) and confines everything else.
    //
    // 'unsafe-inline' is required for script-src/style-src because the app
    // ships an inline script in the root layout and uses CSS-in-JS
    // (framer-motion) plus Next.js inline styles. object-src 'none',
    // base-uri/form-action 'self', frame-ancestors 'self', and the scoped
    // connect-src still provide real protection (no plugin execution, no
    // form/data exfiltration to arbitrary origins, no clickjacking).
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://*.supabase.co";
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' https://*.tradingview.com https://*.clarity.ms${
        isDev ? " 'unsafe-eval'" : ""
      }`,
      "style-src 'self' 'unsafe-inline' https://*.tradingview.com",
      "img-src 'self' blob: data: https:",
      "font-src 'self' data:",
      `connect-src 'self' wss://stream.binance.com:9443 https://*.clarity.ms https://*.tradingview.com wss://*.tradingview.com ${supabaseUrl}`,
      "frame-src https://*.tradingview.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      ...(isProduction ? ["upgrade-insecure-requests"] : []),
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: csp,
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // HSTS only in production — never pin localhost dev traffic to HTTPS.
          ...(isProduction
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]
            : []),
        ],
      },
    ];
  },

};

export default nextConfig;
