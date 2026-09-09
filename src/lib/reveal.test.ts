import { describe, it, expect } from "vitest";
import {
  clamp01,
  easeOutExpo,
  easeLargeMotion,
  formatNumeric,
  computeCountUp,
  resolveRevealClassName,
} from "./reveal";

describe("clamp01", () => {
  it("clamps values below 0 to 0", () => {
    expect(clamp01(-5)).toBe(0);
  });
  it("clamps values above 1 to 1", () => {
    expect(clamp01(5)).toBe(1);
  });
  it("passes through values inside the range", () => {
    expect(clamp01(0.42)).toBe(0.42);
  });
  it("treats NaN as 0", () => {
    expect(clamp01(NaN)).toBe(0);
  });
});

describe("easeOutExpo", () => {
  it("is 0 at progress 0", () => {
    expect(easeOutExpo(0)).toBe(0);
  });
  it("is 1 at progress 1", () => {
    expect(easeOutExpo(1)).toBe(1);
  });
  it("is monotonically increasing on [0,1]", () => {
    let prev = -Infinity;
    for (let i = 0; i <= 20; i++) {
      const v = easeOutExpo(i / 20);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
  it("clamps out-of-range progress", () => {
    expect(easeOutExpo(-1)).toBe(0);
    expect(easeOutExpo(2)).toBe(1);
  });
});

describe("easeLargeMotion (cubic-bezier(.2,.7,.2,1))", () => {
  it("starts at 0 and ends at 1", () => {
    expect(easeLargeMotion(0)).toBeCloseTo(0, 6);
    expect(easeLargeMotion(1)).toBeCloseTo(1, 6);
  });
  it("is monotonically increasing", () => {
    let prev = -Infinity;
    for (let i = 0; i <= 40; i++) {
      const v = easeLargeMotion(i / 40);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = v;
    }
  });
  it("is roughly past the midpoint at p=0.5 (ease-out overshoots early)", () => {
    // cubic-bezier(.2,.7,.2,1) reaches ~0.83 at t=0.5 — characteristic of
    // a fast-attack, slow-settle ease. Assert it is well above 0.5.
    expect(easeLargeMotion(0.5)).toBeGreaterThan(0.6);
  });
});

describe("formatNumeric", () => {
  it("groups thousands with en-US formatting", () => {
    expect(formatNumeric(92450)).toBe("92,450");
  });
  it("respects decimals", () => {
    expect(formatNumeric(3.14159, 2)).toBe("3.14");
  });
  it("pads to minimum decimals", () => {
    expect(formatNumeric(42, 2)).toBe("42.00");
  });
  it("handles 0", () => {
    expect(formatNumeric(0, 0)).toBe("0");
  });
});

describe("computeCountUp", () => {
  it("returns 0 at the start", () => {
    expect(computeCountUp(0, 1100, 1000)).toBe(0);
  });
  it("returns the target at the end", () => {
    expect(computeCountUp(1100, 1100, 1000)).toBe(1000);
  });
  it("never exceeds the target mid-animation", () => {
    const mid = computeCountUp(550, 1100, 1000);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThanOrEqual(1000);
  });
  it("snaps to target when duration is 0", () => {
    expect(computeCountUp(0, 0, 1000)).toBe(1000);
  });
  it("clamps over-elapsed time to the target", () => {
    expect(computeCountUp(9999, 1100, 1000)).toBe(1000);
  });
});

describe("resolveRevealClassName", () => {
  it("uses the fade-rise base class when not visible", () => {
    expect(resolveRevealClassName({ visible: false })).toBe("tc-reveal");
  });
  it("adds the `in` modifier when visible", () => {
    expect(resolveRevealClassName({ visible: true })).toBe("tc-reveal in");
  });
  it("uses the blur variant when blur is requested", () => {
    expect(resolveRevealClassName({ visible: false, blur: true })).toBe(
      "tc-reveal-blur"
    );
    expect(resolveRevealClassName({ visible: true, blur: true })).toBe(
      "tc-reveal-blur in"
    );
  });
  it("appends extra className", () => {
    expect(resolveRevealClassName({ visible: false, className: "mt-8" })).toBe(
      "tc-reveal mt-8"
    );
  });
});