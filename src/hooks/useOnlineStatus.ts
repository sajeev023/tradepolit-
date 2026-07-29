"use client";

import { useState, useEffect, useRef } from "react";

/**
 * Tracks real connectivity. The browser's `online`/`offline` events are
 * unreliable (they fire on link-state changes, not actual reachability), so
 * when the browser reports offline we verify by pinging the favicon.
 *
 * Race/leak fixes vs. the prior implementation:
 *  - `[]` deps + `isOnlineRef`: the effect used to depend on `isOnline`, so
 *    every flip tore down and recreated the listeners + interval (a recreate
 *    storm). The ref lets the interval read the current status without
 *    re-subscribing.
 *  - `AbortController` on the favicon fetch: a pending fetch is cancelled on
 *    cleanup so it can't write state after unmount.
 *  - `active` guard: no `setIsOnline` after unmount.
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(true); // Default true to prevent initial load flash
  // Mirror so the interval closure reads the latest status without forcing
  // the effect to re-run (which would re-add listeners and restart the timer).
  const isOnlineRef = useRef(true);
  const setOnline = (v: boolean) => {
    isOnlineRef.current = v;
    setIsOnline(v);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    let active = true;
    let abortController: AbortController | null = null;

    const verifyConnectivity = async () => {
      // If the browser reports offline, verify by pinging the favicon.
      if (!navigator.onLine) {
        abortController?.abort();
        abortController = new AbortController();
        try {
          const res = await fetch("/favicon.ico", {
            method: "HEAD",
            cache: "no-store",
            signal: abortController.signal,
          });
          if (!active) return;
          if (res.ok || res.status >= 200) {
            setOnline(true);
            return;
          }
        } catch {
          if (!active) return;
          setOnline(false);
          return;
        }
      }
      if (!active) return;
      setOnline(navigator.onLine);
    };

    verifyConnectivity();

    const handleOnline = () => setOnline(true);
    const handleOffline = () => verifyConnectivity();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Periodically re-verify while marked offline. Reads `isOnlineRef`
    // instead of `isOnline` so the interval closure is stable.
    const interval = setInterval(() => {
      if (!navigator.onLine || !isOnlineRef.current) {
        verifyConnectivity();
      }
    }, 10000);

    return () => {
      active = false;
      abortController?.abort();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  return isOnline;
}