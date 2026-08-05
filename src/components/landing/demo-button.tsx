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
    // Request a server-signed demo session. The endpoint sets an httpOnly,
    // HMAC-signed cookie that the middleware validates — the client can no
    // longer forge a session identity.
    try {
      await fetch("/api/demo/start", { method: "POST" });
    } catch {
      // Non-fatal: even if the request fails, navigate so the user sees the
      // landing page (they can retry). The middleware will simply see no
      // valid demo cookie and treat them as unauthenticated.
    }
    router.push("/charts");
    router.refresh();
  }, [router]);

  return { isLoading, handleDemo };
}

