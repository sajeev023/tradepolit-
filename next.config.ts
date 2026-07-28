import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    instantNavigationDevToolsToggle: true,
    optimizePackageImports: ["lucide-react", "framer-motion", "recharts"],
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
        ],
      },
    ];
  },

};

export default nextConfig;
