import { NextResponse } from "next/server";
import { ZodError } from "zod";
import type { ApiError, ErrorCode } from "@/lib/types";

export function successResponse<T>(data: T, status = 200, headers?: HeadersInit) {
  return NextResponse.json({ data }, { status, headers });
}

export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
) {
  return NextResponse.json(
    {
      data,
      pagination: { page, limit, total },
    },
    { status: 200 }
  );
}

export function errorResponse(
  code: ErrorCode,
  message: string,
  status: number,
  details?: Record<string, unknown>,
  headers?: HeadersInit
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      error: { code, message, details },
    },
    { status, headers }
  );
}

export function validationError(error: ZodError) {
  return errorResponse("VALIDATION_ERROR", "Validation failed", 400, {
    issues: error.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    })),
  });
}

// For ad-hoc validation failures that aren't a full Zod parse (e.g. a
// referenced entity that doesn't exist). Replaces the `{ issues: [...] } as any`
// casts that fabricated fake ZodError objects across routes.
export function validationErrorFromIssues(
  issues: Array<{ path: Array<string | number>; message: string }>
) {
  return errorResponse("VALIDATION_ERROR", "Validation failed", 400, {
    issues: issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    })),
  });
}

export function unauthorizedError(message = "Authentication required") {
  return errorResponse("UNAUTHORIZED", message, 401);
}

export function forbiddenError(message = "Access denied") {
  return errorResponse("FORBIDDEN", message, 403);
}

export function notFoundError(resource = "Resource") {
  return errorResponse("NOT_FOUND", `${resource} not found`, 404);
}

export function conflictError(message: string) {
  return errorResponse("CONFLICT", message, 409);
}

export function rateLimitError(message = "Rate limit exceeded") {
  return errorResponse("RATE_LIMITED", message, 429);
}

export function upstreamError(message = "External service unavailable") {
  return errorResponse("UPSTREAM_UNAVAILABLE", message, 502);
}

export function aiUnavailableError() {
  return errorResponse(
    "UPSTREAM_UNAVAILABLE",
    "Market telemetry fallback active. Please refresh and try again.",
    503
  );
}

export function internalError(message = "Internal server error") {
  return errorResponse("INTERNAL_ERROR", message, 500);
}
