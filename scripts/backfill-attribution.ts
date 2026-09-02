/**
 * scripts/backfill-attribution.ts
 *
 * V3 — one-time backfill: engine-proposed attribution labels for
 * historical thesis outcomes that were logged before the attribution
 * feature existed (attribution IS NULL).
 *
 * Rules:
 *  - Only fills NULL attributions — never overwrites a human label.
 *  - attributionSource = "engine" with reasoning from the proposal.
 *  - Dry-run mode by default: prints what it would do. Pass --apply to
 *    write. Run with:  npx tsx scripts/backfill-attribution.ts [--apply]
 */

import { prisma as prismaClient } from "../src/lib/prisma";

interface ThesisRow {
  id: string;
  status: string;
  bias: string;
  regimeAtCreation: string | null;
  regimeAtResolution: string | null;
  evidenceFor: string[];
  evidenceAgainst: string[];
  outcomeId: string;
  outcomeResult: string;
  outcomeTookTrade: boolean;
  outcomeFollowedPlan: boolean | null;
}

async function main() {
  const apply = process.argv.includes("--apply");
  console.log(`[BACKFILL] mode: ${apply ? "APPLY" : "DRY RUN (pass --apply to write)"}`);

  const rows = await (prismaClient as any).$queryRaw(`
    SELECT t.id, t.status, t.bias, t."regimeAtCreation", t."regimeAtResolution",
           t."evidenceFor", t."evidenceAgainst",
           o.id as "outcomeId", o.result as "outcomeResult",
           o."tookTrade" as "outcomeTookTrade", o."followedPlan" as "outcomeFollowedPlan"
    FROM theses t
    JOIN thesis_outcomes o ON o."thesisId" = t.id
    WHERE o.attribution IS NULL
    ORDER BY o."createdAt" ASC
  `) as ThesisRow[];

  console.log(`[BACKFILL] ${rows.length} outcome(s) missing attribution.`);
  if (rows.length === 0) return;

  const { proposeAttribution } = await import("../src/lib/attribution-engine");

  let filled = 0;
  const counts = new Map<string, number>();
  for (const r of rows) {
    const proposal = proposeAttribution({
      thesisStatus: r.status as "HIT" | "INVALIDATED" | "EXPIRED",
      bias: r.bias as "LONG" | "SHORT",
      regimeAtCreation: r.regimeAtCreation,
      regimeAtResolution: r.regimeAtResolution,
      evidenceFor: r.evidenceFor ?? [],
      evidenceAgainst: r.evidenceAgainst ?? [],
      tookTrade: r.outcomeTookTrade,
      result: r.outcomeResult as "WIN" | "LOSS" | "BREAKEVEN" | "NO_TRADE",
      followedPlan: r.outcomeFollowedPlan,
    });
    counts.set(proposal.label, (counts.get(proposal.label) ?? 0) + 1);
    console.log(`  ${r.id.slice(0, 8)} ${r.bias} ${r.status} → ${proposal.label} (${proposal.confidence})`);
    if (apply) {
      await (prismaClient as any).thesisOutcome.update({
        where: { id: r.outcomeId },
        data: {
          attribution: proposal.label,
          attributionSource: "engine",
          attributionReasoning: proposal.reasoning.slice(0, 500),
        },
      });
      filled++;
    }
  }

  console.log(`[BACKFILL] label distribution:`);
  for (const [label, n] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${label}: ${n}`);
  }
  console.log(`[BACKFILL] ${apply ? `filled ${filled} rows` : "dry run complete — no writes"}`);
}

main()
  .catch((err) => {
    console.error("[BACKFILL] failed:", err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });