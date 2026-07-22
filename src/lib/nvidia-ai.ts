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

import OpenAI from "openai";

/* ─── Provider types ─────────────────────────────────────────────────── */
type Provider = "groq" | "nvidia" | "openai" | "gemini";

interface ModelDef {
  id: number;
  name: string;
  provider: Provider;
  quality: "fast" | "good" | "best";
  timeout: number;
}

/* ─── Model registry ─────────────────────────────────────────────────── */
export const MODELS: ModelDef[] = [
  {
    // Groq LPU — flagship 70B model
    id: 0,
    name: "llama-3.3-70b-versatile",
    provider: "groq",
    quality: "good",
    timeout: 15_000,
  },
  {
    // Groq LPU — ultra-fast 8B model
    id: 1,
    name: "llama-3.1-8b-instant",
    provider: "groq",
    quality: "fast",
    timeout: 12_000,
  },
  {
    // Gemini 2.0 Flash
    id: 5,
    name: "gemini-2.0-flash",
    provider: "gemini",
    quality: "good",
    timeout: 10_000,
  },
  {
    // NVIDIA fastest small model
    id: 2,
    name: "meta/llama-3.1-8b-instruct",
    provider: "nvidia",
    quality: "fast",
    timeout: 20_000,
  },
  {
    // NVIDIA highest quality model
    id: 3,
    name: "meta/llama-3.1-70b-instruct",
    provider: "nvidia",
    quality: "good",
    timeout: 22_000,
  },
  {
    // OpenAI fallback model
    id: 4,
    name: "gpt-4o-mini",
    provider: "openai",
    quality: "good",
    timeout: 15_000,
  },
];

/* ─── Endpoint config ────────────────────────────────────────────────── */
const NVIDIA_ENDPOINT =
  process.env.NVIDIA_BASE_URL
    ? `${process.env.NVIDIA_BASE_URL}/chat/completions`
    : "https://integrate.api.nvidia.com/v1/chat/completions";

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";

const HARD_CAP_MS = 25_000; // 25-second hard cap safety net matching maxDuration

/* ─── OpenAI SDK client (kept for backward compat) ───────────────────── */
export const nvidiaClient = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY || "placeholder-key",
  baseURL: process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1",
  timeout: 18000,
  maxRetries: 0,
});

export const NVIDIA_MODEL = MODELS[1].name; // default NVIDIA model

