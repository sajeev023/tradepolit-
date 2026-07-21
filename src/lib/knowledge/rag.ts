import type { KnowledgeEntry } from "./events";
import { marketEvents } from "./events";
import { tradingConcepts } from "./concepts";
import { psychologyConcepts } from "./psychology";

const allKnowledge: KnowledgeEntry[] = [...marketEvents, ...tradingConcepts, ...psychologyConcepts];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s$%]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function scoreEntry(entry: KnowledgeEntry, queryTokens: Set<string>): number {
  let score = 0;
  const titleTokens = tokenize(entry.title);
  const tagTokens = entry.tags.map((t) => t.toLowerCase());
  const summaryTokens = tokenize(entry.summary);

  for (const token of queryTokens) {
    if (titleTokens.includes(token)) score += 10;
    if (tagTokens.includes(token)) score += 8;
    if (summaryTokens.includes(token)) score += 5;
  }

  const q = Array.from(queryTokens).join(" ");
  const lowerTitle = entry.title.toLowerCase();
  const lowerSummary = entry.summary.toLowerCase();

  if (lowerTitle.includes(q)) score += 15;
  if (lowerSummary.includes(q)) score += 8;

  const yearMatch = q.match(/\b(19[5-9]\d|20[0-2]\d)\b/);
  if (yearMatch && entry.date && entry.date.year.toString() === yearMatch[1]) {
    score += 12;
  }

  return score;
}

export function searchKnowledge(query: string, maxResults = 3): KnowledgeEntry[] {
  const queryTokens = new Set(tokenize(query));
  if (queryTokens.size === 0) return [];

  const scored = allKnowledge
    .map((entry) => ({ entry, score: scoreEntry(entry, queryTokens) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, maxResults).map((s) => s.entry);
}

export function formatKnowledgeForPrompt(entries: KnowledgeEntry[]): string {
  if (entries.length === 0) return "";

  return (
    "\n\n============================================================\nRETRIEVED KNOWLEDGE (from verified knowledge base)\n============================================================\n" +
    entries
      .map(
        (e, i) =>
          `[SOURCE ${i + 1}: ${e.title} (${e.category})]\n${e.summary}\n\nVerified data: ${
            e.verifiedData ? JSON.stringify(e.verifiedData, null, 1) : "N/A"
          }\n\nLessons:\n${(e.lessons || []).map((l) => `- ${l}`).join("\n")}`
      )
      .join("\n\n---\n\n") +
    "\n============================================================\nEND RETRIEVED KNOWLEDGE\n============================================================\n\nIMPORTANT: Use the retrieved knowledge above to answer the user's question. If the knowledge is relevant, cite specific data points. If the knowledge does NOT cover the user's question, say so — never invent information."
  );
}

export function getAllKnowledge(): KnowledgeEntry[] {
  return allKnowledge;
}
