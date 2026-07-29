/**
 * src/lib/route-handler.ts
 *
 * `createHandler` / `createPublicHandler` collapse the boilerplate copy-pasted
 * across ~40 API routes: authenticate → rate-limit → validate body → validate
 * query → run handler → catch into the ApiError envelope. Every route built on
 * them is guaranteed to (a) enforce auth (or explicitly be public), (b) carry
 * a rate limit unless it explicitly opts out, (c) reject untrusted input via
 * Zod before the handler sees it, and (d) emit the `ApiError` envelope on every
 * failure path. Routes throw typed `BaseError` subclasses; the wrapper renders
 * them via `toErrorResponse`.
 *
 * This is the structural fix for two recurring defects: routes that forgot a
 * rate limit (unbounded writes — trades, watchlists, journal, alerts) and
 * routes whose outer catch lumped DB outages, auth failures, and programmer
 * bugs into the same generic 500 via `dispatchCaughtError(err?: any)`.
 *
 * `createHandler` (auth required) hands the handler a non-null `User`, so no
 * `!` assertions leak into route code. `createPublicHandler` (no auth) omits
 * the user entirely — the two are distinct so the compiler, not a runtime
 * guard, enforces "authed routes have a user."
 */

import { NextRequest, NextResponse } from "next/server";
import type { ZodSchema } from "zod";
import type { User } from "@prisma/client";
import { getAuthenticatedUser } from "./auth";
import { checkUserRateLimit } from "./rate-limit";
import { unauthorizedError } from "./api-helpers";
import {
  dispatchCaughtError,
  ZodValidationError,
  RateLimitError,
  toErrorResponse,
} from "./typed-errors";

export interface AuthedContext<Body, Query> {
  request: NextRequest;
  /** Authenticated Prisma user — non-null, guaranteed by the auth gate. */
  user: User;
  /** Zod-validated request body (when `schema` provided). */
  body: Body;
  /** Zod-validated query params (when `querySchema` provided). */
  query: Query;
}

export interface PublicContext<Body, Query> {
  request: NextRequest;
  body: Body;
  query: Query;
}

export interface RateLimitConfig {
  /** LRU key prefix, e.g. "journal", "trades". */
  prefix: string;
  /** Max requests within the window. */
  max: number;
  /** Window length in ms. */
  windowMs: number;
}

interface BaseConfig<Body, Query> {
  /**
   * Per-user rate limit (IP when unauthenticated). Omit to apply a sane
   * default (60/min); set `false` to explicitly opt out (logged in
   * non-production so the opt-out is visible, never silent).
   */
  rateLimit?: RateLimitConfig | false;
  /** Zod schema for the JSON request body. */
  schema?: ZodSchema<Body>;
  /** Zod schema for the URL query params (parsed from string values). */
  querySchema?: ZodSchema<Query>;
}

export interface AuthedConfig<Body, Query> extends BaseConfig<Body, Query> {
  /** The route body. Return a NextResponse, or throw a BaseError subclass. */
  handler: (ctx: AuthedContext<Body, Query>) => Promise<NextResponse>;
}

export interface PublicConfig<Body, Query> extends BaseConfig<Body, Query> {
  handler: (ctx: PublicContext<Body, Query>) => Promise<NextResponse>;
}

const DEFAULT_RATE_LIMIT: RateLimitConfig = { prefix: "api", max: 60, windowMs: 60_000 };

async function applyRateLimit(
  request: NextRequest,
  userId: string | null,
  rateLimit: RateLimitConfig | false | undefined
): Promise<NextResponse | null> {
  if (rateLimit === false) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[route-handler] ${request.method} ${request.nextUrl.pathname} explicitly opted out of rate limiting`
      );
    }
    return null;
  }
  const rl = checkUserRateLimit(
    userId,
    request,
    rateLimit?.prefix ?? DEFAULT_RATE_LIMIT.prefix,
    rateLimit?.max ?? DEFAULT_RATE_LIMIT.max,
    rateLimit?.windowMs ?? DEFAULT_RATE_LIMIT.windowMs
  );
  if (!rl.result.allowed) {
    return toErrorResponse(new RateLimitError(rl.result.resetAt - Date.now()));
  }
  return null;
}

async function parseBody<Body>(request: NextRequest, schema: ZodSchema<Body> | undefined): Promise<{ body: Body; error: null } | { body: null; error: NextResponse }> {
  if (!schema) return { body: undefined as unknown as Body, error: null };
  const json = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(json);
  if (!parsed.success) return { body: null, error: toErrorResponse(new ZodValidationError(parsed.error)) };
  return { body: parsed.data, error: null };
}

function parseQuery<Query>(request: NextRequest, schema: ZodSchema<Query> | undefined): { query: Query; error: null } | { query: null; error: NextResponse } {
  if (!schema) return { query: {} as unknown as Query, error: null };
  const sp = new URL(request.url).searchParams;
  const raw: Record<string, string> = {};
  sp.forEach((value, key) => { raw[key] = value; });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { query: null, error: toErrorResponse(new ZodValidationError(parsed.error)) };
  return { query: parsed.data, error: null };
}

/** Build an authenticated route handler. `user` in the handler is non-null. */
export function createHandler<Body = undefined, Query = Record<string, string | null>>(
  config: AuthedConfig<Body, Query>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const { rateLimit, schema, querySchema, handler } = config;
    try {
      const { user, error } = await getAuthenticatedUser();
      if (error || !user) return error ?? unauthorizedError();

      const rlResponse = await applyRateLimit(request, user.id, rateLimit);
      if (rlResponse) return rlResponse;

      const bodyResult = await parseBody(request, schema);
      if (bodyResult.error) return bodyResult.error;

      const queryResult = parseQuery(request, querySchema);
      if (queryResult.error) return queryResult.error;

      return await handler({ request, user, body: bodyResult.body, query: queryResult.query });
    } catch (err) {
      return dispatchCaughtError("Request failed", err);
    }
  };
}

/** Build a public (unauthenticated) route handler. No `user` in the context. */
export function createPublicHandler<Body = undefined, Query = Record<string, string | null>>(
  config: PublicConfig<Body, Query>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const { rateLimit, schema, querySchema, handler } = config;
    try {
      const rlResponse = await applyRateLimit(request, null, rateLimit);
      if (rlResponse) return rlResponse;

      const bodyResult = await parseBody(request, schema);
      if (bodyResult.error) return bodyResult.error;

      const queryResult = parseQuery(request, querySchema);
      if (queryResult.error) return queryResult.error;

      return await handler({ request, body: bodyResult.body, query: queryResult.query });
    } catch (err) {
      return dispatchCaughtError("Request failed", err);
    }
  };
}