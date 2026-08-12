"use client";

import {
  TrendingUp,
  Activity,
  Target,
  Brain,
  AlertTriangle,
  ShieldAlert,
  CheckCircle,
  GitBranch,
  Clock,
  Gauge,
  Zap,
  ArrowUp,
  ArrowDown,
  type LucideIcon,
} from "lucide-react";
import { parseNarrative } from "@/lib/ai-narrative";
import { AnalysisSection } from "./insight-card";

const ICON_MAP: Record<string, LucideIcon> = {
  trending: TrendingUp,
  activity: Activity,
  target: Target,
  brain: Brain,
  "alert-triangle": AlertTriangle,
  "shield-alert": ShieldAlert,
  "check-circle": CheckCircle,
  "git-branch": GitBranch,
  clock: Clock,
  gauge: Gauge,
  zap: Zap,
  "arrow-up": ArrowUp,
  "arrow-down": ArrowDown,
};

/**
 * StructuredNarrative — renders the backend's `##`-sectioned AI output as
 * styled, collapsible sections with per-section icons instead of a flat
 * text blob. This is the single biggest "intelligence" presentation win.
 *
 * Falls back to plain pre-line text when the output has no `##` headings.
 */
export function StructuredNarrative({ text }: { text: string }) {
  const sections = parseNarrative(text);

  // If only one unsectioned block, render plainly.
  if (sections.length === 1 && sections[0].heading === "Analysis") {
    return (
      <div className="text-[14px] leading-[1.6] text-[var(--color-text-primary)] whitespace-pre-line font-sans">
        {sections[0].body}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sections.map((section, i) => {
        const IconComp = section.icon ? ICON_MAP[section.icon] : undefined;
        return (
          <AnalysisSection
            key={i}
            title={section.heading}
            icon={IconComp ? <IconComp size={12} /> : undefined}
            defaultOpen={i < 2}
          >
            {section.body}
          </AnalysisSection>
        );
      })}
    </div>
  );
}
