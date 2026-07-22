/**
 * src/lib/startup.ts
 *
 * Server-startup validation banner.
 *
 * Walks every env-var the app depends on (AI, market data, news, payments) and
 * prints a single line per key indicating whether it was loaded.
 *
 * Hard rules:
 *   - Never log a key value, ever. Only a 6-char prefix or a length.
 *   - Always run, even if a key is missing — the app should keep booting with
 *     whatever providers it has and report the gap here.
 *   - Reuse `safeKeyInfo` so the format matches the per-call log blocks in
 *     `nvidia-ai.ts` and `ai-providers.ts`.
 */

type CheckResult = {
  label: string;
  present: boolean;
  prefix: string;
  length: number;
};

function safeKeyInfo(raw: string | undefined): { present: boolean; prefix: string; length: number } {
  if (!raw) return { present: false, prefix: "", length: 0 };
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "mock-key" || trimmed === "placeholder-key") {
    return { present: false, prefix: "", length: 0 };
  }
  return {
    present: true,
    prefix: trimmed.substring(0, 6),
    length: trimmed.length,
  };
}

function check(label: string, raw: string | undefined): CheckResult {
  const info = safeKeyInfo(raw);
  return { label, ...info };
}

export type StartupReport = {
  ok: boolean;
  loaded: CheckResult[];
  missing: CheckResult[];
  totalKeys: number;
};

export function getStartupReport(): StartupReport {
  const all: CheckResult[] = [
    check("Groq Key #1", process.env.GROQ_API_KEY),
    check("Groq Key #2", process.env.GROQ_API_KEY_2),
    check("NVIDIA", process.env.NVIDIA_API_KEY),
    check("Gemini", process.env.GEMINI_API_KEY),
    check("OpenAI", process.env.OPENAI_API_KEY),
    check("TwelveData", process.env.TWELVEDATA_API_KEY),
    check("Finnhub", process.env.FINNHUB_API_KEY),
    check("NewsAPI", process.env.NEWS_API_KEY ?? process.env.NEWSAPI_API_KEY),
  ];

  return {
    ok: true,
    totalKeys: all.length,
    loaded: all.filter(c => c.present),
    missing: all.filter(c => !c.present),
  };
}

/**
 * Print the startup banner. Safe to call multiple times — output is
 * deterministic and the function has no side effects beyond console.log.
 */
export function logStartupBanner(): StartupReport {
  const report = getStartupReport();

  const fmt = (c: CheckResult) =>
    c.present
      ? `✓ ${c.label.padEnd(14)} Loaded  (prefix ${c.prefix}… len ${c.length})`
      : `✗ ${c.label.padEnd(14)} Missing`;

  const lines: string[] = [];
  lines.push("================================================================");
  lines.push("[STARTUP] TradePilot provider configuration");
  lines.push("----------------------------------------------------------------");
  for (const c of [report.loaded, report.missing].flat()) lines.push(fmt(c));
  lines.push("----------------------------------------------------------------");
  lines.push(
    `[STARTUP] ${report.loaded.length}/${report.totalKeys} keys loaded` +
    (report.missing.length ? ` — app will run without: ${report.missing.map(c => c.label).join(", ")}` : " — all providers active")
  );
  lines.push("================================================================");

  console.log("\n" + lines.join("\n") + "\n");

  return report;
}
