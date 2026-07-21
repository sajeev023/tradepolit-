"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";

export function useIsDemoUser() {
  const { data: user } = useQuery({
    queryKey: ["demo-user-check"],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const isDemo = user?.email === "partner@tradepilot.ai" || user?.email === "trader@tradepilot.app";
  return { isDemo, user };
}

export function getLockedFeatureMessage(feature: string): string {
  const messages: Record<string, string> = {
    journal: "Journal is available with a free account. Create an account to track and reflect on your trades.",
    dashboard: "Performance Dashboard is a Pro feature. Upgrade to access visual analytics, equity curves, and AI weekly reports.",
    marketPulse: "Market Overview is a Pro feature. Upgrade to access Fear & Greed Index, funding rates, and trending assets.",
    savedAnalyses: "Saved Analyses require a free account. Create an account to bookmark and compare chart analyses.",
    watchlistEdit: "Custom watchlists require a free account. Create an account to add, remove, and organize your tracked assets.",
    chatHistory: "Chat history is saved with a free account. Create an account to persist your AI Coach conversations.",
  };
  return messages[feature] || "This feature requires a free account.";
}

export function getLockedFeatureCTA(feature: string): { label: string; href: string } {
  const proFeatures = ["dashboard", "marketPulse"];
  if (proFeatures.includes(feature)) {
    return { label: "Upgrade to Pro", href: "/settings" };
  }
  return { label: "Create Free Account", href: "/signup" };
}