import { describe, expect, it } from "vitest";
import { guardProse, renderProseCorrections } from "../prose-guard";

const telemetry = {
  currentPrice: 65000,
  support: 63000,
  resistance: 68000,
  invalidation: 63000,
  bias: "BUY/LONG",
};

const longPlan = {
  direction: "LONG" as const,
  entry: 65000,
  stopLoss: 62800,
  invalidation: 63000,
  target: 68500,
};

describe("guardProse", () => {
  it("accepts citations that match the validated plan", () => {
    const text =
      "If you enter here at $65,000, your stop loss sits at $62,800 and the first target is $68,500.";
    const r = guardProse(text, telemetry, longPlan);
    expect(r.violations).toHaveLength(0);
    expect(r.okCount).toBeGreaterThanOrEqual(3);
  });

  it("accepts verified structure levels without a plan", () => {
    const text = "Key support holds at $63,000 with resistance at $68,000.";
    const r = guardProse(text, telemetry, null);
    expect(r.violations).toHaveLength(0);
  });

  it("REGRESSION (prose form of the SHORT bug): flags a stop on the wrong side for the direction", () => {
    // The exact bug class, now in chat prose: a SHORT whose cited stop
    // is BELOW the current price (stops belong ABOVE for shorts).
    const shortTelemetry = { ...telemetry, bias: "SELL/SHORT", invalidation: 68000 };
    const text = "This is a short setup — your stop loss should be at $63,000.";
    const r = guardProse(text, shortTelemetry, null);
    expect(r.violations.length).toBeGreaterThanOrEqual(1);
    expect(r.violations[0].reason).toContain("wrong side");
    expect(r.violations[0].verifiedValue).toBe(68000);
  });

  it("flags a stop on the wrong side for a LONG (stop above price)", () => {
    const text = "Enter long here; your stop loss is at $68,200.";
    const r = guardProse(text, telemetry, null);
    expect(r.violations.length).toBeGreaterThanOrEqual(1);
    expect(r.violations[0].reason).toContain("wrong side");
  });

  it("flags wildly-fabricated prices from stale model memory (10x off)", () => {
    const text = "Your invalidation is at $650,000 — protect your capital.";
    const r = guardProse(text, telemetry, null);
    expect(r.violations.length).toBeGreaterThanOrEqual(1);
    expect(r.violations[0].reason).toContain("stale model memory");
  });

  it("ignores non-price numbers (percentages, R-multiples, counts, years)", () => {
    const text =
      "Risk 1% of your account. This is a 2.5R setup with a 61% chance of continuation. You've made 30 trades in 2024 and waited 20 minutes.";
    const r = guardProse(text, telemetry, longPlan);
    expect(r.violations).toHaveLength(0);
  });

  it("renders correction notices without rewriting the AI text", () => {
    const r = guardProse("Your stop loss is at $650,000 for this long.", telemetry, null);
    const notice = renderProseCorrections(r);
    expect(notice).toContain("Verified-data correction");
    expect(notice).toContain("stale model memory");
    // The notice is appended — the original claim stays visible to the user.
  });

  it("renders nothing when clean", () => {
    const r = guardProse("Support at $63,000 held.", telemetry, null);
    expect(renderProseCorrections(r)).toBe("");
  });
});