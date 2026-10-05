"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { Rail } from "@/components/shell/rail";
import { Horizon } from "@/components/shell/horizon";
import { MobileDock } from "@/components/shell/mobile-dock";
import { CopilotDock } from "@/components/shell/copilot-dock";
import { SearchCommandPalette } from "@/components/layout/command-palette";
import { NotificationPanel } from "@/components/layout/notification-panel";
import { DemoBanner } from "@/components/DemoBanner";
import { createClient } from "@/lib/supabase/client";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }: any) => setUser(data.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, session: any) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-dvh">
      <DemoBanner />
      <Rail />
      <Horizon
        userEmail={user?.email}
        userName={user?.user_metadata?.full_name as string}
        avatarUrl={user?.user_metadata?.avatar_url as string}
      />

      <main
        className="app-main lg:pl-[var(--spacing-sidebar)]"
        style={{ paddingTop: "calc(var(--spacing-topbar) + var(--spacing-demo-banner))" }}
      >
        {/* Mobile clears the floating dock; desktop gets generous gutters and an ultrawide cap. */}
        <div
          key={pathname}
          className="animate-enter mx-auto w-full max-w-[1760px] px-4 pt-5 sm:px-6 lg:px-8 lg:pt-7 lg:pb-10"
          style={{ paddingBottom: "calc(110px + env(safe-area-inset-bottom, 0px))" }}
        >
          {children}
        </div>
      </main>

      <MobileDock />
      <CopilotDock />
      <SearchCommandPalette />
      <NotificationPanel />
    </div>
  );
}
