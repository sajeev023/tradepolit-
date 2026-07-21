"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Toaster } from "sonner";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

// Initialize Stripe on client using publishable key (gracefully fall back to dummy test key if undefined to avoid client-side crash)
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  "pk_test_51OpPjSJ2y8b6rFkK99g99g99g99g99g99g99g99g99g99g99g99g99g99g99g99g99g99g99g99g99g99g99g99g99g"
);

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

  return (
    <QueryClientProvider client={queryClient}>
      <Elements stripe={stripePromise}>
        {children}
      </Elements>
      <Toaster
        theme="dark"
        position="bottom-right"
        closeButton
        toastOptions={{
          style: {
            background: "var(--color-bg-tertiary)",
            border: "1px solid var(--color-border-default)",
            color: "var(--color-text-primary)",
          },
        }}
      />
    </QueryClientProvider>
  );
}
