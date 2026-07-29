/**
 * src/lib/api-client.ts
 *
 * The single client-side entry point to the TradCopilot HTTP API. UI code
 * never knows endpoint URLs — it calls `apiClient.get("/profile")` and the
 * knowledge of `/api/v1`, the envelope shape `{ data }`, retry, and error
 * translation lives here once. This is the structural fix for the class of
 * bug where a component hardcoded a URL that didn't exist (the dead
 * `/api/v1/stripe/checkout` call that silently 404'd, and the
 * `/api/v1/settings` route that silently dropped `lastSymbol`): a rename
 * or schema change now breaks in exactly one place, not across ~60 call
 * sites.
 *
 * Non-2xx responses throw a typed `ApiClientError` carrying the server's
 * `error.code` / `error.message` / `error.details`, so callers can branch on
 * `err.code` (e.g. "RATE_LIMITED") instead of string-matching messages.
 */

import type { ApiError, ApiResponse } from "./types";

/** Typed error thrown by `apiClient` for any non-2xx response. */
export class ApiClientError extends Error {
  /** Stable machine-readable code from the server's `error.code`. */
  readonly code: string;
  /** HTTP status. */
  readonly status: number;
  /** Server-supplied `error.details`, if any. */
  readonly details?: Record<string, unknown>;
  constructor(code: string, message: string, status: number, details?: Record<string, unknown>) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export interface RequestOptions {
  /** Caller cancellation (AbortController) — threaded into the fetch. */
  signal?: AbortSignal;
  /** Query-string params; undefined/null values are skipped. */
  query?: Record<string, string | number | boolean | undefined | null>;
}

const API_V1 = "/api/v1";
const API_STRIPE = "/api/stripe";

function buildUrl(base: string, path: string, query?: RequestOptions["query"]): string {
  const url = `${base}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function request<T>(
  method: string,
  base: string,
  path: string,
  body?: unknown,
  options?: RequestOptions
): Promise<T> {
  const url = buildUrl(base, path, options?.query);
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: options?.signal,
    credentials: "same-origin",
  });

  // Parse JSON defensively — a 502 from a proxy may return HTML.
  const json: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const err = (json as ApiError | null)?.error;
    throw new ApiClientError(
      err?.code ?? "INTERNAL_ERROR",
      err?.message ?? `Request to ${path} failed with ${res.status}`,
      res.status,
      err?.details
    );
  }

  // Standard envelope: { data: T, pagination? }. Unwrap so callers get T.
  if (json && typeof json === "object" && "data" in (json as Record<string, unknown>)) {
    return (json as ApiResponse<T>).data;
  }

  // Non-envelope success bodies (e.g. Stripe `{ url }`) — return as-is.
  return json as T;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>("GET", API_V1, path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("POST", API_V1, path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PATCH", API_V1, path, body, options),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>("DELETE", API_V1, path, undefined, options),
  // Stripe routes live under /api/stripe (not /api/v1) — kept separate so the
  // base-path knowledge is still centralized rather than spread across callers.
  stripe: {
    post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
      request<T>("POST", API_STRIPE, path, body, options),
  },
};