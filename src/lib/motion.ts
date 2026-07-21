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
} as const;

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
  stagger: {
    animate: { transition: { staggerChildren: 0.04, delayChildren: 0 } },
  },
  pressTap: {
    whileTap: { scale: 0.97, transition: { duration: duration.instant / 1000 } },
  },
};

export function reducedMotionVariants(fallback: any) {
  if (typeof window === "undefined") return fallback;
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (mq.matches) {
    return {
      initial: { opacity: 1, y: 0, scale: 1 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 1, y: 0, scale: 1 },
    };
  }
  return fallback;
}
