"use client";

import { useState, useEffect } from "react";

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(true); // Default to true to prevent initial load flash

  useEffect(() => {
    if (typeof window === "undefined") return;

    const verifyConnectivity = async () => {
      // If browser reports offline, verify by pinging favicon
      if (!navigator.onLine) {
        try {
          const res = await fetch("/favicon.ico", { method: "HEAD", cache: "no-store" });
          if (res.ok || res.status >= 200) {
            setIsOnline(true);
            return;
          }
        } catch (_) {
          setIsOnline(false);
          return;
        }
      }
      setIsOnline(navigator.onLine);
    };

    // Perform check on mount
    verifyConnectivity();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      verifyConnectivity();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Periodically verify if marked offline
    const interval = setInterval(() => {
      if (!navigator.onLine || !isOnline) {
        verifyConnectivity();
      }
    }, 10000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [isOnline]);

  return isOnline;
}
