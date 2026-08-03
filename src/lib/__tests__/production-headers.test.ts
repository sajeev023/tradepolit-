import { describe, it, expect } from "vitest";

describe("next.config production security headers", () => {
  it("emits Content-Security-Policy and the baseline security headers", async () => {
    const mod = await import("../../../next.config");
    const config = mod.default;
    const headers = await config.headers!();
    const all = headers.flatMap((h) => h.headers);
    const keys = all.map((h) => h.key);

    expect(keys).toContain("Content-Security-Policy");
    expect(keys).toContain("X-Frame-Options");
    expect(keys).toContain("X-Content-Type-Options");
    expect(keys).toContain("Referrer-Policy");
    expect(keys).toContain("Permissions-Policy");
  });

  it("CSP scopes to the origins the app actually uses and denies the rest", async () => {
    const mod = await import("../../../next.config");
    const headers = await mod.default.headers!();
    const all = headers.flatMap((h) => h.headers);
    const csp = all.find((h) => h.key === "Content-Security-Policy")!.value;

    // Baseline hardening directives.
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("frame-ancestors 'self'");

    // Third-party origins the MVP genuinely depends on.
    expect(csp).toContain("tradingview.com"); // chart embed (script + frame)
    expect(csp).toContain("stream.binance.com:9443"); // live price WebSocket
    expect(csp).toContain("clarity.ms"); // analytics
  });
});