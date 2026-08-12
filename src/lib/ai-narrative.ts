/* ═══════════════════════════════════════════════════════════
   TradCopilot — AI Narrative Parser
   Parses the backend's structured `##`-sectioned output into
   discrete, renderable sections so the UI can present each
   with its own icon, styling, and progressive disclosure
   instead of flattening it into a text blob.
   ═══════════════════════════════════════════════════════════ */

export interface NarrativeSection {
  heading: string;
  body: string;
  icon?: string;
}

const SECTION_ICONS: Record<string, string> = {
  "market structure": "trending",
  "momentum": "activity",
  "key levels": "target",
  "support": "arrow-down",
  "resistance": "arrow-up",
  "trade thesis": "brain",
  "thesis": "brain",
  "invalidation": "alert-triangle",
  "risk": "shield-alert",
  "risk assessment": "shield-alert",
  "bottom line": "check-circle",
  "summary": "check-circle",
  "scenario": "git-branch",
  "near-term": "clock",
  "scenario analysis": "git-branch",
  "position sizing": "gauge",
  "execution": "zap",
};

function pickIcon(heading: string): string | undefined {
  const lower = heading.toLowerCase();
  for (const [key, icon] of Object.entries(SECTION_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return undefined;
}

/**
 * Split a `## Heading\n\nbody` narrative into sections.
 * Falls back to a single unsectioned block if no `##` headings are found.
 */
export function parseNarrative(text: string): NarrativeSection[] {
  if (!text) return [];

  // Match `## Heading` followed by its body (until next ## or end).
  // Supports `## Heading` and `### Heading`.
  const regex = /#{2,3}\s*(.+?)\n+([\s\S]*?)(?=\n#{2,3}\s|$)/g;
  const sections: NarrativeSection[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const heading = match[1].trim();
    const body = match[2].trim();
    if (heading) {
      sections.push({ heading, body, icon: pickIcon(heading) });
    }
  }

  // If no sections were parsed, treat the whole text as one unsectioned block.
  if (sections.length === 0) {
    sections.push({ heading: "Analysis", body: text.trim() });
  }

  return sections;
}

/**
 * Returns true if the narrative has enough structure to render as sections.
 */
export function hasStructure(text: string): boolean {
  return /^#{2,3}\s+/m.test(text);
}
