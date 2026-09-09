# TradCopilot Marketing Site — UI/UX Redesign Plan

Phase 0 inspection output. UI/UX-only; preserves 100% of functionality and backend behavior.

## A. Token sheet (single source of truth → `src/app/globals.css` + `src/app/layout.tsx`)

The repo already has a mature CSS-variable token system. The spec's tokens are **in-family refinements** of the existing ones, so this is a **value remap** (the established house pattern — see memory: prior amber/violet→cyan remap), not a new parallel system. All existing token *names* stay intact so nothing breaks; only *values* change + new named aliases added.

| Role | Token | Old → New |
|---|---|---|
| Primary surface | `--background` / `--bg-primary` | `#030712` → `#05070B` |
| Band surface (alt sections) | `--background-secondary` / `--bg-band` (new) | `#0b0f19` → `#0A0F18` |
| Card surface | `--surface` | `#111827` → `#0E1420` (+1px top-edge highlight `rgba(255,255,255,.06)`, shadow `0 1px 2px rgba(0,0,0,.35), 0 8px 24px rgba(0,0,0,.35)`) |
| Ink | `--foreground` / `--ink` (new) | `#e7e9ee` → `#E8ECF2` |
| Muted | `--muted-foreground` / `--muted` (new) | `#8b909f` → `#8A93A3` |
| Accent (ONE) | `--accent` / `--color-accent-primary` | `#06b6d4` → `#2FC6E8` |
| Green (effort/positive) | `--color-profit` / `--green` (new) | `#10b981` → `#2DD4A8` |
| Red (risk/negative) | `--color-loss` / `--red` (new) | `#f43f5e` → `#FF6B6B` |
| Amber (warning) | `--color-warning` / `--amber` (new) | `#f59e0b` → `#F5B942` |

**Type scale** (Space Grotesk display / Inter body / JetBrains Mono data + eyebrows):
- Display: `clamp(44px,6vw,76px)`, weight 700, tracking −0.02em, line-height 1.02 — new `.tp-display-xl`
- H2: 36–40px / 600; H3: 22px / 600; body: Inter 16–17px / 1.6
- Eyebrows/badges: JetBrains Mono 11–12px uppercase, 0.08em tracking
- Data values: JetBrains Mono, tabular-nums
- **JetBrains Mono is referenced but NOT loaded today** → add via `next/font/google` in `layout.tsx` (variable `--font-jetbrains`), wire into `--font-mono`.

**Accent discipline:** accent appears in ≤6 element types site-wide (primary CTA fill, current/active states, links, one headline phrase, focus ring, live-status dot). Green = effort/positive only; red = risk/negative only; amber = warnings only.

**New primitives (CSS classes):** `.tc-section` (band alternation + max-width + reveal hook attr), `.tc-band-alt`, `.tc-card` (+ `.tc-card__divider` hairline), `.tc-badge`, `.tc-status-chip` (dot + mono label — signature motif), `.tc-arrow-link`, `.tp-h2`, `.tp-h3`. Reveal classes: `.tc-reveal` (opacity0 + translateY14px), `.tc-reveal.in` , `.tc-reveal-blur` (blur→sharp for H2), stagger via `--tc-reveal-delay`.

## B. Component map (reusable inventory)

Reusable (keep/extend): `AnimatedSection` (scroll-animator), `ElasticCard`, `InfiniteMarquee` (rewire to live prices + token-matched fade masks), `StickyHeader`, `MobileMenu`, `HeroCTA`/`navbar-ctas` (use `useDemoLogin` — preserve), `FaqAccordion`, `SvgTracedLine`, `AntigravityCanvas`, `SmoothScrollProvider` (global lenis — untouched), `LiquidCursor`.

**Dead code (present, zero importers):** `src/lib/motion.ts`, `src/components/ui/animated-number.tsx`. → Replace with fresh, tested `useReveal` + `useCountUp` hooks.

**Rebuild (fabricated data → real):** `product-preview.tsx` hero mockup uses hard-coded `candlesticks` + `fullAiResponse` + random-walk price. → New `HeroWorkbench` client component rendering **real** candles from `/api/v1/market/ohlcv`, real indicators from `/api/v1/market/indicators`, live price from `/api/v1/market/price` (poll), and a chat input that routes to `/signup` (AI route requires auth — no fabricated AI output).

## C. Section map (homepage act order)

1. Slim nav (60px): icon+wordmark, 3 text links, 1 filled accent pill CTA.
2. Hero: eyebrow chip → display headline (one accent phrase) → 2-line subhead → primary pill + text-link secondary → trust microcopy; right = live `HeroWorkbench` (real candles canvas + indicator row + mono readout + working chat input). Stacks below headline on mobile.
3. Metrics band: 4-up count-up (0→value, 1.1s eased) on scroll. Source: real product stats where available; else clearly-labeled illustrative w/ one-line disclosure.
4. How-it-works: 3 cards, mono badges 01–03, green effort punch-line.
5. Behavioral showcase: animated trade-replay, near-revenge trade flagged, status chip red→green.
6. Expectancy calculator: win-rate / R:R / trades sliders → live weekly outcome.
7. Founder band: one sentence + initial-avatar tiles + badge chips (no fabricated photos — no `next/image` config).
8. Pricing: 2 cards w/ new Card anatomy; calculator directly above.
9. FAQ: skeptic first-person voice, large type, expanders.
10. Final CTA + footer: corrected copyright year (dynamic), tightened disclaimer.
11. Ticker: rewired to genuinely live prices (WS via `useBinanceMultiStream`), token-matched edge fades, seamless.
12. Dead vertical space (>120px gaps) removed.

## D. Motion system
- `useReveal` (IntersectionObserver, once): fade + 14px rise; cards stagger 60–80ms via `--tc-reveal-delay`; H2 blur→sharp.
- `useCountUp`: 0→value, 1.1s `cubic-bezier(.2,.7,.2,1)`, runs once on in-view.
- Large motions 1.1s `cubic-bezier(.2,.7,.2,1)`; micro hovers 180ms `cubic-bezier(.16,1,.3,1)`.
- `prefers-reduced-motion: reduce` → opacity-only fallback (no translate/blur). Global CSS kill-switch already present; add `.tc-reveal`/`.tc-reveal-blur`/count-up guards.
- No new heavy libs (framer-motion already in tree; CSS+observer preferred per spec).

## E. Responsive
1440 / 1024 / 768 / 390. Hero workbench stacks below headline < lg; grids 4→2→1 and 3→2→1; sticky mobile CTA bar after first scroll; nav wordmark hidden < sm; no horizontal overflow; marquee not clipped at 390px.

## F. Data & safety
- Public (no auth, IP rate-limited): `/api/v1/market/ohlcv`, `/price`, `/indicators`, `/pulse`. Auth required: `/api/v1/ai/chat` → hero chat routes to signup.
- `source === 'SIMULATED'` → render disclosure chip (no-fabricated-data rule).
- CSP load-bearing (TradingView + Binance WS) — untouched. No `next/image` added. `page.tsx` stays a server component; `next/dynamic`+`Suspense` preserved for heavy widgets.

## G. Verification
typecheck → lint → tests (add `useReveal`/`useCountUp` tests) → `next build` → manual at 1440/1024/390 (type scale, accent count ≤6, band alternation, dead space, skeleton geometry, live hero data, calculator, chat, reduced-motion). Then STOP — no push, no deploy.