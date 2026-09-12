/**
 * nvidia-ai.ts
 * Multi-provider racing system: Groq LPU + NVIDIA NIM.
 *
 * ARCHITECTURE:
 *   - Fires 4 models simultaneously (1 Groq + 3 NVIDIA) via raw fetch + AbortController.
 *   - The FIRST successful response wins; all other in-flight requests
 *     are immediately aborted — we do NOT wait for them to settle.
 *   - Each model has an independent per-model timeout.
 *   - A 20s hard-cap safety net covers all four.
 *   - If all models fail/timeout → throws, caller handles graceful fallback.
 *
 * WHY GROQ:
 *   Groq's LPU (Language Processing Unit) is dedicated hardware, not a shared GPU queue.
 *   Free-tier NVIDIA NIM can take 30-120s when the queue is busy.
 *   Groq responds in 1-3 seconds consistently. It races alongside NVIDIA —
 *   if NVIDIA is fast (rare), its higher-quality model wins. If not, Groq already answered.
 */

import { logStartupBanner, redactKey, envNameForProvider } from "./startup";
import { getApiKey } from "./ai-providers";

/* ─── Provider types ─────────────────────────────────────────────────── */
type Provider = "groq" | "nvidia" | "openai" | "gemini";

interface ModelDef {
  id: number;
  name: string;
  provider: Provider;
  quality: "fast" | "good" | "best";
  timeout: number;
  /** When provider === "groq", index into the resolved keys array. */
  groqKeyIndex?: number;
}

/* ─── Model registry ─────────────────────────────────────────────────── */
export const MODELS: ModelDef[] = [
  {
    // Groq Key #1 — flagship 70B model
    id: 0,
    name: "llama-3.3-70b-versatile",
    provider: "groq",
    quality: "good",
    timeout: 8_000,
    groqKeyIndex: 0,
  },
  {
    // Groq Key #1 — ultra-fast 8B model
    id: 1,
    name: "llama-3.1-8b-instant",
    provider: "groq",
    quality: "fast",
    timeout: 6_000,
    groqKeyIndex: 0,
  },
  {
    // Groq Key #2 — flagship 70B (failover for key #1)
    id: 6,
    name: "llama-3.3-70b-versatile",
    provider: "groq",
    quality: "good",
    timeout: 8_000,
    groqKeyIndex: 1,
  },
  {
    // Gemini 2.0 Flash
    id: 5,
    name: "gemini-2.0-flash",
    provider: "gemini",
    quality: "good",
    timeout: 6_000,
  },
  {
    // NVIDIA fastest small model
    id: 2,
    name: "meta/llama-3.2-11b-vision-instruct",
    provider: "nvidia",
    quality: "fast",
    timeout: 10_000,
  },
  {
    // NVIDIA highest quality model
    id: 3,
    name: "meta/llama-3.2-90b-vision-instruct",
    provider: "nvidia",
    quality: "good",
    timeout: 10_000,
  },
  {
    // OpenAI fallback model
    id: 4,
    name: "gpt-4o-mini",
    provider: "openai",
    quality: "good",
    timeout: 8_000,
  },
];

/* ─── Endpoint config ────────────────────────────────────────────────── */
const NVIDIA_ENDPOINT =
  process.env.NVIDIA_BASE_URL
    ? `${process.env.NVIDIA_BASE_URL}/chat/completions`
    : "https://integrate.api.nvidia.com/v1/chat/completions";

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";

const HARD_CAP_MS = 12_000; // 12-second hard cap safety net safely within client fetch timeout

const GROQ_KEY_COOLDOWN_MS = 60_000; // after 429/401, skip this key for 60s

/* ─── Groq multi-key resolver ────────────────────────────────────────── */
interface GroqKeyHealth {
  status: "online" | "offline" | "rate_limited" | "auth_failed";
  lastErrorAt: number;
  cooldownUntil: number;
  consecutiveFailures: number;
  lastError?: string;
}

const groqKeyHealth: Record<0 | 1, GroqKeyHealth> = {
  0: { status: "online", lastErrorAt: 0, cooldownUntil: 0, consecutiveFailures: 0 },
  1: { status: "online", lastErrorAt: 0, cooldownUntil: 0, consecutiveFailures: 0 },
};

/**
 * Resolve the configured Groq keys in priority order. Always returns
 * the index that points at GROQ_API_KEY, then the index for
 * GROQ_API_KEY_2 (if set). Empty/placeholder keys are filtered out.
 *
 * Backward compat: if only GROQ_API_KEY is set, the array has length 1
 * and the second Groq model in the registry (id=6) is filtered out by
 * the activeModels check (its index won't exist).
 */
