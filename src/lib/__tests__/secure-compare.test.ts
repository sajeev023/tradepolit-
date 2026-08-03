import { secureBearerMatch } from "../secure-compare";
import { describe, it, expect } from "vitest";

describe("secureBearerMatch", () => {
  const secret = "super-secret-cron-token-1234";

  it("accepts a correct Bearer token", () => {
    expect(secureBearerMatch(`Bearer ${secret}`, secret)).toBe(true);
  });

  it("rejects a wrong token", () => {
    expect(secureBearerMatch("Bearer wrong-token", secret)).toBe(false);
  });

  it("fails closed when the expected secret is unset", () => {
    expect(secureBearerMatch(`Bearer ${secret}`, undefined)).toBe(false);
    expect(secureBearerMatch(`Bearer ${secret}`, "")).toBe(false);
  });

  it("fails closed when the authorization header is missing", () => {
    expect(secureBearerMatch(null, secret)).toBe(false);
    expect(secureBearerMatch("", secret)).toBe(false);
  });

  it("rejects a token of a different length without throwing", () => {
    expect(secureBearerMatch(`Bearer ${secret}extra`, secret)).toBe(false);
    expect(secureBearerMatch("Bearer short", secret)).toBe(false);
  });

  it("rejects a non-Bearer scheme", () => {
    expect(secureBearerMatch(`Basic ${secret}`, secret)).toBe(false);
  });

  it("does not match a secret that is a prefix of the presented token", () => {
    expect(secureBearerMatch(`Bearer ${secret}${secret}`, secret)).toBe(false);
  });
});