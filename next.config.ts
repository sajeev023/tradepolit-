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
    return [
      {
        source: "/(.*)",
        headers: [
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
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; " +
              "script-src 'self' https://s3.tradingview.com 'unsafe-inline' 'unsafe-eval'; " +
              "style-src 'self' 'unsafe-inline'; " +
              "img-src 'self' data: https:; " +
              "connect-src 'self' https://s3.tradingview.com https://api.binance.com https://api1.binance.com https://api3.binance.com https://api.groq.com https://integrate.api.nvidia.com https://generativelanguage.googleapis.com https://api.twelvedata.com https://finnhub.io https://newsapi.org https://api.exchange.coinbase.com https://*.supabase.co wss://*.supabase.co; " +
              "font-src 'self' data:; " +
              "frame-ancestors 'self'; " +
              "base-uri 'self'; " +
              "form-action 'self'; " +
              "object-src 'none';",
          },
        ],
      },
    ];
  },

};

export default nextConfig;
