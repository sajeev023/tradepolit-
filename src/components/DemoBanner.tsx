"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { X, AlertCircle, Crown } from "lucide-react";
import { trackClarityEvent } from "@/lib/clarity";

export function DemoBanner() {
  const [isDemo, setIsDemo] = useState(false);
  const [analysesUsed, setAnalysesUsed] = useState(0);
  const [alertsUsed, setAlertsUsed] = useState(0);
  // Quota comes from the server (/api/v1/usage -> entitlements.ts YC_DEMO).
  // Never hardcode the demo limit here — single source of truth is the server.
  const [analysisLimit, setAnalysisLimit] = useState<number | null>(null);
  const [alertLimit, setAlertLimit] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const fetchUsage = useCallback(async (_userId: string) => {
    try {
      const res = await fetch("/api/v1/usage");
      if (res.ok) {
        const data = await res.json();
        setAnalysesUsed(data.data?.analysesUsed || 0);
        setAlertsUsed(data.data?.alertsUsed || 0);
        if (typeof data.data?.limit === "number") setAnalysisLimit(data.data.limit);
        if (typeof data.data?.alertLimit === "number") setAlertLimit(data.data.alertLimit);
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }: any) => {
      const user = data.user;
      const demoEmails = ["partner@tradcopilot.com", "trader@tradcopilot.com"];
      if (user?.email && demoEmails.includes(user.email)) {
        setIsDemo(true);
        fetchUsage(user.id);
      }
    });
  }, [fetchUsage]);

  if (!isDemo || dismissed) return null;

  const analysesRemaining = analysisLimit !== null ? Math.max(0, analysisLimit - analysesUsed) : null;
  const alertsRemaining = alertLimit !== null ? Math.max(0, alertLimit - alertsUsed) : null;
  const limitReached = analysesRemaining !== null && analysesRemaining === 0;

  return (
    <div
      className="demo-banner"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "linear-gradient(90deg, rgba(6, 182, 212,0.15) 0%, rgba(6,182,212,0.15) 100%)",
        borderBottom: "1px solid rgba(6, 182, 212,0.3)",
        padding: "8px 16px",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
      role="banner"
    >
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 280 }}>
          <AlertCircle
            size={16}
            style={{ color: "#06b6d4", flexShrink: 0 }}
            aria-hidden="true"
          />
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "#FAFAFA",
              letterSpacing: "0.01em",
            }}
          >
            {limitReached
              ? `You've completed all ${analysisLimit ?? ""} demo analyses.`
              : analysesRemaining !== null
                ? `YC Demo · ${analysesRemaining} analysis${analysesRemaining !== 1 ? "es" : ""} remaining`
                : "YC Demo"
            }
          </span>
          {alertsRemaining !== null && alertsRemaining < 1 && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#F87171",
                background: "rgba(248,113,113,0.1)",
                padding: "2px 6px",
                borderRadius: 4,
              }}
            >
              Alert limit reached
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Link
            href="/signup"
            onClick={() => trackClarityEvent("demo_banner_create_account_click")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "8px 16px",
              background: "linear-gradient(135deg, #06b6d4 0%, #06B6D4 100%)",
              color: "#09090B",
              fontSize: 12,
              fontWeight: 700,
              borderRadius: 8,
              textDecoration: "none",
              boxShadow: "0 2px 8px rgba(6, 182, 212,0.3)",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(6, 182, 212,0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(6, 182, 212,0.3)";
            }}
          >
            Create Free Account
          </Link>

          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss preview banner"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: 6,
              border: "none",
              background: "rgba(255,255,255,0.05)",
              color: "#71717A",
              cursor: "pointer",
              transition: "background 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.1)";
              e.currentTarget.style.color = "#FAFAFA";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              e.currentTarget.style.color = "#71717A";
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function LockedFeatureBadge({ feature }: { feature: string }) {
  const featureLabels: Record<string, { label: string; tier: "free" | "pro" }> = {
    journal: { label: "Journal", tier: "free" },
    dashboard: { label: "Performance Dashboard", tier: "pro" },
    marketOverview: { label: "Market Overview", tier: "pro" },
    savedAnalyses: { label: "Saved Analyses", tier: "free" },
    watchlistEdit: { label: "Custom Watchlist", tier: "free" },
    chatHistory: { label: "Chat History", tier: "free" },
  };

  const { label, tier } = featureLabels[feature] || { label: feature, tier: "pro" };
  const isPro = tier === "pro";

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        background: isPro ? "rgba(139,92,246,0.1)" : "rgba(6, 182, 212,0.1)",
        border: isPro ? "1px solid rgba(139,92,246,0.3)" : "1px solid rgba(6, 182, 212,0.3)",
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 500,
        color: isPro ? "#A78BFA" : "#06b6d4",
      }}
    >
      <Crown size={10} style={{ flexShrink: 0 }} aria-hidden="true" />
      <span>{label}</span>
      <span style={{ opacity: 0.6 }}>→ {isPro ? "Pro" : "Free"}</span>
    </div>
  );
}
