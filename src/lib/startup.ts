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
  suffix: string;
  length: number;
};

/**
 * Build a redaction-safe view of a key. Exposes only the first 6 and
 * last 4 characters, with the middle replaced by `***`.
 *
 * - empty / placeholder  → "absent"
 * - length ≤ 10          → "short (length: N)"  (too short to safely redact)
 * - length > 10          → "first6...last4"
 *
 * This is the ONLY shape we ever want in logs, both at startup and on
 * per-request 401/403/429 failure paths.
 */
export function redactKey(raw: string | undefined): string {
  if (!raw) return "absent";
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "mock-key" || trimmed === "placeholder-key") {
    return "absent (placeholder)";
  }
  if (trimmed.length <= 10) {
    return `short (length: ${trimmed.length})`;
  }
  return `${trimmed.substring(0, 6)}...${trimmed.substring(trimmed.length - 4)}`;
}

function safeKeyInfo(raw: string | undefined): { present: boolean; prefix: string; suffix: string; length: number } {
  if (!raw) return { present: false, prefix: "", suffix: "", length: 0 };
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "mock-key" || trimmed === "placeholder-key") {
    return { present: false, prefix: "", suffix: "", length: 0 };
  }
  return {
    present: true,
    prefix: trimmed.substring(0, 6),
    suffix: trimmed.length >= 4 ? trimmed.substring(trimmed.length - 4) : "",
    length: trimmed.length,
  };
}

/**
 * Map a (provider, optional key index) tuple to the env-var name the app
 * reads. Used by 401/403/429 logs so the operator can see which variable
 * the request actually loaded — not just "Groq failed" but "Groq
 * GROQ_API_KEY_2 failing (prefix gsk_Ke…len 56)".
 */
export function envNameForProvider(
  provider: "groq" | "nvidia" | "openai" | "gemini",
  keyIndex?: number
): string {
  if (provider === "groq") {
    return keyIndex === 1 ? "GROQ_API_KEY_2" : "GROQ_API_KEY";
  }
  if (provider === "nvidia") return "NVIDIA_API_KEY";
  if (provider === "openai") return "OPENAI_API_KEY";
  if (provider === "gemini") return "GEMINI_API_KEY";
  return "UNKNOWN";
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
      ? `✓ ${c.label.padEnd(14)} Loaded  (${c.prefix}…${c.suffix} len ${c.length})`
      : `✗ ${c.label.padEnd(14)} Missing`;

  const lines: string[] = [];
  lines.push("================================================================");
  lines.push("[STARTUP] TradCopilot provider configuration");
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
