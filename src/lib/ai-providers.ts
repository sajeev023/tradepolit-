/**
 * ai-providers.ts
 * Multi-provider sequential fallback AI engine with exponential backoff retry.
 * Order: Groq -> NVIDIA -> Gemini
 * Each provider is retried with exponential backoff before falling to the next.
 */

import { redactKey, envNameForProvider } from "./startup";

interface ProviderStatus {
  status: "online" | "offline" | "rate_limited";
  lastResponseTime: number;
  lastChecked: string;
  cooldownUntil: number;
  consecutiveFailures: number;
  lastError?: string;
}

const providerStates: Record<string, ProviderStatus> = {
  gemini: { status: "online", lastResponseTime: -1, lastChecked: new Date().toISOString(), cooldownUntil: 0, consecutiveFailures: 0 },
  groq: { status: "online", lastResponseTime: -1, lastChecked: new Date().toISOString(), cooldownUntil: 0, consecutiveFailures: 0 },
  nvidia: { status: "online", lastResponseTime: -1, lastChecked: new Date().toISOString(), cooldownUntil: 0, consecutiveFailures: 0 },
};

const COOLDOWN_DURATION_MS = 60_000;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1_000;

export function getApiKey(name: string): string | undefined {
  if (name === "gemini") return process.env.GEMINI_API_KEY || process.env.GEMINI_PREMIUM_API_KEY;
  if (name === "groq") return process.env.GROQ_API_KEY || process.env.GROQ_PREMIUM_API_KEY;
  if (name === "nvidia") return process.env.NVIDIA_API_KEY || process.env.NVIDIA_PREMIUM_API_KEY;
  return undefined;
}

function safeKeyInfo(raw: string | undefined): { present: boolean; prefix: string; length: number } {
  if (!raw) return { present: false, prefix: "", length: 0 };
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "mock-key" || trimmed === "placeholder-key") {
    return { present: false, prefix: "", length: 0 };
  }
  return { present: true, prefix: trimmed.substring(0, 6), length: trimmed.length };
}

function isKeyValid(key?: string): boolean {
  if (!key) return false;
  const trimmed = key.trim();
  return trimmed.length > 0 && trimmed !== "mock-key" && trimmed !== "placeholder-key";
}

function isProviderUsable(name: string): boolean {
  const state = providerStates[name];
  const apiKey = getApiKey(name);
  if (!isKeyValid(apiKey)) {
    return false;
  }

  if (state.status === "rate_limited") {
    if (Date.now() < state.cooldownUntil) {
      return false;
    }
    state.status = "online";
  }

  return state.status !== "offline";
}

function convertMessagesToGemini(messages: Array<{ role: string; content: string }>) {
  const systemMsg = messages.find(m => m.role === "system");
  const rest = messages.filter(m => m.role !== "system");

  const contents = rest.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));

  const body: any = { contents };
  if (systemMsg) {
    body.systemInstruction = {
      parts: [{ text: systemMsg.content }]
    };
  }
  return body;
}

async function callSingleProviderWithRetry(
  name: "gemini" | "groq" | "nvidia",
  messages: Array<{ role: string; content: string }>,
  options: { maxTokens?: number; temperature?: number }
): Promise<{ content: string; duration: number; provider: string; model: string }> {
  let lastError: any = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    try {
      if (attempt > 0) {
        const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1) + Math.random() * 500;
        console.log(`[AI_PROVIDER] [${name.toUpperCase()}] Retry ${attempt}/${MAX_RETRIES} after ${delay.toFixed(0)}ms backoff`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      const result = await callSingleProvider(name, messages, options, controller);
      return result;
    } catch (err: any) {
      lastError = err;
      const isRateLimit = err?.status === 429;
      const isTimeout = err?.timedOut || err?.status === 504;
      const isServerError = err?.status >= 500;

      if (isRateLimit || isTimeout || isServerError) {
        if (attempt < MAX_RETRIES) {
          console.log(`[AI_PROVIDER] [${name.toUpperCase()}] Transient error (${err?.status}), retrying...`);
          continue;
        }
      }
      break;
    } finally {
      controller.abort();
    }
  }

  throw lastError || new Error(`Provider ${name} failed after ${MAX_RETRIES + 1} attempts`);
}