/* ─── Types ─────────────────────────────────────────────────────────── */
export interface RaceResult {
  model: string;
  content: string;
  duration: number;
  rank: number;
  provider: Provider;
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
    apiKey = (process.env.GROQ_API_KEY || "").trim().replace(/^["']|["']$/g, "");
    endpoint = GROQ_ENDPOINT;
    if (!apiKey) throw new Error("GROQ_API_KEY not set");
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
    const parseMs = Date.now() - parseStart;

    let content = "";
    if (modelDef.provider === "gemini") {
      content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    } else {
      content = data.choices?.[0]?.message?.content ?? "";
    }

    if (!content) throw new Error("Empty content in response");

    const totalMs = Date.now() - startTime;
    console.log(
      `[RACE] ✓ [${providerTag}] ${modelDef.name} | json=${parseMs}ms | total=${totalMs}ms | chars=${content.length}`
    );

    return {
      model: modelDef.name,
      content,
      duration: totalMs,
      rank: modelDef.id,
      provider: modelDef.provider,
    };
  } catch (err: any) {
    clearTimeout(modelTimeout);
    const isAbort =
      controller.signal.aborted || err?.name === "AbortError";
    const totalMs = Date.now() - startTime;

    const status = err?.status || (isAbort ? 504 : 500);
    const body = err?.body || err?.message || String(err);
    const timedOut = isAbort;

    console.error(
      `\n${modelDef.provider.toUpperCase()} Request Failed:` +
      `\nStatus: ${status}` +
      `\nModel: ${modelDef.name}` +
      `\nEndpoint: ${endpoint}` +
      `\nTimedOut: ${timedOut}` +
      `\nTime Taken: ${totalMs}ms` +
      `\nError: ${body}\n`
    );

    throw {
      provider: modelDef.provider,
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
function isKeyValid(key?: string): boolean {
  if (!key) return false;
  const trimmed = key.trim();
  return trimmed.length > 0 && trimmed !== "mock-key" && trimmed !== "placeholder-key";
}

function getApiKey(provider: Provider): string | undefined {
  if (provider === "groq") return process.env.GROQ_API_KEY;
  if (provider === "nvidia") return process.env.NVIDIA_API_KEY;
  if (provider === "openai") return process.env.OPENAI_API_KEY;
  if (provider === "gemini") return process.env.GEMINI_API_KEY;
  return undefined;
}

function getKeyLogInfo(key?: string): string {
  if (!key) return "false (missing)";
  const trimmed = key.trim();
  if (trimmed === "mock-key" || trimmed === "placeholder-key") {
    return `false (has placeholder: "${trimmed}")`;
  }
  return `true (length: ${trimmed.length}, prefix: ${trimmed.substring(0, 6)}...)`;
}

function formatProviderCheckReport(errors: any[]): string {
  const providers = ["groq", "nvidia", "openai", "gemini"] as const;
  let report = "=== PROVIDER CHECK ===\n";

  providers.forEach((prov) => {
    const key = getApiKey(prov);
    const isEnabled = MODELS.some((m) => m.provider === prov && isKeyValid(key));
    const keyExists = !!key?.trim();
    const keyPrefix = keyExists ? key!.trim().substring(0, 6) + "..." : "NONE";
    const endpoint = prov === "groq" ? GROQ_ENDPOINT : prov === "openai" ? OPENAI_ENDPOINT : prov === "gemini" ? "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent" : NVIDIA_ENDPOINT;
    const modelSample = MODELS.find((m) => m.provider === prov)?.name || "unknown";

    const err = errors.find((e) => e.provider === prov);

    report += `${prov.toUpperCase()}:\n`;
    report += `  Enabled: ${isEnabled}\n`;
    report += `  Key Exists: ${keyExists}\n`;
    report += `  Key Prefix: ${keyPrefix}\n`;

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
      if (keyExists && !isKeyValid(key)) {
        reasonExcluded = `Placeholder or mock value detected ("${key?.trim()}")`;
      }
      report += `  Reason excluded:\n    ${reasonExcluded}\n`;
    }
    report += "\n";
  });

  return report;
}

console.log(
  `\n[AI MODULE INITIALIZATION]` +
  `\nGROQ_API_KEY loaded = ${getKeyLogInfo(process.env.GROQ_API_KEY)}` +
  `\nNVIDIA_API_KEY loaded = ${getKeyLogInfo(process.env.NVIDIA_API_KEY)}` +
  `\nGEMINI_API_KEY loaded = ${getKeyLogInfo(process.env.GEMINI_API_KEY)}` +
  `\nOPENAI_API_KEY loaded = ${getKeyLogInfo(process.env.OPENAI_API_KEY)}\n`
);

export async function callFastestModel(
  messages: Array<{ role: string; content: string }>,
  options: { maxTokens?: number; temperature?: number } = {}
): Promise<RaceResult> {
  const raceStart = Date.now();

  // Filter to models whose API key is configured and not dummy/mock
  const activeModels = MODELS.filter((m) => {
    if (m.provider === "groq") return isKeyValid(process.env.GROQ_API_KEY);
    if (m.provider === "nvidia") return isKeyValid(process.env.NVIDIA_API_KEY);
    if (m.provider === "openai") return isKeyValid(process.env.OPENAI_API_KEY);
    if (m.provider === "gemini") return isKeyValid(process.env.GEMINI_API_KEY);
    return false;
  });

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
