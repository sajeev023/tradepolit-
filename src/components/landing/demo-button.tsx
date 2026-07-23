"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { analytics } from "@/lib/analytics";

export function useDemoLogin() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleDemo = useCallback(async () => {
    setIsLoading(true);
    analytics.trackHeroCtaClicked("instant_demo");
    analytics.trackInstantDemoStarted();
    document.cookie = "sb-mock-session=true; path=/; max-age=3600; SameSite=Lax";
    document.cookie = "sb-mock-email=partner%40tradcopilot.com; path=/; max-age=3600; SameSite=Lax";
    router.push("/charts");
    router.refresh();
  }, [router]);

  return { isLoading, handleDemo };
}

