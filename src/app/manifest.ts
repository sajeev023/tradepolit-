import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TradePilot — AI-Powered Trading Copilot",
    short_name: "TradePilot",
    description:
      "The AI copilot that reads your charts, remembers every session, tracks behavioral patterns, and coaches you past emotional mistakes.",
    start_url: "/",
    display: "standalone",
    background_color: "#0A0A09",
    theme_color: "#0A0A09",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
    categories: ["finance", "productivity", "utilities"],
  };
}
