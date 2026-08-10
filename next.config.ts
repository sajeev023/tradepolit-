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
              // connect-src must allow:
              //   - TradingView widget data endpoints (the iframe streams chart
              //     data over https/wss on *.tradingview.com; s3.tradingview.com
              //     alone is only the script CDN and is NOT enough for the chart
              //     to render live data).
              //   - the browser-direct Binance ticker WebSocket used by
              //     useBinanceStream (wss://stream.binance.com:9443). Without it
              //     the WS upgrade is blocked and the charts page shows the
              //     "Live market data is temporarily unavailable" banner even
              //     though the REST price proxy (same-origin) still works.
              "connect-src 'self' https://s3.tradingview.com https://*.tradingview.com wss://*.tradingview.com https://api.binance.com https://api1.binance.com https://api3.binance.com wss://stream.binance.com:9443 https://api.groq.com https://integrate.api.nvidia.com https://generativelanguage.googleapis.com https://api.twelvedata.com https://finnhub.io https://newsapi.org https://api.exchange.coinbase.com https://*.supabase.co wss://*.supabase.co; " +
              // frame-src: the TradingView embed widget hosts its chart inside an
              // <iframe> on *.tradingview.com. With no frame-src, iframe sources
              // fall back to default-src 'self' and the browser blocks the
              // chart iframe entirely — the chart area renders blank even though
              // tv.js itself loads. Allow only TradingView's iframe origin.
              "frame-src https://*.tradingview.com; " +
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
