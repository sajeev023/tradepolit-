import { timingSafeEqual } from "node:crypto";

/**
 * Constant-time comparison of a bearer token against an expected secret.
 *
 * `!==` string comparison short-circuits on the first differing byte and is
 * a theoretical timing side-channel for secret recovery. This compares the
 * byte lengths first (length itself is not secret for bearer tokens) and then
 * the contents in constant time. Returns false if either side is missing or
 * the lengths differ, without leaking which.
 */
export function secureBearerMatch(
  authorization: string | null,
  expectedSecret: string | undefined
): boolean {
  if (!expectedSecret) return false;
  if (!authorization) return false;
  const expected = `Bearer ${expectedSecret}`;
  const a = Buffer.from(authorization);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}