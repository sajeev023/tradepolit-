"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { Settings, Zap, CreditCard, Loader2, MessagesSquare } from "lucide-react";
import { useUIStore } from "@/lib/stores/ui-store";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mark } from "./mark";
import { NAV_GROUPS, type NavEntry } from "./nav-config";

function RailLink({ entry, active }: { entry: NavEntry; active: boolean }) {
  const Icon = entry.icon;
  return (
    <Link
      href={entry.href}
      id={entry.label === "Journal" ? "journal-section" : undefined}
      aria-label={entry.label}
      aria-current={active ? "page" : undefined}
      className="group relative flex h-[52px] w-[60px] flex-col items-center justify-center gap-1 rounded-lg outline-none"
    >
      {active && (
        <motion.span
          layoutId="rail-active"
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          className="absolute inset-0 rounded-lg border"
          style={{ background: "var(--panel-2)", borderColor: "var(--color-border-strong)" }}
        />
      )}
      {active && (
        <motion.span
          layoutId="rail-tick"
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          className="absolute -left-[8px] top-3 bottom-3 w-[3px] rounded-r-full"
          style={{ background: "var(--accent)", boxShadow: "0 0 12px rgba(var(--accent-rgb), 0.6)" }}
        />
      )}
      <Icon
        size={19}
        strokeWidth={active ? 2.2 : 1.7}
        className="relative transition-colors duration-150"
        style={{ color: active ? "var(--accent)" : "var(--color-text-tertiary)" }}
      />
      <span
        className="relative font-mono text-[8.5px] font-medium uppercase tracking-[0.1em] transition-colors duration-150 group-hover:text-[var(--color-text-primary)]"
        style={{ color: active ? "var(--color-text-primary)" : "var(--color-text-quaternary)" }}
      >
        {entry.short}
      </span>
    </Link>
  );
}

export function Rail() {
  const pathname = usePathname();
  const { copilotOpen, setCopilotOpen } = useUIStore();
  const [loadingPortal, setLoadingPortal] = useState(false);

  const { data: profile } = useQuery<any>({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/v1/profile");
      const body = await res.json();
      if (!res.ok) return null;
      return body.data;
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      setLoadingPortal(true);
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Failed to load portal");
      return body;
    },
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (err: any) => toast.error(err.message || "Failed to launch billing portal"),
    onSettled: () => setLoadingPortal(false),
  });

  const isPro = profile?.plan === "PRO" || profile?.subscriptionStatus === "ACTIVE";
  const settingsActive = pathname.startsWith("/settings");

  return (
    <aside
      aria-label="Primary"
      className="fixed bottom-0 left-0 z-30 hidden w-[var(--spacing-sidebar)] flex-col items-center border-r lg:flex"
      style={{
        top: "var(--spacing-demo-banner)",
        background: "var(--background)",
        borderColor: "var(--hairline)",
      }}
    >
      <Link href="/dashboard" aria-label="TradePilot home" className="mt-3.5 mb-3 transition-transform hover:scale-105 active:scale-95">
        <Mark size={34} />
      </Link>

      <nav className="flex min-h-0 w-full flex-1 flex-col items-center gap-0.5 overflow-y-auto px-2 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {NAV_GROUPS.map((group, i) => (
          <div key={group.id} className="flex w-full flex-col items-center gap-0.5">
            {i > 0 && <span className="my-1.5 h-px w-7" style={{ background: "var(--hairline)" }} />}
            {group.entries.map((entry) => (
              <RailLink key={entry.href} entry={entry} active={pathname.startsWith(entry.href)} />
            ))}
          </div>
        ))}
        <span className="my-1.5 h-px w-7" style={{ background: "var(--hairline)" }} />
        <button
          onClick={() => setCopilotOpen(!copilotOpen)}
          aria-pressed={copilotOpen}
          aria-label="Copilot"
          className="group relative flex h-[52px] w-[60px] cursor-pointer flex-col items-center justify-center gap-1 rounded-lg"
        >
          <MessagesSquare size={19} strokeWidth={copilotOpen ? 2.2 : 1.7} style={{ color: copilotOpen ? "var(--accent)" : "var(--color-text-tertiary)" }} />
          <span className="font-mono text-[8.5px] font-medium uppercase tracking-[0.1em]" style={{ color: copilotOpen ? "var(--color-text-primary)" : "var(--color-text-quaternary)" }}>Copilot</span>
        </button>
      </nav>

      <div className="flex w-full flex-col items-center gap-1 border-t px-2 py-3" style={{ borderColor: "var(--hairline)" }}>
        {isPro ? (
          <button
            onClick={() => portalMutation.mutate()}
            disabled={loadingPortal}
            aria-label="Manage billing"
            className="flex h-[44px] w-[60px] cursor-pointer flex-col items-center justify-center gap-1 rounded-lg text-[var(--color-text-quaternary)] transition-colors hover:text-[var(--color-text-primary)]"
          >
            {loadingPortal ? <Loader2 size={17} className="animate-spin" /> : <CreditCard size={17} strokeWidth={1.7} />}
            <span className="font-mono text-[8.5px] font-medium uppercase tracking-[0.1em]">Billing</span>
          </button>
        ) : (
          <Link
            href="/pricing"
            aria-label="Upgrade to Pro"
            className="flex h-[44px] w-[60px] flex-col items-center justify-center gap-1 rounded-lg border transition-colors hover:bg-[rgba(var(--accent-rgb),0.1)]"
            style={{ borderColor: "rgba(var(--accent-rgb), 0.35)", color: "var(--accent)" }}
          >
            <Zap size={16} strokeWidth={2.2} />
            <span className="font-mono text-[8.5px] font-semibold uppercase tracking-[0.1em]">Pro</span>
          </Link>
        )}
        <Link
          href="/settings"
          aria-label="Settings"
          aria-current={settingsActive ? "page" : undefined}
          className="flex h-[44px] w-[60px] flex-col items-center justify-center gap-1 rounded-lg transition-colors hover:text-[var(--color-text-primary)]"
          style={{ color: settingsActive ? "var(--accent)" : "var(--color-text-quaternary)" }}
        >
          <Settings size={17} strokeWidth={1.7} />
          <span className="font-mono text-[8.5px] font-medium uppercase tracking-[0.1em]">Setup</span>
        </Link>
      </div>
    </aside>
  );
}
