"use client";

export const dynamic = "force-dynamic";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Bell, RefreshCw, AlertTriangle, Loader2, User, Palette, CreditCard, Zap } from "lucide-react";
import { Chip, Label, Skeleton } from "@/components/fd/primitives";
import { BRAND } from "@/lib/brand";
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

  const isPro = profileData?.subscriptionStatus === "PRO_ACTIVE";
  const TABS = [
    { id: "profile", label: "Profile", icon: User, note: "Name and sign-in" },
    { id: "settings", label: "Account", icon: Bell, note: "Alerts, keys, security" },
    { id: "preferences", label: "Preferences", icon: Palette, note: "Terminal defaults" },
    { id: "billing", label: "Billing", icon: CreditCard, note: "Plan and usage" },
  ] as const;

  return (
    <div className="mx-auto flex max-w-[1080px] flex-col gap-6 lg:gap-8">
      <header>
        <Label>Settings</Label>
        <h1 className="mt-2 text-[var(--color-text-primary)]">
          Make it <em className="text-[var(--accent)]">yours.</em>
        </h1>
        <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-[var(--color-text-tertiary)]">
          Manage your profile, alerts, terminal defaults and plan.
        </p>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
        {/* Section nav: vertical rail on desktop, scrolling tabs on mobile */}
        <nav aria-label="Settings sections" className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] lg:sticky lg:top-[calc(var(--spacing-topbar)+var(--spacing-demo-banner)+1.5rem)] lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
          {TABS.map(({ id, label, icon: Icon, note }) => {
            const on = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                aria-current={on ? "page" : undefined}
                className="group relative flex shrink-0 cursor-pointer items-center gap-3 rounded-lg px-3.5 py-2.5 text-left transition-colors lg:py-3"
                style={{ background: on ? "var(--panel-2)" : "transparent", boxShadow: on ? "inset 0 0 0 1px var(--color-border-strong)" : "none" }}
              >
                {on && <span className="absolute -left-px bottom-2.5 top-2.5 hidden w-[3px] rounded-r-full lg:block" style={{ background: "var(--accent)" }} />}
                <Icon size={16} strokeWidth={on ? 2.2 : 1.7} style={{ color: on ? "var(--accent)" : "var(--color-text-tertiary)" }} />
                <span className="min-w-0">
                  <span className={`block text-[13.5px] font-medium ${on ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)]"}`}>{label}</span>
                  <span className="hidden text-[11.5px] text-[var(--color-text-quaternary)] lg:block">{note}</span>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="min-w-0">
          {isLoading ? (
            <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 w-full" />)}</div>
          ) : (
            <div className="space-y-4 animate-enter" key={activeTab}>
              {/* ── PROFILE ─────────────────────────────────────────────── */}
              {activeTab === "profile" && (
                <form onSubmit={handleUpdateProfile}>
                  <SettingsCard title="Profile" desc="How you appear across the terminal.">
                    <div className="flex items-center gap-5 pb-5">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border font-mono text-[20px] font-medium tracking-wider" style={{ background: "var(--panel-3)", borderColor: "rgba(var(--accent-rgb),0.5)", color: "var(--accent)" }}>
                        {getInitials()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold text-[var(--color-text-primary)]">{fullName || "Trader"}</p>
                        <p className="truncate font-mono text-[12px] text-[var(--color-text-tertiary)]">{email}</p>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <LabeledField label="Full name">
                        <FormInput type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter your name…" required />
                      </LabeledField>
                      <LabeledField label="Email (read-only)">
                        <FormInput type="email" value={email} disabled placeholder="your.email@domain.com" />
                      </LabeledField>
                    </div>
                    <FormFooter>
                      <button type="submit" disabled={profileUpdating} className="btn-primary">
                        {profileUpdating && <RefreshCw className="animate-spin" size={14} />} Update profile
                      </button>
                    </FormFooter>
                  </SettingsCard>
                </form>
              )}

              {/* ── ACCOUNT ─────────────────────────────────────────────── */}
              {activeTab === "settings" && (
                <>
                  <form onSubmit={handleSaveSettings} className="space-y-4">
                    <SettingsCard title="Notifications" desc="Where triggered alerts reach you.">
                      <ToggleRow label="Email alerts" desc="Receive triggered alerts in your inbox." checked={notifyEmail} onChange={setNotifyEmail} />
                      <ToggleRow label="In-app notifications" desc="Show real-time triggers in the top bar." checked={notifyInApp} onChange={setNotifyInApp} last />
                    </SettingsCard>

                    <SettingsCard title="Data provider keys" desc="Optional personal keys to raise rate limits. Encrypted at rest and decrypted only in memory.">
                      <div className="grid gap-4">
                        <LabeledField label="TwelveData API key">
                          <FormInput type="password" value={tdKey} onChange={(e) => setTdKey(e.target.value)} placeholder="Paste TwelveData key…" />
                        </LabeledField>
                        <LabeledField label="CoinMarketCap API key">
                          <FormInput type="password" value={cmcKey} onChange={(e) => setCmcKey(e.target.value)} placeholder="Paste CoinMarketCap key…" />
                        </LabeledField>
                      </div>
                      <FormFooter>
                        <button type="submit" disabled={saveMutation.isPending} className="btn-primary">
                          {saveMutation.isPending && <RefreshCw className="animate-spin" size={14} />} Save settings
                        </button>
                      </FormFooter>
                    </SettingsCard>
                  </form>

                  <form onSubmit={handleUpdatePassword}>
                    <SettingsCard title="Password" desc="Use at least 8 characters.">
                      <div className="grid gap-4 md:grid-cols-2">
                        <LabeledField label="New password">
                          <FormInput type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters…" />
                        </LabeledField>
                        <LabeledField label="Confirm new password">
                          <FormInput type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat new password…" />
                        </LabeledField>
                      </div>
                      <FormFooter>
                        <button type="submit" disabled={passwordUpdating} className="btn-secondary">
                          {passwordUpdating && <RefreshCw className="animate-spin" size={14} />} Update password
                        </button>
                      </FormFooter>
                    </SettingsCard>
                  </form>

                  <section className="card overflow-hidden" style={{ borderColor: "rgba(var(--red-rgb),0.35)", background: "linear-gradient(180deg, rgba(var(--red-rgb),0.05), var(--panel-1) 60%)" }}>
                    <div className="p-5 sm:p-6">
                      <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[var(--color-loss)]"><AlertTriangle size={16} /> Danger zone</h2>
                      <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
                        Deleting your account is permanent. It erases your profile, settings, alerts, strategies, backtests, AI history and every logged trade. This cannot be undone.
                      </p>
                      <label className="mt-5 flex cursor-pointer items-start gap-3">
                        <input type="checkbox" checked={deleteConfirmed} onChange={(e) => setDeleteConfirmed(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--color-loss)]" />
                        <span className="select-none text-[13px] text-[var(--color-text-secondary)]">I understand this will permanently destroy all {BRAND.name} data.</span>
                      </label>
                      <div className="mt-5 flex justify-end">
                        <button
                          type="button"
                          onClick={handleDeleteAccount}
                          disabled={!deleteConfirmed || deletingAccount}
                          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border px-5 text-[13px] font-semibold text-[var(--color-loss)] transition-colors hover:bg-[var(--color-loss-bg)] disabled:cursor-not-allowed disabled:opacity-40"
                          style={{ borderColor: "rgba(var(--red-rgb),0.5)" }}
                        >
                          {deletingAccount && <Loader2 className="animate-spin" size={14} />} Permanently delete my account
                        </button>
                      </div>
                    </div>
                  </section>
                </>
              )}

              {/* ── PREFERENCES ─────────────────────────────────────────── */}
              {activeTab === "preferences" && (
                <form onSubmit={handleSavePreferences}>
                  <SettingsCard title="Terminal defaults" desc="Saved in this browser. Applied the next time you open Markets.">
                    <div className="grid gap-5 md:grid-cols-2">
                      <LabeledField label="Default timeframe">
                        <select value={defaultTimeframe} onChange={(e) => setDefaultTimeframe(e.target.value as any)} className="h-11 w-full px-3 font-mono text-[13px] text-[var(--color-text-primary)]">
                          {["1m", "5m", "15m", "1h", "4h", "1d", "1W"].map((tf) => <option key={tf} value={tf}>{tf}</option>)}
                        </select>
                      </LabeledField>
                      <LabeledField label="Default market">
                        <select value={defaultSymbol} onChange={(e) => setDefaultSymbol(e.target.value)} className="h-11 w-full px-3 font-mono text-[13px] text-[var(--color-text-primary)]">
                          {SYMBOLS.map((sym) => <option key={sym} value={sym}>{sym}</option>)}
                        </select>
                      </LabeledField>
                      <LabeledField label="Copilot behavior">
                        <select value={aiBehavior} onChange={(e) => setAiBehavior(e.target.value as any)} className="h-11 w-full px-3 text-[13px] text-[var(--color-text-primary)]">
                          <option value="balanced">Balanced — disciplined coach (default)</option>
                          <option value="aggressive">Aggressive — maximum opportunities</option>
                          <option value="risk-shield">Risk-shield — capital preservation</option>
                        </select>
                      </LabeledField>
                      <LabeledField label="Default chart type">
                        <select value={defaultChartType} onChange={(e) => setDefaultChartType(e.target.value as any)} className="h-11 w-full px-3 text-[13px] text-[var(--color-text-primary)]">
                          <option value="candlestick">Standard candlestick</option>
                          <option value="line">Solid line</option>
                          <option value="heikin-ashi">Heikin-Ashi (smoothed trend)</option>
                        </select>
                      </LabeledField>
                    </div>
                    <FormFooter>
                      <button type="submit" className="btn-primary">Save preferences</button>
                    </FormFooter>
                  </SettingsCard>
                </form>
              )}

              {/* ── BILLING ─────────────────────────────────────────────── */}
              {activeTab === "billing" && (
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <SettingsCard
                    title="Plan & usage"
                    desc="Free limits reset daily at UTC midnight."
                    right={isPro ? <Chip tone="gain" dot>Pro</Chip> : <Chip>Free</Chip>}
                  >
                    <div className="space-y-6">
                      <Meter label="AI chart analyses" unlimited={isPro} used={profileData?.dailyAnalysisCount ?? 0} cap={5} />
                      <Meter label="Proactive tech alerts" unlimited={isPro} used={profileData?.dailyAlertCount ?? 0} cap={3} />
                    </div>
                    {!isPro && (
                      <p className="mt-6 rounded-lg border p-3.5 text-[12.5px] leading-relaxed text-[var(--color-text-tertiary)]" style={{ borderColor: "var(--hairline)", background: "var(--panel-2)" }}>
                        Pro unlocks weekly AI reports, saved-analysis compare views, unlimited alert channels and behavioral coaching.
                      </p>
                    )}
                  </SettingsCard>

                  <section className="card relative flex flex-col justify-between overflow-hidden p-5 sm:p-6" style={{ borderColor: "rgba(var(--accent-rgb),0.35)", background: "linear-gradient(180deg, rgba(var(--accent-rgb),0.06), var(--panel-1) 45%)" }}>
                    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: "linear-gradient(90deg, transparent, var(--accent), transparent)" }} />
                    <div>
                      <Label>Premium access</Label>
                      <h3 className="mt-2 font-serif text-[28px] leading-none tracking-[-0.01em] text-[var(--color-text-primary)]">{BRAND.name} Pro</h3>
                      <p className="mt-3 text-[13px] leading-relaxed text-[var(--color-text-tertiary)]">Complete contextual AI scanning, full journal persistence and alerts.</p>
                      <p className="mt-5 flex items-baseline gap-1.5">
                        <span className="font-mono text-[34px] font-medium leading-none tracking-[-0.04em] text-[var(--color-text-primary)]">$7.49</span>
                        <span className="font-mono text-[12px] text-[var(--color-text-quaternary)]">/ month</span>
                      </p>
                    </div>
                    <div className="mt-6">
                      {isPro ? (
                        <button onClick={handlePortal} disabled={stripeLoading} className="btn-secondary btn-block cursor-pointer">
                          {stripeLoading ? <RefreshCw className="animate-spin" size={14} /> : "Manage billing & invoices"}
                        </button>
                      ) : (
                        <button onClick={handleCheckout} disabled={stripeLoading} className="btn-primary btn-lg btn-block cursor-pointer">
                          {stripeLoading ? <RefreshCw className="animate-spin" size={14} /> : <><Zap size={14} /> Upgrade to Pro</>}
                        </button>
                      )}
                    </div>
                  </section>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Local layout helpers ─────────────────────────────────────────────────── */

function SettingsCard({ title, desc, right, children }: { title: string; desc?: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="card">
      <header className="flex items-start justify-between gap-4 border-b px-5 py-4 sm:px-6" style={{ borderColor: "var(--hairline)" }}>
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--color-text-primary)]">{title}</h2>
          {desc && <p className="mt-1 max-w-lg text-[12.5px] leading-relaxed text-[var(--color-text-tertiary)]">{desc}</p>}
        </div>
        {right}
      </header>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

function LabeledField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <Label className="mb-2 block">{label}</Label>
      {children}
    </label>
  );
}

function FormFooter({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 flex justify-end border-t pt-5" style={{ borderColor: "var(--hairline)" }}>{children}</div>;
}

function ToggleRow({ label, desc, checked, onChange, last }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void; last?: boolean }) {
  return (
    <label className={`flex cursor-pointer items-center justify-between gap-6 py-4 ${last ? "pb-0" : "border-b"}`} style={{ borderColor: "var(--hairline)" }}>
      <span className="min-w-0">
        <span className="block text-[14px] font-medium text-[var(--color-text-primary)]">{label}</span>
        <span className="mt-0.5 block text-[12.5px] text-[var(--color-text-tertiary)]">{desc}</span>
      </span>
      <span className="relative shrink-0">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
        <span className="block h-6 w-11 rounded-full border transition-colors peer-checked:[background:var(--accent)] peer-focus-visible:ring-2 peer-focus-visible:ring-[rgba(var(--accent-rgb),0.4)]" style={{ background: "var(--panel-3)", borderColor: "var(--color-border-strong)" }} />
        <span className="pointer-events-none absolute left-[3px] top-[3px] h-[18px] w-[18px] rounded-full bg-[var(--color-text-tertiary)] transition-all peer-checked:translate-x-5 peer-checked:bg-[var(--on-accent)]" />
      </span>
    </label>
  );
}

function Meter({ label, used, cap, unlimited }: { label: string; used: number; cap: number; unlimited: boolean }) {
  const pct = Math.min(100, (used / cap) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[13.5px] text-[var(--color-text-secondary)]">{label}</span>
        {unlimited ? (
          <span className="font-mono text-[12px] uppercase tracking-[0.1em] text-[var(--color-profit)]">Unlimited</span>
        ) : (
          <span className="font-mono text-[12.5px] tabular-nums text-[var(--color-text-secondary)]">{used} / {cap} today</span>
        )}
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--panel-3)" }}>
        <div className="h-full rounded-full transition-[width] duration-700" style={{ width: unlimited ? "100%" : `${pct}%`, background: unlimited ? "var(--color-profit)" : pct >= 100 ? "var(--color-loss)" : "var(--accent)", opacity: unlimited ? 0.35 : 1 }} />
      </div>
    </div>
  );
}