export function getGroqKeys(): Array<{ index: 0 | 1; key: string }> {
  const keys: Array<{ index: 0 | 1; key: string }> = [];
  const k1 = (process.env.GROQ_API_KEY || "").trim().replace(/^["']|["']$/g, "");
  if (k1 && k1 !== "mock-key" && k1 !== "placeholder-key") keys.push({ index: 0, key: k1 });
  const k2 = (process.env.GROQ_API_KEY_2 || "").trim().replace(/^["']|["']$/g, "");
  if (k2 && k2 !== "mock-key" && k2 !== "placeholder-key") keys.push({ index: 1, key: k2 });
  return keys;
}

export function isGroqKeyUsable(index: 0 | 1): boolean {
  const h = groqKeyHealth[index];
  if (!h) return false;
  if (h.status === "offline") return false;
  if ((h.status === "rate_limited" || h.status === "auth_failed") && Date.now() < h.cooldownUntil) {
    return false;
  }
  if (h.status === "rate_limited" || h.status === "auth_failed") {
    h.status = "online";
  }
  return true;
}

export function markGroqKeyFailure(
  index: 0 | 1,
  status: 429 | 401 | 403 | 504 | 500,
  message: string
) {
  const h = groqKeyHealth[index];
  h.lastErrorAt = Date.now();
  h.lastError = message;
  h.consecutiveFailures++;
  if (status === 429) {
    h.status = "rate_limited";
    h.cooldownUntil = Date.now() + GROQ_KEY_COOLDOWN_MS;
  } else if (status === 401 || status === 403) {
    h.status = "auth_failed";
    h.cooldownUntil = Date.now() + GROQ_KEY_COOLDOWN_MS;
  }
}

export function markGroqKeySuccess(index: 0 | 1) {
  const h = groqKeyHealth[index];
  h.status = "online";
  h.consecutiveFailures = 0;
  h.cooldownUntil = 0;
  h.lastError = undefined;
}

export function getGroqKeyHealth(): Record<"key1" | "key2", GroqKeyHealth> {
  return { key1: { ...groqKeyHealth[0] }, key2: { ...groqKeyHealth[1] } };
}

/* ─── Types ─────────────────────────────────────────────────────────── */
export interface RaceResult {
  model: string;
  content: string;
  duration: number;
  rank: number;
  provider: Provider;
  /** V3 cost telemetry — token usage when the provider reports it. */
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
}

export interface NvidiaErrorResponse {
  status: number;
  message: string;
}

/* ─── Single-model caller (provider-aware) ───────────────────────────── */
async function callSingleModel(
  modelDef: ModelDef,
  messages: Array<{ role: string; content: string }>,
  options: { maxTokens?: number; temperature?: number },
  controller: AbortController
): Promise<RaceResult> {
  // Resolve endpoint + API key based on provider
  let endpoint: string;
  let apiKey: string;

  if (modelDef.provider === "groq") {
    // Resolve the specific Groq key for this model slot. If a model
    // references a key index that wasn't configured (e.g. model id=6
    // when GROQ_API_KEY_2 is missing), the activeModels filter below
    // would have already removed it; this is a defensive default.
    const requestedIdx = (modelDef.groqKeyIndex ?? 0) as 0 | 1;
    const resolved = getGroqKeys().find(k => k.index === requestedIdx);
    if (!resolved) throw new Error(`GROQ key index ${requestedIdx} not configured`);
    apiKey = resolved.key;
    endpoint = GROQ_ENDPOINT;
  } else if (modelDef.provider === "gemini") {
    apiKey = (process.env.GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, "");
    endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    if (!apiKey) throw new Error("GEMINI_API_KEY not set");
  } else if (modelDef.provider === "openai") {
    apiKey = (process.env.OPENAI_API_KEY || "").trim().replace(/^["']|["']$/g, "");
    endpoint = OPENAI_ENDPOINT;
    if (!apiKey) throw new Error("OPENAI_API_KEY not set");
  } else {
    apiKey = (process.env.NVIDIA_API_KEY || "").trim().replace(/^["']|["']$/g, "");
    endpoint = NVIDIA_ENDPOINT;
    if (!apiKey) throw new Error("NVIDIA_API_KEY not set");
  }

  const providerTag = modelDef.provider.toUpperCase();

  let bodyJson: string;
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (modelDef.provider === "gemini") {
    const systemMsg = messages.find(m => m.role === "system");
    const rest = messages.filter(m => m.role !== "system");
    const contents = rest.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));
    const geminiBody: any = { contents };
    if (systemMsg) {
      geminiBody.systemInstruction = { parts: [{ text: systemMsg.content }] };
    }
    bodyJson = JSON.stringify(geminiBody);
  } else {
    headers["Authorization"] = `Bearer ${apiKey}`;
    bodyJson = JSON.stringify({
      model: modelDef.name,
      messages,
      max_tokens: options.maxTokens ?? 350,
      temperature: options.temperature ?? 0.25,
      stream: false,
    });
  }

  const modelTimeout = setTimeout(() => {
    console.log(
      `[RACE] [${providerTag}] ${modelDef.name} — ${modelDef.timeout / 1000}s timeout, aborting`
    );
    controller.abort();
  }, modelDef.timeout);

  const startTime = Date.now();

  try {
    console.log(
      `[RACE] → [${providerTag}] ${modelDef.name} | body=${bodyJson.length}B | starting...`
    );

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: bodyJson,
      signal: controller.signal,
    });

    clearTimeout(modelTimeout);
    const httpMs = Date.now() - startTime;
    console.log(`[TELEMETRY-5] AI call – status: ${response.status}, model: ${modelDef.name}, provider: ${modelDef.provider}, duration: ${httpMs}ms`);
    console.log(
      `[RACE] ← [${providerTag}] ${modelDef.name} | HTTP ${response.status} | ${httpMs}ms`
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      const errorObj = new Error(errText || `HTTP ${response.status}`);
      (errorObj as any).status = response.status;
      (errorObj as any).body = errText;
      throw errorObj;
    }

    const parseStart = Date.now();
    const data = await response.json();
    const _parseMs = Date.now() - parseStart;

    let content = "";
    let usage: RaceResult["usage"];
    if (modelDef.provider === "gemini") {
      content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const mu = data.usageMetadata;
      if (mu && typeof mu.promptTokenCount === "number") {
        usage = {
          promptTokens: mu.promptTokenCount,
          completionTokens: typeof mu.candidatesTokenCount === "number" ? mu.candidatesTokenCount : undefined,
          totalTokens: typeof mu.totalTokenCount === "number" ? mu.totalTokenCount : undefined,
        };
      }
    } else {
      content = data.choices?.[0]?.message?.content ?? "";
      const u = data.usage;
      if (u && typeof u.prompt_tokens === "number") {
        usage = {
          promptTokens: u.prompt_tokens,
          completionTokens: typeof u.completion_tokens === "number" ? u.completion_tokens : undefined,
          totalTokens: typeof u.total_tokens === "number" ? u.total_tokens : undefined,
        };
      }
    }

    if (!content) throw new Error("Empty content in response");

    // Reset Groq key health on any successful response.
    if (modelDef.provider === "groq" && typeof modelDef.groqKeyIndex === "number") {
      markGroqKeySuccess(modelDef.groqKeyIndex as 0 | 1);
    }

    const totalMs = Date.now() - startTime;
    console.log(
      `\n[PROVIDER SUCCESS]` +
      `\nProvider: ${modelDef.provider.toUpperCase()}` +
      `\nModel: ${modelDef.name}` +
      `\nHTTP Status: ${response.status}` +
      `\nLatency: ${totalMs}ms` +
      `\nResponse Length: ${content.length} bytes\n`
    );

    return {
      model: modelDef.name,
      content,
      duration: totalMs,
      rank: modelDef.id,
      provider: modelDef.provider,
      usage,
    };
  } catch (err: any) {
    clearTimeout(modelTimeout);
    const isAbort =
      controller.signal.aborted || err?.name === "AbortError";
    const totalMs = Date.now() - startTime;

    const status = err?.status || (isAbort ? 504 : 500);
    const body = err?.body || err?.message || String(err);
    const timedOut = isAbort;

    // Track per-key health for Groq so a recently-failed key is
    // skipped in the next race (cooldown filter in activeModels).
    if (modelDef.provider === "groq" && typeof modelDef.groqKeyIndex === "number") {
      const idx = modelDef.groqKeyIndex as 0 | 1;
      if (status === 429 || status === 401 || status === 403) {
        markGroqKeyFailure(idx, status, body);
        console.warn(
          `[RACE] [GROQ] Key #${idx + 1} failing (${status}) — cooling down for ${GROQ_KEY_COOLDOWN_MS / 1000}s`
        );
      } else if (status === 504 || status === 500) {
        markGroqKeyFailure(idx, 500, body);
      }
    }

    const fallbackReason =
      status === 401 || status === 403
        ? "AUTHENTICATION_FAILURE (Invalid API key)"
        : status === 429
        ? "QUOTA_EXHAUSTED / RATE_LIMITED"
        : status === 400
        ? "BAD_REQUEST (Invalid model or request payload)"
        : status === 504 || timedOut
        ? "TIMEOUT (Model response exceeded timeout)"
        : `SERVER_ERROR (${status})`;

    console.error(
      `\n[PROVIDER FAILURE]` +
      `\nProvider: ${modelDef.provider.toUpperCase()}` +
      `\nModel: ${modelDef.name}` +
      `\nEndpoint: ${endpoint}` +
      `\nHTTP Status: ${status}` +
      `\nLatency: ${totalMs}ms` +
      `\nFallback Reason: ${fallbackReason}` +
      `\nResponse Body: ${body}\n`
    );

    // On 401/403/429, surface WHICH env var the app actually loaded so an
    // operator can compare against Vercel and the provider dashboard. The
    // key is redacted to first-6 + last-4 chars — never the full value.
    if (status === 401 || status === 403 || status === 429) {
      const envName = envNameForProvider(
        modelDef.provider,
        modelDef.provider === "groq" ? modelDef.groqKeyIndex : undefined
      );
      const rawValue = (() => {
        if (modelDef.provider === "groq") {
          const idx = modelDef.groqKeyIndex === 1 ? 1 : 0;
          return idx === 0 ? process.env.GROQ_API_KEY : process.env.GROQ_API_KEY_2;
        }
        if (modelDef.provider === "nvidia") return process.env.NVIDIA_API_KEY;
        if (modelDef.provider === "openai") return process.env.OPENAI_API_KEY;
        if (modelDef.provider === "gemini") return process.env.GEMINI_API_KEY;
        return undefined;
      })();
      console.error(
        `[RACE-KEY-LOADED] env=${envName} provider=${modelDef.provider}` +
        ` keyIndex=${modelDef.provider === "groq" ? (modelDef.groqKeyIndex ?? 0) : "n/a"}` +
        ` redacted=${redactKey(rawValue)} status=${status}` +
        ` | If this is unexpected: (1) confirm the key on Vercel env,` +
        ` (2) confirm it matches the provider dashboard,` +
        ` (3) confirm the request shape (model name, endpoint).`
      );
    }

    throw {
      provider: modelDef.provider,
      providerKeyIndex: modelDef.provider === "groq" ? (modelDef.groqKeyIndex ?? 0) : undefined,
      endpoint,
      model: modelDef.name,
      status,
      body,
      duration: totalMs,
      timedOut
    };
  }
}

/* ─── RACE: 4-model race — first winner takes all ────────────────────
 *
 *  Fires 1 Groq + 3 NVIDIA simultaneously. The FIRST successful response
 *  wins, all others are aborted immediately via their AbortControllers.
 *  Groq almost always wins (1-3s) because NVIDIA free tier queues.
 */
function isKeyValid(key?: string, _provider?: Provider): boolean {
  if (!key) return false;
  const trimmed = key.trim();
  // Only reject clearly invalid placeholder strings. Do NOT validate by prefix —
  // key format is determined by the issuing provider and may change at any time.
  // Actual validity is confirmed by making a real API request.
  return trimmed.length > 0 && trimmed !== "mock-key" && trimmed !== "placeholder-key";
}

/**
 * Probe the Gemini API with a lightweight GET /v1beta/models request.
 * Logs HTTP status + response body so the exact failure reason (auth,
 * quota, endpoint, request-body, model, or other) is visible in the
 * server console without making any inference about key format.
 */
function getKeyLogInfo(key?: string): string {
  if (!key) return "false (missing)";
  const trimmed = key.trim();
  if (trimmed === "mock-key" || trimmed === "placeholder-key") {
    return `false (has placeholder: "${trimmed}")`;
  }
  // Only log presence + length — never log prefixes, which reduces the
  // brute-force search space if logs are exposed.
  return `true (length: ${trimmed.length})`;
}

function formatProviderCheckReport(errors: any[]): string {
  const providers = ["groq", "nvidia", "openai", "gemini"] as const;
  let report = "=== PROVIDER CHECK ===\n";

  providers.forEach((prov) => {
    const key = getApiKey(prov);
    const isEnabled = MODELS.some((m) => m.provider === prov && isKeyValid(key, prov));
    const keyExists = !!key?.trim();
    const endpoint = prov === "groq" ? GROQ_ENDPOINT : prov === "openai" ? OPENAI_ENDPOINT : prov === "gemini" ? "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent" : NVIDIA_ENDPOINT;
    const modelSample = MODELS.find((m) => m.provider === prov)?.name || "unknown";

    const err = errors.find((e) => e.provider === prov);

    report += `${prov.toUpperCase()}:\n`;
    report += `  Enabled: ${isEnabled}\n`;
    report += `  Key Exists: ${keyExists}\n`;

    if (isEnabled && err) {
      report += `  Endpoint: ${err.endpoint}\n`;
      report += `  Model: ${err.model}\n`;
      report += `  HTTP Status: ${err.status}\n`;
      report += `  Response:\n${err.body}\n`;
    } else if (isEnabled) {
      report += `  Endpoint: ${endpoint}\n`;
      report += `  Model: ${modelSample}\n`;
      report += `  HTTP Status: N/A\n`;
      report += `  Response: No error registered (or aborted)\n`;
    } else {
      let reasonExcluded = "Missing environment variable";
      if (keyExists && !isKeyValid(key, prov)) {
        reasonExcluded = `Placeholder or mock value detected ("${key?.trim()}"). Set a real key in environment variables.`;
      }
      report += `  Reason excluded:\n    ${reasonExcluded}\n`;
    }
    report += "\n";
  });

  return report;
}

// Fires once per server process (first import of this module). Prints a
// key-state banner for every provider + market-data + news source the app
// depends on, without ever logging the key value itself.
logStartupBanner();

console.log(
  `\n[AI MODULE INITIALIZATION]` +
  `\nGroq keys: ${getGroqKeys().length} configured` +
  `\nNVIDIA_API_KEY loaded = ${getKeyLogInfo(process.env.NVIDIA_API_KEY)}` +
  `\nGEMINI_API_KEY loaded = ${getKeyLogInfo(process.env.GEMINI_API_KEY)}` +
  `\nOPENAI_API_KEY loaded = ${getKeyLogInfo(process.env.OPENAI_API_KEY)}\n`
);

export async function callFastestModel(
  messages: Array<{ role: string; content: string }>,
  options: { maxTokens?: number; temperature?: number } = {}
): Promise<RaceResult> {
  const raceStart = Date.now();

  // Filter to models whose API key is configured and not dummy/mock.
  // For Groq, also honor per-key cooldown (key #1 just 429'd? skip it
  // for the next 60s so we don't burn quota on a known-bad key).
  const activeModels = MODELS.filter((m) => {
    if (m.provider === "groq") {
      if (!isKeyValid(process.env.GROQ_API_KEY, "groq") && m.groqKeyIndex === 0) return false;
      if (!isKeyValid(process.env.GROQ_API_KEY_2, "groq") && m.groqKeyIndex === 1) return false;
      if (!isGroqKeyUsable((m.groqKeyIndex ?? 0) as 0 | 1)) return false;
      return true;
    }
    if (m.provider === "nvidia") return isKeyValid(process.env.NVIDIA_API_KEY, "nvidia");
    if (m.provider === "openai") return isKeyValid(process.env.OPENAI_API_KEY, "openai");
    if (m.provider === "gemini") return isKeyValid(process.env.GEMINI_API_KEY, "gemini");
    return false;
  });

  // ── Per-request provider diagnostic ──────────────────────────────────
  // Logs only presence/absence and usability — never key prefixes/lengths.
  console.log(
    `[RACE-DIAG] Provider key state:\n` +
    `  GROQ  key1=${process.env.GROQ_API_KEY ? "set" : "MISSING"} | usable=${isGroqKeyUsable(0)}\n` +
    `  GROQ  key2=${process.env.GROQ_API_KEY_2 ? "set" : "MISSING"} | usable=${isGroqKeyUsable(1)}\n` +
    `  NVIDIA=${process.env.NVIDIA_API_KEY ? "set" : "MISSING"}\n` +
    `  GEMINI=${process.env.GEMINI_API_KEY ? "set" : "MISSING"}\n` +
    `  Active models: ${activeModels.map(m => `[${m.provider}]${m.name}`).join(' | ')}\n` +
    `  Total active: ${activeModels.length}`
  );

  if (activeModels.length === 0) {
    const errorReport = formatProviderCheckReport([]);
    console.error(`[RACE] ✗ NO ACTIVE AI PROVIDERS CONFIGURED:\n\n${errorReport}`);
    throw new Error(
      `No AI providers configured. Set NVIDIA_API_KEY, GROQ_API_KEY, or OPENAI_API_KEY in Vercel settings.\n\n${errorReport}`
    );
  }

  const groqCount = activeModels.filter((m) => m.provider === "groq").length;
  const nvidiaCount = activeModels.filter((m) => m.provider === "nvidia").length;
  const openaiCount = activeModels.filter((m) => m.provider === "openai").length;

  console.log(
    `\n[RACE] ======= ${activeModels.length}-MODEL RACE START =======\n` +
      `[RACE] Groq: ${groqCount} | NVIDIA: ${nvidiaCount} | OpenAI: ${openaiCount}\n` +
      `[RACE] Active Providers: ${Array.from(new Set(activeModels.map(m => m.provider.toUpperCase()))).join(", ")}\n` +
      `[RACE] Models: ${activeModels.map((m) => `[${m.provider}] ${m.name}`).join(" | ")}\n` +
      `[RACE] Hard cap: ${HARD_CAP_MS}ms`
  );

  // One AbortController per model
  const controllers = activeModels.map(() => new AbortController());

  // Fire all models simultaneously
  const modelPromises = activeModels.map((model, i) =>
    callSingleModel(model, messages, options, controllers[i])
  );

  return new Promise<RaceResult>((resolve, reject) => {
    let settled = false;
    let remaining = activeModels.length;

    // Hard-cap safety net
    const hardCap = setTimeout(() => {
      if (!settled) {
        settled = true;
        controllers.forEach((c) => c.abort());
        console.error(
          `[RACE] ✗ HARD CAP EXCEEDED (${HARD_CAP_MS}ms) — all models aborted`
        );
        reject(new Error(`All AI models exceeded ${HARD_CAP_MS}ms hard cap`));
      }
    }, HARD_CAP_MS);

    const errors: any[] = [];

    modelPromises.forEach((promise, i) => {
      promise
        .then((result) => {
          if (settled) {
            // Another model already won — discard
            console.log(
              `[RACE] [${result.provider.toUpperCase()}] ${result.model} arrived late (${result.duration}ms) — discarded`
            );
            return;
          }
          // ── WINNER ──────────────────────────────────────────────────
          settled = true;
          clearTimeout(hardCap);

          const raceDuration = Date.now() - raceStart;
          console.log(
            `[RACE] ★ WINNER: [${result.provider.toUpperCase()}] ${result.model} in ${result.duration}ms\n` +
              `[RACE] ======= RACE COMPLETE in ${raceDuration}ms =======\n`
          );

          // Immediately abort every other in-flight request
          controllers.forEach((c, idx) => {
            if (idx !== i) {
              c.abort();
              console.log(
                `[RACE] Cancelled: [${activeModels[idx].provider.toUpperCase()}] ${activeModels[idx].name}`
              );
            }
          });

          resolve(result);
        })
        .catch((errInfo) => {
          errors.push(errInfo);
          remaining--;
          if (remaining === 0 && !settled) {
            // All models failed
            settled = true;
            clearTimeout(hardCap);
            const errorReport = formatProviderCheckReport(errors);
            console.error(
              `[RACE] ✗ ALL ${activeModels.length} MODELS FAILED:\n\n${errorReport}`
            );
            reject(new Error(`All AI models failed or timed out:\n\n${errorReport}`));
          }
        });
    });
  });
}

/* ─── Error normaliser ──────────────────────────────────────────────── */
export function handleNvidiaError(error: any): NvidiaErrorResponse {
  console.error("[AI-RACE] Error:", error?.message ?? error);

  const status = error?.status ?? error?.statusCode ?? 500;

  if (status === 401 || status === 403)
    return { status, message: "AI API authentication failed. Check API keys." };
  if (status === 404)
    return { status, message: "Requested AI model not found or unavailable." };
  if (status === 429)
    return { status, message: "AI rate limit hit. Retry in a few seconds." };
  if (
    error?.code === "ETIMEDOUT" ||
    error?.name === "AbortError" ||
    error?.message?.toLowerCase().includes("timeout") ||
    error?.message?.toLowerCase().includes("hard cap")
  )
    return {
      status: 504,
      message: "AI timed out (>20s). All models were slow. Please try again.",
    };

  return {
    status,
    message: error?.message ?? "Unexpected AI backend error.",
  };
}
