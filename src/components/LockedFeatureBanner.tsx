"use client";

import { Eye, BookOpen } from "lucide-react";
import Link from "next/link";

interface LockedFeatureBannerProps {
  feature: string;
  title: string;
  description: string;
}

const FEATURE_CONFIG: Record<string, { icon: string }> = {
  journal: { icon: "📓" },
  dashboard: { icon: "📊" },
  marketOverview: { icon: "📈" },
  savedAnalyses: { icon: "💾" },
  watchlistEdit: { icon: "👁️" },
  chatHistory: { icon: "💬" },
};

export function LockedFeatureBanner({ feature, title, description }: LockedFeatureBannerProps) {
  const config = FEATURE_CONFIG[feature] || { icon: "🔒" };

  return (
    <div
      style={{
        background: "linear-gradient(90deg, rgba(30,212,168,0.08) 0%, rgba(6,182,212,0.06) 100%)",
        border: "1px solid rgba(30,212,168,0.2)",
        borderRadius: 10,
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
      role="status"
    >
      <span style={{ fontSize: 16, flexShrink: 0 }}>{config.icon}</span>
      <p style={{ fontSize: 12, fontWeight: 500, color: "#A1A1AA", margin: 0, lineHeight: 1.4 }}>
        <span style={{ color: "#2DD4BF", fontWeight: 600 }}>Preview Mode:</span>{" "}
        {description}
      </p>
    </div>
  );
}