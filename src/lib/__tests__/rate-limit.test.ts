import { describe, it, expect, beforeEach } from "vitest";
import {
  checkRateLimit,
  checkUserRateLimit,
  checkIpRateLimit,
} from "../rate-limit";

// Isolate each test to a unique prefix so the module-level store (shared
// across tests in the same worker) does not leak state between cases.
let prefixCounter = 0;
function freshPrefix(): string {
  return `test-${prefixCounter++}`;
}

describe("checkRateLimit — functional behavior (regression)", () => {
  it("allows requests up to the limit, then blocks", () => {
    const prefix = freshPrefix();
    const max = 3;
    for (let i = 0; i < max; i++) {
      const r = checkRateLimit("user-1", prefix, max, 60_000);
      expect(r.allowed).toBe(true);
      expect(r.remaining).toBe(max - (i + 1));
    }
    // 4th request exceeds the window limit
    const blocked = checkRateLimit("user-1", prefix, max, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("tracks different identifiers independently", () => {
    const prefix = freshPrefix();
    const max = 1;
    expect(checkRateLimit("user-a", prefix, max, 60_000).allowed).toBe(true);
    expect(checkRateLimit("user-a", prefix, max, 60_000).allowed).toBe(false);
    // user-b has its own bucket
    expect(checkRateLimit("user-b", prefix, max, 60_000).allowed).toBe(true);
  });

  it("resets the counter after the window expires", async () => {
    const prefix = freshPrefix();
    const max = 1;
    const windowMs = 50; // 50ms window
    expect(checkRateLimit("user-1", prefix, max, windowMs).allowed).toBe(true);
    expect(checkRateLimit("user-1", prefix, max, windowMs).allowed).toBe(false);
    // Wait for the window to pass
    await new Promise((resolve) => setTimeout(resolve, windowMs + 10));
    // Counter should have reset
    expect(checkRateLimit("user-1", prefix, max, windowMs).allowed).toBe(true);
  });
});

describe("checkRateLimit — memory management (P1 fix)", () => {
  it("sweeps expired entries once enough ops have elapsed", async () => {
    const prefix = freshPrefix();
    const windowMs = 30;
    // Open a short-lived bucket for an identifier
    checkRateLimit("sweep-me", prefix, 5, windowMs);
    // Wait for it to expire
    await new Promise((resolve) => setTimeout(resolve, windowMs + 10));
    // Drive >= SWEEP_INTERVAL_OPS (100) fresh calls with a tiny window so each
    // new key is immediately expired too. After the sweep triggers, previously
    // expired entries are gone and a previously-seen key resets to a fresh count.
    const trigger = freshPrefix();
    for (let i = 0; i < 100; i++) {
      checkRateLimit(`flood-${i}`, trigger, 1, 1);
    }
    // The original expired key must now start fresh (count = 1, not carried over)
    const after = checkRateLimit("sweep-me", prefix, 5, 60_000);
    expect(after.allowed).toBe(true);
    expect(after.remaining).toBe(4);
  });
});

describe("checkUserRateLimit", () => {
  it("prefers the user ID over IP and namespaces accordingly", () => {
    const prefix = freshPrefix();
    const fakeReq = new Request("http://localhost", {
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    const { result, identifier } = checkUserRateLimit(
      "user-123",
      fakeReq,
      prefix,
      5,
      60_000
    );
    expect(identifier).toBe("user-123");
    expect(result.allowed).toBe(true);
  });

  it("falls back to ip: prefix when no user id is given", () => {
    const prefix = freshPrefix();
    const fakeReq = new Request("http://localhost", {
      headers: { "x-forwarded-for": "5.6.7.8" },
    });
    const { identifier } = checkUserRateLimit(
      null,
      fakeReq,
      prefix,
      5,
      60_000
    );
    expect(identifier).toBe("ip:5.6.7.8");
  });
});

describe("checkIpRateLimit", () => {
  it("blocks after exceeding the IP limit", () => {
    const prefix = freshPrefix();
    const max = 2;
    for (let i = 0; i < max; i++) {
      const r = checkIpRateLimit(
        new Request("http://localhost", { headers: { "x-forwarded-for": "9.9.9.9" } }),
        prefix,
        max,
        60_000
      );
      expect(r.allowed).toBe(true);
    }
    const blocked = checkIpRateLimit(
      new Request("http://localhost", { headers: { "x-forwarded-for": "9.9.9.9" } }),
      prefix,
      max,
      60_000
    );
    expect(blocked.allowed).toBe(false);
  });
});