async function callSingleProvider(
  name: "gemini" | "groq" | "nvidia",
  messages: Array<{ role: string; content: string }>,
  options: { maxTokens?: number; temperature?: number },
  controller: AbortController
): Promise<{ content: string; duration: number; provider: string; model: string }> {
  const startTime = Date.now();
  const state = providerStates[name];
  const apiKey = getApiKey(name);

  if (!apiKey) {
    throw new Error(`API key for ${name} is missing.`);
  }

  let endpoint = "";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  let bodyJson = "";
  let modelName = "";

  if (name === "gemini") {
    modelName = "gemini-2.0-flash";
    endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    bodyJson = JSON.stringify(convertMessagesToGemini(messages));
  } else if (name === "groq") {
    modelName = "llama-3.3-70b-versatile";
    endpoint = "https://api.groq.com/openai/v1/chat/completions";
    headers["Authorization"] = `Bearer ${apiKey}`;
    bodyJson = JSON.stringify({
      model: modelName,
      messages,
      temperature: options.temperature ?? 0.25,
      max_tokens: options.maxTokens ?? 350
    });
  } else {
    modelName = "meta/llama-3.2-11b-vision-instruct";
    endpoint = "https://integrate.api.nvidia.com/v1/chat/completions";
    headers["Authorization"] = `Bearer ${apiKey}`;
    bodyJson = JSON.stringify({
      model: modelName,
      messages,
      temperature: options.temperature ?? 0.25,
      max_tokens: options.maxTokens ?? 350
    });
  }

  const timeoutMs = name === "groq" ? 8_000 : name === "nvidia" ? 12_000 : 10_000;

  const timeoutId = setTimeout(() => {
    console.log(`[AI_PROVIDER] [${name.toUpperCase()}] Timeout reached after ${timeoutMs}ms. Aborting.`);
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: bodyJson,
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;
    state.lastChecked = new Date().toISOString();

    if (!response.ok) {
      const status = response.status;
      const text = await response.text().catch(() => "");

      if (status === 429) {
        state.status = "rate_limited";
        state.cooldownUntil = Date.now() + COOLDOWN_DURATION_MS;
        console.error(`[RATE_LIMIT] [${new Date().toISOString()}] Provider ${name.toUpperCase()} hit 429. Setting cooldown for ${COOLDOWN_DURATION_MS / 1000}s.`);
      } else if (status === 401 || status === 403) {
        state.status = "offline";
        console.error(`[AUTH_FAILED] [${new Date().toISOString()}] Provider ${name.toUpperCase()} auth failed (HTTP ${status}). Flagging as offline.`);
      } else {
        state.consecutiveFailures++;
        if (state.consecutiveFailures >= 3) {
          state.status = "offline";
        }
      }
      state.lastError = `HTTP ${status}: ${text}`;

      // Surface which env var was loaded so the operator can match it
      // against Vercel and the provider dashboard. The key value is
      // redacted to first-6 + last-4 chars, never full.
      if (status === 401 || status === 403 || status === 429) {
        const envName = envNameForProvider(name);
        const rawValue = (() => {
          if (name === "groq") return process.env.GROQ_API_KEY;
          if (name === "nvidia") return process.env.NVIDIA_API_KEY;
          if (name === "gemini") return process.env.GEMINI_API_KEY;
          return undefined;
        })();
        console.error(
          `[AI-KEY-LOADED] env=${envName} provider=${name}` +
          ` redacted=${redactKey(rawValue)} status=${status}` +
          ` | Verify: (1) Vercel env, (2) provider dashboard, (3) request shape.`
        );
      }

      throw { status, body: text, provider: name };
    }

    const data = await response.json();
    let content = "";
    if (name === "gemini") {
      content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    } else {
      content = data.choices?.[0]?.message?.content ?? "";
    }

    if (!content) {
      throw new Error("Empty response content");
    }

    state.status = "online";
    state.lastResponseTime = duration;
    state.consecutiveFailures = 0;
    state.lastError = undefined;

    return {
      content,
      duration,
      provider: name,
      model: modelName
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    state.lastChecked = new Date().toISOString();

    const isAbort = controller.signal.aborted || err?.name === "AbortError";
    if (isAbort) {
      throw { status: 504, body: "Timeout or Aborted", provider: name, timedOut: true };
    }

    throw {
      status: err?.status || 500,
      body: err?.body || err?.message || String(err),
      provider: name
    };
  }
}

export async function callFastestAIModel(
  messages: Array<{ role: string; content: string }>,
  options: { maxTokens?: number; temperature?: number } = {}
): Promise<{ content: string; duration: number; provider: string; model: string }> {
  const pipelineStart = Date.now();
  const sequence: Array<"groq" | "nvidia" | "gemini"> = ["groq", "nvidia", "gemini"];

  const errors: any[] = [];

  console.log(
    `\n[FALLBACK_PIPELINE] ======= STARTING SEQUENTIAL CHAIN (with retry) =======` +
    `\n[FALLBACK_PIPELINE] Sequence: ${sequence.map(p => p.toUpperCase()).join(" → ")}`
  );

  for (const name of sequence) {
    if (!isProviderUsable(name)) {
      console.log(`[FALLBACK_PIPELINE] Skipping unusable/offline/limited provider: [${name.toUpperCase()}]`);
      errors.push({ provider: name, error: "Skipped: offline or in cooldown" });
      continue;
    }

    console.log(`[FALLBACK_PIPELINE] Attempting provider [${name.toUpperCase()}] with exponential backoff retry...`);
    try {
      const result = await callSingleProviderWithRetry(name, messages, options);
      const totalDuration = Date.now() - pipelineStart;
      console.log(
        `[FALLBACK_PIPELINE] ★ SUCCESS: [${result.provider.toUpperCase()}] ${result.model} in ${result.duration}ms` +
        `\n[FALLBACK_PIPELINE] ======= CHAIN COMPLETE in ${totalDuration}ms =======\n`
      );
      return result;
    } catch (err: any) {
      console.error(`[FALLBACK_PIPELINE] Provider [${name.toUpperCase()}] failed after retries:`, err?.body || err?.message || err);
      errors.push(err);
    }
  }

  console.error("[FALLBACK_PIPELINE] ✗ ALL PROVIDERS IN THE CHAIN FAILED");
  throw new Error(`All AI providers failed after retries.`);
}

export function getProviderHealth() {
  const result: Record<string, { status: string; lastResponseTime: number; lastChecked: string; lastError?: string }> = {};
  for (const name of ["gemini", "groq", "nvidia"]) {
    const state = providerStates[name];
    const apiKey = getApiKey(name);
    const hasKey = isKeyValid(apiKey);
    const hasPremium = name === "groq" ? !!process.env.GROQ_PREMIUM_API_KEY
      : name === "nvidia" ? !!process.env.NVIDIA_PREMIUM_API_KEY
      : !!process.env.GEMINI_PREMIUM_API_KEY;

    let currentStatus = state.status;
    if (!hasKey) {
      currentStatus = "offline";
    } else if (state.status === "rate_limited" && Date.now() >= state.cooldownUntil) {
      currentStatus = "online";
    }

    result[name] = {
      status: currentStatus,
      lastResponseTime: state.lastResponseTime,
      lastChecked: state.lastChecked,
      lastError: state.lastError
    };
    (result[name] as any).hasPremiumKey = hasPremium;
  }
  return result;
}

/**
 * Extended provider health used by the admin /provider-health route.
 * Returns one entry per provider/key, including the data providers
 * (TwelveData, Finnhub, NewsAPI) that don't participate in the AI race.
 *
 * Shape:
 *   {
 *     groq: { key1: {...}, key2: {...} },
 *     nvidia: {...},
 *     gemini: {...},
 *     openai: {...},
 *     twelvedata: { present, prefix, length },
 *     finnhub: { present, prefix, length },
 *     newsapi:  { present, prefix, length }
 *   }
 */
export function getExtendedProviderHealth() {
  const ai = getProviderHealth();

  const twelvedata = safeKeyInfo(process.env.TWELVEDATA_API_KEY);
  const finnhub = safeKeyInfo(process.env.FINNHUB_API_KEY);
  const newsapi = safeKeyInfo(process.env.NEWS_API_KEY ?? process.env.NEWSAPI_API_KEY);

  // Lazy import to avoid a circular dep with nvidia-ai.ts (which imports
  // this file's exports). Only the admin route will pay this cost.
  let groqKeyHealth: Record<string, unknown> = {};
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getGroqKeyHealth } = require("./nvidia-ai") as typeof import("./nvidia-ai");
    groqKeyHealth = getGroqKeyHealth();
  } catch {
    // If nvidia-ai isn't loaded yet (rare), return empty rather than throw.
  }

  return {
    groq: {
      key1: { ...(ai.groq as object), ...(groqKeyHealth.key1 as object ?? {}), keyInfo: safeKeyInfo(process.env.GROQ_API_KEY) },
      key2: { keyInfo: safeKeyInfo(process.env.GROQ_API_KEY_2), ...(groqKeyHealth.key2 as object ?? {}) },
    },
    nvidia: ai.nvidia,
    gemini: ai.gemini,
    openai: {
      present: safeKeyInfo(process.env.OPENAI_API_KEY).present,
      prefix: safeKeyInfo(process.env.OPENAI_API_KEY).prefix,
      length: safeKeyInfo(process.env.OPENAI_API_KEY).length,
    },
    twelvedata: twelvedata,
    finnhub: finnhub,
    newsapi: newsapi,
  };
}
