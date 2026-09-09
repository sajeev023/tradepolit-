"use client";

export const dynamic = "force-dynamic";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Bell, RefreshCw, Key, Lock, AlertTriangle, Loader2, User, Palette, CreditCard, Zap } from "lucide-react";
import { SYMBOLS } from "@/lib/market-registry";
import { FormInput } from "@/components/ui/form-input";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<"profile" | "settings" | "preferences" | "billing">("profile");

  // Profile fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [profileUpdating, setProfileUpdating] = useState(false);

  // Settings fields
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyInApp, setNotifyInApp] = useState(true);
  const [cmcKey, setCmcKey] = useState("");
  const [tdKey, setTdKey] = useState("");

  // Password fields
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordUpdating, setPasswordUpdating] = useState(false);

  // Deletion state
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Trading preferences (localStorage backed)
  const [defaultTimeframe, setDefaultTimeframe] = useState<"1m" | "5m" | "15m" | "1h" | "4h" | "1d" | "1W">("4h");
  const [defaultSymbol, setDefaultSymbol] = useState("BTC/USD");
  const [aiBehavior, setAiBehavior] = useState<"aggressive" | "balanced" | "risk-shield">("balanced");
  const [defaultChartType, setDefaultChartType] = useState<"candlestick" | "line" | "heikin-ashi">("candlestick");

  // Stripe checkout & portal management
  const [stripeLoading, setStripeLoading] = useState(false);

  const handleCheckout = async () => {
    setStripeLoading(true);
    try {
      const res = await fetch("/api/v1/stripe/checkout", { method: "POST" });
      const body = await res.json();
      if (res.ok && body.data?.url) {
        window.location.href = body.data.url;
      } else {
        toast.error(body.error?.message || "Checkout failed");
      }
    } catch {
      toast.error("Checkout failed");
    } finally {
      setStripeLoading(false);
    }
  };

  const handlePortal = async () => {
    setStripeLoading(true);
    try {
      const res = await fetch("/api/v1/stripe/portal", { method: "POST" });
      const body = await res.json();
      if (res.ok && body.data?.url) {
        window.location.href = body.data.url;
      } else {
        toast.error(body.error?.message || "Billing Portal failed");
      }
    } catch {
      toast.error("Billing Portal failed");
    } finally {
      setStripeLoading(false);
    }
  };

  // Fetch current database settings
  const { data: settingsData, isLoading: settingsLoading } = useQuery<any>({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await fetch("/api/v1/settings");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to load settings");
      return body.data;
    },
  });

  // Fetch current user profile with subscription status
  const { data: profileData, isLoading: profileLoading, refetch: _refetchProfile } = useQuery<any>({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/v1/profile");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to load profile");
      return body.data;
    },
  });

  const isLoading = settingsLoading || profileLoading;

  // Sync settings and fetch Supabase user metadata on mount
  useEffect(() => {
    if (settingsData) {
      setNotifyEmail(settingsData.notifyEmail);
      setNotifyInApp(settingsData.notifyInApp);
      setCmcKey(settingsData.coinmarketcapKey || "");
      setTdKey(settingsData.twelvedataKey || "");
    }
  }, [settingsData]);

  useEffect(() => {
    const getUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || "");
        setFullName(user.user_metadata?.full_name || user.email?.split("@")[0] || "");
      }
    };
    getUserData();

    if (typeof window !== "undefined") {
      const tf = localStorage.getItem("TradCopilot-default-timeframe") as any;
      const sym = localStorage.getItem("TradCopilot-default-symbol");
      const behavior = localStorage.getItem("TradCopilot-ai-behavior") as any;
      const chart = localStorage.getItem("TradCopilot-default-chart-type") as any;
      if (tf) setDefaultTimeframe(tf);
      if (sym) setDefaultSymbol(sym);
      if (behavior) setAiBehavior(behavior);
      if (chart) setDefaultChartType(chart);
    }
  }, [supabase]);

  // Save settings mutation (API keys and notification prefs)
  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notifyEmail,
          notifyInApp,
          coinmarketcapKey: cmcKey,
          twelvedataKey: tdKey,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to save settings");
      return body.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Settings saved successfully");
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  // Update profile full_name metadata
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Full Name cannot be empty");
      return;
    }

    setProfileUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim() },
      });
      if (error) throw error;
      toast.success("Profile details updated successfully");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setProfileUpdating(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      toast.error("Please enter a new password");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setPasswordUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated successfully");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setPasswordUpdating(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirmed) {
      toast.error("Please check the confirmation box first");
      return;
    }

    setDeletingAccount(true);
    try {
      const res = await fetch("/api/v1/settings", {
        method: "DELETE",
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to clear account database records");

      await supabase.auth.signOut();
      toast.success("Account deleted successfully. We are sorry to see you go!");
      router.push("/");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete account");
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      localStorage.setItem("TradCopilot-default-timeframe", defaultTimeframe);
      localStorage.setItem("TradCopilot-default-symbol", defaultSymbol);
      localStorage.setItem("TradCopilot-ai-behavior", aiBehavior);
      localStorage.setItem("TradCopilot-default-chart-type", defaultChartType);
      toast.success("Trading preferences saved successfully");
    }
  };

  // Get initials for profile representation
  const getInitials = () => {
    if (!fullName) return "TP";
    const parts = fullName.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return fullName.slice(0, 2).toUpperCase();
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="animate-fade-in flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            Settings & Profile
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Manage personal credentials, default trading configurations, and account options.
          </p>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex border-b border-[var(--color-border-default)] gap-4 mb-2 animate-fade-in">
        {(["profile", "settings", "preferences", "billing"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-xs font-semibold uppercase tracking-wider transition-all relative cursor-pointer ${
              activeTab === tab
                ? "text-[var(--color-accent-primary)] font-bold"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-accent-primary)] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-40">
          <RefreshCw className="animate-spin text-[var(--color-accent-primary)] mb-2" size={24} />
          <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Loading settings...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* PROFILE TAB */}
          {activeTab === "profile" && (
            <div className="animate-fade-in space-y-6">
              <form onSubmit={handleUpdateProfile} className="card p-5 space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <User size={16} className="text-[var(--color-accent-primary)]" />
                  <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    Personal Profile Details
                  </h2>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6 pb-2 border-b border-[var(--color-border-default)]">
                  <div className="w-16 h-16 rounded-full bg-[var(--color-bg-tertiary)] border-2 border-[var(--accent)] flex items-center justify-center text-xl font-bold font-mono text-[var(--color-accent-primary)] tracking-wider">
                    {getInitials()}
                  </div>
                  <div className="text-center sm:text-left space-y-0.5">
                    <span className="text-sm font-semibold block text-[var(--color-text-primary)]">{fullName}</span>
                    <span className="text-xs font-mono" style={{ color: "var(--color-text-tertiary)" }}>{email}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-semibold mb-1" style={{ color: "var(--color-text-tertiary)" }}>
                      Full Name
                    </label>
                    <FormInput
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your name..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-semibold mb-1" style={{ color: "var(--color-text-tertiary)" }}>
                      Email Address (Read-only)
                    </label>
                    <FormInput
                      type="email"
                      value={email}
                      disabled
                      placeholder="your.email@domain.com"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={profileUpdating}
                    className="btn-primary text-xs"
                  >
                    {profileUpdating && <RefreshCw className="animate-spin" size={14} />}
                    Update Profile Name
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === "settings" && (
            <div className="animate-fade-in space-y-6">
              <form onSubmit={handleSaveSettings} className="space-y-6">
                {/* Notifications Panel */}
                <div className="card p-5 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Bell size={16} className="text-[var(--color-accent-primary)]" />
                    <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                      Notification Preferences
                    </h2>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifyEmail}
                        onChange={(e) => setNotifyEmail(e.target.checked)}
                        className="rounded border-[var(--color-border-strong)] bg-[var(--color-bg-tertiary)] text-[var(--color-accent-primary)] focus:ring-0 w-4 h-4"
                      />
                      <div className="space-y-0.5">
                        <span className="font-semibold block text-[var(--color-text-primary)]">Email Alerts</span>
                        <span style={{ color: "var(--color-text-tertiary)" }}>Receive triggered alerts in your email inbox</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifyInApp}
                        onChange={(e) => setNotifyInApp(e.target.checked)}
                        className="rounded border-[var(--color-border-strong)] bg-[var(--color-bg-tertiary)] text-[var(--color-accent-primary)] focus:ring-0 w-4 h-4"
                      />
                      <div className="space-y-0.5">
                        <span className="font-semibold block text-[var(--color-text-primary)]">In-App Notifications</span>
                        <span style={{ color: "var(--color-text-tertiary)" }}>Show real-time triggers in the dashboard navbar</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Credentials Panel */}
                <div className="card p-5 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Key size={16} className="text-[var(--color-accent-primary)]" />
                    <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                      API Keys (Encrypted at Rest)
                    </h2>
                  </div>

                  <p className="text-[10px] leading-relaxed mb-4" style={{ color: "var(--color-text-tertiary)" }}>
                    Add personal API keys to increase request rate limits. Values are symmetric-encrypted at rest and decrypted only in-memory.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase font-semibold mb-1" style={{ color: "var(--color-text-tertiary)" }}>
                        TwelveData API Key
                      </label>
                      <FormInput
                        type="password"
                        value={tdKey}
                        onChange={(e) => setTdKey(e.target.value)}
                        placeholder="Paste TwelveData key..."
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-semibold mb-1" style={{ color: "var(--color-text-tertiary)" }}>
                        CoinMarketCap API Key
                      </label>
                      <FormInput
                        type="password"
                        value={cmcKey}
                        onChange={(e) => setCmcKey(e.target.value)}
                        placeholder="Paste CoinMarketCap key..."
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saveMutation.isPending}
                    className="btn-primary text-xs"
                  >
                    {saveMutation.isPending && <RefreshCw className="animate-spin" size={14} />}
                    Save All Settings
                  </button>
                </div>
              </form>

              {/* Change Password Panel */}
              <form onSubmit={handleUpdatePassword} className="card p-5 space-y-4 border border-[var(--color-border-default)]">
                <div className="flex items-center gap-2 mb-2">
                  <Lock size={16} className="text-[var(--color-accent-primary)]" />
                  <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    Change Password
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-semibold mb-1" style={{ color: "var(--color-text-tertiary)" }}>
                      New Password
                    </label>
                    <FormInput
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters..."
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-semibold mb-1" style={{ color: "var(--color-text-tertiary)" }}>
                      Confirm New Password
                    </label>
                    <FormInput
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password..."
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={passwordUpdating}
                    className="px-6 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border border-[var(--color-border-default)] bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] text-[var(--color-text-primary)]"
                  >
                    {passwordUpdating && <RefreshCw className="animate-spin" size={14} />}
                    Update Password
                  </button>
                </div>
              </form>

              {/* Danger Zone */}
              <div className="card p-5 space-y-4 border border-[rgba(var(--red-rgb),0.3)] bg-[rgba(var(--red-rgb),0.04)]">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} className="text-[var(--color-loss)]" />
                  <h2 className="text-sm font-semibold text-[var(--color-loss)]">
                    Danger Zone (GDPR Compliance)
                  </h2>
                </div>

                <p className="text-xs leading-relaxed text-[var(--color-text-secondary)]">
                  Deleting your account is permanent. It will instantly erase your profile, settings, alert thresholds, strategy setups, backtest records, RAG-grounded AI history, and all logged trade performance charts. **This action cannot be undone.**
                </p>

                <div className="space-y-4 pt-2">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deleteConfirmed}
                      onChange={(e) => setDeleteConfirmed(e.target.checked)}
                      className="rounded border-[rgba(var(--red-rgb),0.6)] bg-[var(--color-bg-tertiary)] text-[var(--color-loss)] focus:ring-0 w-4 h-4 mt-0.5"
                    />
                    <span className="text-xs font-semibold text-[var(--color-text-secondary)] select-none">
                      I understand that this will permanently destroy all TradCopilot data.
                    </span>
                  </label>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      disabled={!deleteConfirmed || deletingAccount}
                      className="px-6 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all bg-[var(--color-loss-bg)] text-[var(--color-loss)] border border-[rgba(var(--red-rgb),0.4)] hover:bg-[var(--color-loss-bg)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletingAccount && <Loader2 className="animate-spin" size={14} />}
                      Permanently Delete My Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TRADING PREFERENCES TAB */}
          {activeTab === "preferences" && (
            <div className="animate-fade-in space-y-6">
              <form onSubmit={handleSavePreferences} className="card p-5 space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <Palette size={16} className="text-[var(--color-accent-primary)]" />
                  <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    Trading & Terminal Preferences
                  </h2>
                </div>

                <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                  Configure your default dashboard defaults, AI Copilot behavior, and preferred charting settings. Saved preferences persist locally in this browser.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {/* Default timeframe selector */}
                  <div>
                    <label className="block text-[10px] uppercase font-semibold mb-1.5" style={{ color: "var(--color-text-tertiary)" }}>
                      Default Timeframe
                    </label>
                    <select
                      value={defaultTimeframe}
                      onChange={(e) => setDefaultTimeframe(e.target.value as any)}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-accent"
                    >
                      {["1m", "5m", "15m", "1h", "4h", "1d", "1W"].map((tf) => (
                        <option key={tf} value={tf}>{tf}</option>
                      ))}
                    </select>
                  </div>

                  {/* Default market symbol selector */}
                  <div>
                    <label className="block text-[10px] uppercase font-semibold mb-1.5" style={{ color: "var(--color-text-tertiary)" }}>
                      Default Market / Symbol
                    </label>
                    <select
                      value={defaultSymbol}
                      onChange={(e) => setDefaultSymbol(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-accent"
                    >
                      {/* Default symbol dropdown — driven by the market registry. */}
                      {SYMBOLS.map((sym) => (
                        <option key={sym} value={sym}>{sym}</option>
                      ))}
                    </select>
                  </div>

                  {/* AI Copilot Behavior Mode */}
                  <div>
                    <label className="block text-[10px] uppercase font-semibold mb-1.5" style={{ color: "var(--color-text-tertiary)" }}>
                      AI Copilot Behavior
                    </label>
                    <select
                      value={aiBehavior}
                      onChange={(e) => setAiBehavior(e.target.value as any)}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-accent"
                    >
                      <option value="balanced">Balanced / Disciplined Coach (Default)</option>
                      <option value="aggressive">Aggressive Market Scan (Maximum Opportunities)</option>
                      <option value="risk-shield">Risk-Shield Coach (Preservation Mode)</option>
                    </select>
                  </div>

                  {/* Default Chart Type */}
                  <div>
                    <label className="block text-[10px] uppercase font-semibold mb-1.5" style={{ color: "var(--color-text-tertiary)" }}>
                      Default Chart Type
                    </label>
                    <select
                      value={defaultChartType}
                      onChange={(e) => setDefaultChartType(e.target.value as any)}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-accent"
                    >
                      <option value="candlestick">Standard Candlestick</option>
                      <option value="line">Solid Line Chart</option>
                      <option value="heikin-ashi">Heikin-Ashi (Smoothed Trend)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="btn-primary text-xs cursor-pointer"
                  >
                    Save Preferences
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* BILLING TAB */}
          {activeTab === "billing" && (
            <div className="animate-fade-in space-y-6">
              <div className="card p-6 border-[var(--color-border-subtle)] bg-[var(--color-bg-deepest)]/40 space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border-subtle)]">
                  <div className="flex items-center gap-2.5">
                    <CreditCard size={18} className="text-[var(--color-accent-primary)]" />
                    <div>
                      <h2 className="text-sm font-bold text-[var(--color-text-primary)]">Subscription & Billing</h2>
                      <p className="text-[11px] text-[var(--color-text-tertiary)]">Manage plan memberships, usage limits, and invoices.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {profileData?.subscriptionStatus === "PRO_ACTIVE" ? (
                      <span className="text-[10px] uppercase font-bold tracking-widest bg-[var(--color-profit-bg)] border border-[rgba(var(--green-rgb),0.2)] text-[var(--color-profit)] px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Zap size={10} className="fill-[var(--color-profit)] text-[var(--color-profit)]" /> PRO Tier
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-bold tracking-widest bg-[var(--color-bg-tertiary)] border border-[var(--color-border-strong)] text-[var(--color-text-secondary)] px-2.5 py-1 rounded-full">
                        FREE Tier
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Plan Details & Limits */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">Plan Usage Metrics</h3>
                    <div className="space-y-3 font-sans">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[var(--color-text-secondary)]">AI Chart Analyses</span>
                        {profileData?.subscriptionStatus === "PRO_ACTIVE" ? (
                          <span className="font-bold text-[var(--color-profit)]">Unlimited</span>
                        ) : (
                          <span className="font-mono text-[var(--color-text-secondary)] font-semibold">
                            {profileData?.dailyAnalysisCount ?? 0} / 5 used today
                          </span>
                        )}
                      </div>
                      {profileData?.subscriptionStatus !== "PRO_ACTIVE" && (
                        <div className="w-full bg-[var(--color-bg-tertiary)] rounded-full h-1.5 overflow-hidden border border-[var(--color-border-subtle)]">
                          <div
                            className="bg-[var(--accent)] h-1.5 rounded-full"
                            style={{ width: `${Math.min(100, ((profileData?.dailyAnalysisCount ?? 0) / 5) * 100)}%` }}
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[var(--color-text-secondary)]">Proactive Tech Alerts</span>
                        {profileData?.subscriptionStatus === "PRO_ACTIVE" ? (
                          <span className="font-bold text-[var(--color-profit)]">Unlimited</span>
                        ) : (
                          <span className="font-mono text-[var(--color-text-secondary)] font-semibold">
                            {profileData?.dailyAlertCount ?? 0} / 3 used today
                          </span>
                        )}
                      </div>
                      {profileData?.subscriptionStatus !== "PRO_ACTIVE" && (
                        <div className="w-full bg-[var(--color-bg-tertiary)] rounded-full h-1.5 overflow-hidden border border-[var(--color-border-subtle)]">
                          <div
                            className="bg-[var(--accent)] h-1.5 rounded-full"
                            style={{ width: `${Math.min(100, ((profileData?.dailyAlertCount ?? 0) / 3) * 100)}%` }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="p-4 rounded-xl bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)] text-[11px] leading-relaxed text-[var(--color-text-tertiary)] space-y-2">
                      <p className="font-bold text-[var(--color-text-secondary)]">Free limits resets daily at UTC midnight.</p>
                      <p>Upgrade to Pro to unlock weekly AI reports, saved analyses compare views, unlimited alert channels, and behavioral coaching modules.</p>
                    </div>
                  </div>

                  {/* Pricing Tiers & Action Cards */}
                  <div className="flex flex-col justify-between p-5 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-bg-tertiary)] relative overflow-hidden group">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-accent-primary)] font-mono">Premium Access</span>
                      <h4 className="text-lg font-black text-[var(--color-text-primary)] mt-1">TradCopilot Pro</h4>
                      <p className="text-xs text-[var(--color-text-tertiary)] mt-2 leading-relaxed">
                        Become an institutional-grade day trader with complete contextual AI scanning, full journal persistence, and alerts.
                      </p>
                      <div className="mt-4 flex items-baseline gap-1">
                        <span className="text-2xl font-black text-[var(--color-text-primary)] font-mono">$7.49</span>
                        <span className="text-xs text-[var(--color-text-tertiary)]">/ month</span>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-[var(--color-border-default)]">
                      {profileData?.subscriptionStatus === "PRO_ACTIVE" ? (
                        <button
                          onClick={handlePortal}
                          disabled={stripeLoading}
                          className="w-full btn-secondary text-xs font-semibold py-2.5 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {stripeLoading ? (
                            <RefreshCw className="animate-spin text-[var(--color-accent-primary)]" size={14} />
                          ) : (
                            "Manage Billing & Invoices"
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={handleCheckout}
                          disabled={stripeLoading}
                          className="w-full btn-primary text-xs font-semibold py-2.5 flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                        >
                          {stripeLoading ? (
                            <RefreshCw className="animate-spin text-[var(--color-bg-deepest)]" size={14} />
                          ) : (
                            <>
                              <Zap size={12} className="fill-[var(--color-bg-deepest)] text-[var(--color-bg-deepest)]" />
                              Upgrade to Pro ($7.49)
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
