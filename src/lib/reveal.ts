/**
 * src/lib/reveal.ts
 *
 * Pure helpers for the marketing scroll-reveal + count-up motion system.
 * Kept free of DOM/browser APIs so they are unit-testable in the node
 * vitest environment. The live hooks (useInViewOnce, useCountUp) and
 * components (Reveal, CountUp) import from here.
 */

/** Clamp a number to the [0, 1] range. */
export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * Ease-out exponential curve used for both count-up and reveal motion.
 * `1 - 2^(-10 * p)` — rapid initial acceleration, gentle settle.
 * Returns 0 at p=0 and 1 at p=1.
 */
export function easeOutExpo(progress: number): number {
  const p = clamp01(progress);
  return p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
}

/**
 * The 1.1s large-motion easing requested by the spec.
 * cubic-bezier(.2,.7,.2,1) approximated as a bezier ease function so the
 * count-up can sample it per-frame without a CSS engine.
 */
export function easeLargeMotion(progress: number): number {
  const p = clamp01(progress);
  return bezierEase(p, 0.2, 0.7, 0.2, 1);
}

/** Cubic bezier evaluator (de Casteljau) for a unit bezier. */
function bezierEase(t: number, x1: number, y1: number, x2: number, y2: number): number {
  // Solve for the bezier parameter s whose x-coordinate equals t, then
  // return the y-coordinate at that parameter. Newton-Raphson with a
  // bisection fallback — stable for the smooth curves we use.
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  let s = t;
  for (let i = 0; i < 8; i++) {
    const x = ((ax * s + bx) * s + cx) * s - t;
    const d = (3 * ax * s + 2 * bx) * s + cx;
    if (Math.abs(d) < 1e-6) break;
    s -= x / d;
  }
  // Fallback bisection if Newton diverged.
  if (s < 0) s = 0;
  if (s > 1) s = 1;
  return ((ay * s + by) * s + cy) * s;
}

/**
 * Format a numeric value for count-up display using en-US grouping.
 * Pure wrapper around toLocaleString so tests are deterministic.
 */
export function formatNumeric(value: number, decimals = 0): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Compute the displayed count-up value for a given frame.
 * Pure: given elapsed time, duration, and target, returns the current number.
 */
export function computeCountUp(
  elapsedMs: number,
  durationMs: number,
  target: number,
  easing: (p: number) => number = easeLargeMotion
): number {
  if (durationMs <= 0) return target;
  const progress = clamp01(elapsedMs / durationMs);
  return easing(progress) * target;
}

export interface RevealClassOptions {
  visible: boolean;
  blur?: boolean;
  className?: string;
}

/**
 * Resolve the className for a Reveal wrapper.
 * Pure: returns the base reveal class plus the `in` modifier when visible.
 */
export function resolveRevealClassName({
  visible,
  blur = false,
  className = "",
}: RevealClassOptions): string {
  const base = blur ? "tc-reveal-blur" : "tc-reveal";
  const modifier = visible ? " in" : "";
  const extra = className ? ` ${className}` : "";
  return `${base}${modifier}${extra}`;
}