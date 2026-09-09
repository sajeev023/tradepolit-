import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TradCopilot — AI-Powered Trading Copilot",
    short_name: "TradCopilot",
    description:
      "The AI copilot that reads your charts, remembers every session, tracks behavioral patterns, and coaches you past emotional mistakes.",
    start_url: "/",
    display: "standalone",
    background_color: "#05070B",
    theme_color: "#05070B",
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
