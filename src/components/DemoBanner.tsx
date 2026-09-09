"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

  const bannerRef = useRef<HTMLDivElement>(null);

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

  // Drive the chrome offset through the --spacing-demo-banner CSS var so the
  // fixed Topbar (top) and main (paddingTop) shift down in lockstep with the
  // banner's real measured height — keeping search, notifications, avatar and
  // the sidebar logo reachable for demo users. Resolved (dismissed/absent) → 0px.
  useEffect(() => {
    const el = bannerRef.current;
    if (!el) {
      document.documentElement.style.setProperty("--spacing-demo-banner", "0px");
      return;
    }
    const apply = () =>
      document.documentElement.style.setProperty(
        "--spacing-demo-banner",
        `${el.offsetHeight}px`
      );
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.setProperty("--spacing-demo-banner", "0px");
    };
  }, [isDemo, dismissed]);

  if (!isDemo || dismissed) return null;

  const analysesRemaining = analysisLimit !== null ? Math.max(0, analysisLimit - analysesUsed) : null;
  const alertsRemaining = alertLimit !== null ? Math.max(0, alertLimit - alertsUsed) : null;
  const limitReached = analysesRemaining !== null && analysesRemaining === 0;

  return (
    <div
      ref={bannerRef}
      className="demo-banner"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: "var(--z-toast)",
        background:
          "linear-gradient(90deg, rgba(var(--accent-rgb), 0.14) 0%, rgba(var(--accent-rgb), 0.14) 100%)",
        borderBottom: "1px solid rgba(var(--accent-rgb), 0.3)",
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
            style={{ color: "var(--color-accent-primary)", flexShrink: 0 }}
            aria-hidden="true"
          />
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--color-text-primary)",
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
                color: "var(--color-loss)",
                background: "var(--color-loss-bg)",
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
            className="btn-primary btn-sm"
            style={{ textDecoration: "none" }}
          >
            Create Free Account
          </Link>

          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss preview banner"
            className="icon-button"
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
        background: "var(--color-accent-primary-subtle)",
        border: "1px solid rgba(var(--accent-rgb), 0.3)",
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 500,
        color: "var(--color-accent-primary)",
      }}
    >
      <Crown size={10} style={{ flexShrink: 0 }} aria-hidden="true" />
      <span>{label}</span>
      <span style={{ opacity: 0.6 }}>→ {isPro ? "Pro" : "Free"}</span>
    </div>
  );
}