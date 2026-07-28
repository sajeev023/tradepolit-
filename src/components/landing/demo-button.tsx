"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { analytics } from "@/lib/analytics";
import { toast } from "sonner";

export function useDemoLogin() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleDemo = useCallback(async () => {
    setIsLoading(true);
    analytics.trackHeroCtaClicked("instant_demo");
    analytics.trackInstantDemoStarted();

    // Clear the legacy unsigned demo cookies so any stale client-set values
    // (including a previously-forged email) cannot persist. The new session
    // is a server-issued, HttpOnly, HMAC-signed cookie.
    document.cookie = "sb-mock-session=; path=/; max-age=0; SameSite=Lax";
    document.cookie = "sb-mock-email=; path=/; max-age=0; SameSite=Lax";

    try {
      const res = await fetch("/api/v1/demo/session", { method: "POST" });
      if (!res.ok) {
        throw new Error("Demo unavailable");
      }
      router.push("/charts");
      router.refresh();
    } catch (err) {
      setIsLoading(false);
      console.error("Failed to start demo session:", err);
      toast.error("Couldn't start the demo. Please try again.");
    }
  }, [router]);

  return { isLoading, handleDemo };
}