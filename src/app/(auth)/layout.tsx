import type { ReactNode } from "react";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import AuthLayout from "./auth-shell";

/**
 * Server layout for the auth route group. The interactive shell (branding
 * panel, backdrop, animations) lives in ./auth-shell.tsx as a client
 * component; this wrapper exists only to attach static metadata so every
 * auth page (/login, /signup, /forgot-password, /reset-password) emits
 * <meta name="robots" content="noindex"> — robots.txt deliberately does not
 * disallow these routes.
 */
export const metadata: Metadata = buildMetadata({
  title: "Account Access",
  description: "Sign in to your TradCopilot workspace.",
  path: "/",
  noindex: true,
});

export default function AuthGroupLayout({ children }: { children: ReactNode }) {
  return <AuthLayout>{children}</AuthLayout>;
}
