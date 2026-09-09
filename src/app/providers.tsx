"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type CSSProperties, type ReactNode } from "react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30s default
            retry: 2,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  // Toast placement: bottom-center on every breakpoint. Bottom-right would sit
  // directly on the Copilot input (right column on desktop / sticky composer on
  // mobile); bottom-center clears it. Offsets respect safe-area insets. The
  // mobile offset is lifted to clear the 56px bottom nav plus the sticky Copilot
  // composer (see globals.css @media override for 601-1023px; --mobile-offset
  // covers <=600px). The container z-index is capped in globals.css (70: above
  // sheets z-60, below modals/fullscreen z-9999); --z-index sets the per-toast
  // stacking var.
  const toasterStyle = {
    "--offset-bottom": "calc(env(safe-area-inset-bottom, 0px) + 16px)",
    "--mobile-offset-bottom": "calc(env(safe-area-inset-bottom, 0px) + 144px)",
    "--mobile-offset-left": "16px",
    "--mobile-offset-right": "16px",
    "--width": "380px",
    "--z-index": "65",
  } as CSSProperties;

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        theme="dark"
        position="bottom-center"
        closeButton
        duration={4000}
        style={toasterStyle}
        toastOptions={{
          style: {
            background: "var(--color-bg-tertiary)",
            border: "1px solid var(--color-border-default)",
            color: "var(--color-text-primary)",
            borderRadius: "10px",
            fontSize: "13px",
            maxWidth: "380px",
          },
        }}
      />
    </QueryClientProvider>
  );
}