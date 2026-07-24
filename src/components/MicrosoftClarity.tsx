"use client";

import { useEffect } from "react";
import Clarity from "@microsoft/clarity";

interface MicrosoftClarityProps {
  /**
   * Optional custom project ID override.
   * If not provided, falls back to `process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID`
   * or `process.env.NEXT_PUBLIC_CLARITY_ID`.
   */
  projectId?: string;
}

/**
 * Microsoft Clarity analytics integration for Next.js App Router (Next.js 16).
 *
 * Initializes Microsoft Clarity on client-side mount only.
 * Guaranteed to not break SSR, SSG, or hydration.
 */
export function MicrosoftClarity({ projectId: customProjectId }: MicrosoftClarityProps = {}) {
  const projectId =
    customProjectId ||
    process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID ||
    process.env.NEXT_PUBLIC_CLARITY_ID;

  useEffect(() => {
    if (!projectId || typeof window === "undefined") {
      return;
    }

    try {
      Clarity.init(projectId);
    } catch (error) {
      console.error("[Microsoft Clarity] Failed to initialize:", error);
    }
  }, [projectId]);

  return null;
}
