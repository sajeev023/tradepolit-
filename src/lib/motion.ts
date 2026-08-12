/* ═══════════════════════════════════════════════════════════
   TradCopilot — Motion System
   Single source of truth for animation primitives.

   Philosophy:
   - Every animation communicates information. If it only says "look, motion," cut it.
   - Hierarchy: primary interactions = strongest motion, secondary = subtle,
     background = extremely subtle.
   - Respect prefers-reduced-motion (see reducedMotionVariants + the global
     kill-switch in globals.css).
   - Prefer CSS transitions for lightweight interactions; framer-motion for
     spatial/entrance; reserve GSAP for genuine timeline/scroll complexity.
   ═══════════════════════════════════════════════════════════ */

export const duration = {
  instant: 80,
  micro: 120,
  fast: 180,
  normal: 250,
  slow: 350,
  layout: 400,
  page: 500,
} as const;

export const easing = {
  outExpo: [0.16, 1, 0.3, 1] as [number, number, number, number],
  spring: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
  outQuad: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
  inOutQuad: [0.45, 0, 0.55, 1] as [number, number, number, number],
  smooth: [0.4, 0, 0.2, 1] as [number, number, number, number],
} as const;

export const spring = {
  gentle: { type: "spring" as const, damping: 28, stiffness: 250, mass: 1 },
  snappy: { type: "spring" as const, damping: 20, stiffness: 350, mass: 0.8 },
  responsive: { type: "spring" as const, damping: 15, stiffness: 400, mass: 0.5 },
  wobbly: { type: "spring" as const, damping: 12, stiffness: 180, mass: 0.8 },
} as const;

/* ─── Core entrance variants ─── */
export const variants = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: duration.normal / 1000, ease: easing.outExpo } },
    exit: { opacity: 0, transition: { duration: duration.fast / 1000, ease: easing.outQuad } },
  },
  fadeInUp: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0, transition: { duration: duration.normal / 1000, ease: easing.outExpo } },
    exit: { opacity: 0, y: -4, transition: { duration: duration.fast / 1000, ease: easing.outQuad } },
  },
  fadeInDown: {
    initial: { opacity: 0, y: -8 },
    animate: { opacity: 1, y: 0, transition: { duration: duration.normal / 1000, ease: easing.outExpo } },
    exit: { opacity: 0, y: 4, transition: { duration: duration.fast / 1000, ease: easing.outQuad } },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.97 },
    animate: { opacity: 1, scale: 1, transition: { duration: duration.fast / 1000, ease: easing.outExpo } },
    exit: { opacity: 0, scale: 0.96, transition: { duration: duration.micro / 1000, ease: easing.outQuad } },
  },
  slideUp: {
    initial: { y: "100%", opacity: 0 },
    animate: { y: 0, opacity: 1, transition: spring.snappy },
    exit: { y: "100%", opacity: 0, transition: { duration: duration.fast / 1000, ease: easing.outQuad } },
  },
  slideInRight: {
    initial: { x: "100%", opacity: 0 },
    animate: { x: 0, opacity: 1, transition: spring.snappy },
    exit: { x: "100%", opacity: 0, transition: { duration: duration.fast / 1000, ease: easing.outQuad } },
  },
  slideInLeft: {
    initial: { x: "-100%", opacity: 0 },
    animate: { x: 0, opacity: 1, transition: spring.snappy },
    exit: { x: "-100%", opacity: 0, transition: { duration: duration.fast / 1000, ease: easing.outQuad } },
  },
  stagger: {
    animate: { transition: { staggerChildren: 0.04, delayChildren: 0 } },
  },
  pressTap: {
    whileTap: { scale: 0.97, transition: { duration: duration.instant / 1000 } },
  },
};

/* ─── Reusable motion primitives ─── */

/** Page-level enter/exit. Wrap page content for a consistent crossfade. */
export const PageTransition = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: duration.normal / 1000, ease: easing.outExpo } },
  exit: { opacity: 0, y: -4, transition: { duration: duration.fast / 1000, ease: easing.outQuad } },
};

/** Scroll-triggered reveal. Use with whileInView. */
export const Reveal = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { duration: duration.slow / 1000, ease: easing.outExpo },
};

/** Stagger container for lists / card grids. */
export const StaggerContainer = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.02 } },
};

/** Stagger child — pair with StaggerContainer. */
export const StaggerItem = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: duration.normal / 1000, ease: easing.outExpo } },
};

/** Side panel / drawer enter-exit. */
export const PanelSlide = {
  initial: { x: "100%", opacity: 0 },
  animate: { x: 0, opacity: 1, transition: spring.snappy },
  exit: { x: "100%", opacity: 0, transition: { duration: duration.fast / 1000, ease: easing.outQuad } },
};

/** Modal / dialog enter-exit. */
export const ModalTransition = {
  initial: { opacity: 0, scale: 0.96, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: duration.normal / 1000, ease: easing.outExpo } },
  exit: { opacity: 0, scale: 0.97, y: 4, transition: { duration: duration.micro / 1000, ease: easing.outQuad } },
};

/** Result "constructed" reveal — AI insight cards. */
export const ResultReveal = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: duration.normal / 1000, ease: easing.outExpo } },
};

/** Tab indicator slide. */
export const TabIndicator = {
  layoutId: "tab-indicator",
  transition: { type: "spring", damping: 30, stiffness: 350, mass: 0.8 },
};

/** Price tick — directional illumination. */
export const PriceTick = {
  up: {
    initial: { color: "var(--color-profit)", opacity: 0.6 },
    animate: { color: "var(--color-profit)", opacity: 1 },
    transition: { duration: 0.25, ease: easing.outQuad },
  },
  down: {
    initial: { color: "var(--color-loss)", opacity: 0.6 },
    animate: { color: "var(--color-loss)", opacity: 1 },
    transition: { duration: 0.25, ease: easing.outQuad },
  },
};

/** Live indicator — gentle breathing. */
export const LiveIndicator = {
  animate: { scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] },
  transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
};

/** AI thinking pulse — ambient cognition. */
export const ThinkingPulse = {
  animate: { opacity: [0.4, 1, 0.4], scale: [0.9, 1, 0.9] },
  transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
};

/** Shimmer — skeleton loading (mirrors .skeleton in globals.css). */
export const Shimmer = {
  animate: { backgroundPosition: ["200% 0", "-200% 0"] },
  transition: { duration: 1.8, repeat: Infinity, ease: "linear" },
};

/* ─── Reduced-motion guard ─── */
export function reducedMotionVariants(fallback: any) {
  if (typeof window === "undefined") return fallback;
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (mq.matches) {
    return {
      initial: { opacity: 1, y: 0, scale: 1, x: 0 },
      animate: { opacity: 1, y: 0, scale: 1, x: 0 },
      exit: { opacity: 1, y: 0, scale: 1, x: 0 },
    };
  }
  return fallback;
}
