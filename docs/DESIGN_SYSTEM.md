# TradCopilot — Design System & Motion Language

> Phase 2–3 of the UI transformation. Defines ONE unified visual language to replace
> the current fractured state (two palettes, two card systems, two AI surfaces).
> Built on the existing premium token system in `globals.css` — extending, not replacing.

---

## 0. Design Principles

Every decision is governed by seven feelings we want the product to evoke:

| Feeling | How it manifests |
|---|---|
| **PREMIUM** | Restrained effects, never decorative for decoration's sake. Depth via layering, not blur. |
| **INTELLIGENT** | Motion communicates state and structure. Information is progressively disclosed. |
| **FAST** | Transitions are 80–400ms. No animation blocks interaction. Skeleton > spinner. |
| **TECHNICAL** | Mono numerics, tight tracking, terminal display font for headings, data-dense layouts. |
| **CALM** | Deep space-black base, low-opacity ambient glows, generous whitespace around data. |
| **FUTURISTIC** | Cyan interaction accent, gradient edge-lighting, directional price illumination. |
| **TRUSTWORTHY** | Honest telemetry labels (never "LIVE" when polled), source provenance, semantic market colors. |

**Anti-patterns we actively avoid:** generic SaaS gradients, excessive glassmorphism, random neon, giant rounded cards, floating decoration, animation loops, template-looking dashboards.

---

## 1. Color System

### 1.1 Resolved palette decision

The app currently runs **two competing accent identities**. We resolve to ONE:

- **Cyan (`#06b6d4`)** is THE interaction accent — buttons, focus rings, active states, links.
- **Emerald (`#10b981`)** is retained ONLY for semantic bullish/profit market data — never as an interaction accent.
- **Rose (`#f43f5e`)** is retained ONLY for semantic bearish/loss/risk market data.
- **Amber (`#f59e0b`)** is retained ONLY for warnings and "polled fallback" states.

This means: **no more emerald/zinc islands on the landing page, no emerald hover on ElasticCard, no zinc body copy.** Everything routes through the CSS tokens.

### 1.2 Token mapping (existing — do not break)

All colors are defined in `globals.css` `:root` and `@theme`. The canonical tokens:

```
--color-bg-primary      → #030712  (deepest — sidebar/topbar chrome)
--color-bg-secondary    → #0b0f19  (card base)
--color-bg-tertiary     → #111827  (raised surface)
--color-bg-deepest      → #030712
--color-bg-hover        → rgba(255,255,255,0.05)
--color-bg-active        → rgba(6,182,212,0.10)

--color-text-primary    → #e7e9ee
--color-text-secondary  → #b9bdc9
--color-text-tertiary   → #8b909f
--color-text-quaternary → #5f6573

--color-border-default  → rgba(255,255,255,0.08)
--color-border-subtle   → rgba(255,255,255,0.05)
--color-border-strong   → rgba(255,255,255,0.12)
--color-border-active   → rgba(6,182,212,0.5)

--color-accent-primary  → #06b6d4  (THE interaction accent)
--color-accent-primary-hover → #0891b2
--color-accent-primary-muted  → rgba(6,182,212,0.12)
--color-accent-primary-subtle → rgba(6,182,212,0.06)

--color-profit          → #10b981  (semantic bullish ONLY)
--color-loss            → #f43f5e  (semantic bearish ONLY)
--color-warning         → #f59e0b  (semantic warning / polled fallback)
--color-info            → #06b6d4  (aligned to accent)
```

### 1.3 Hardcoded-color retirement plan

~400 hardcoded Tailwind color utilities (`text-emerald-400`, `bg-zinc-900`, `#22d3ee`, etc.) across the app must be replaced with the token equivalents. This is the single largest coherence lever.

**Replacement rules:**
- `text-emerald-400` / `text-green-400` / `text-profit` contexts → `text-[var(--color-profit)]`
- `text-rose-400` / `text-rose-500` / `text-loss` contexts → `text-[var(--color-loss)]`
- `text-cyan-400` / `#22d3ee` / `text-accent` contexts → `text-[var(--color-accent-primary)]`
- `bg-zinc-900` / `bg-zinc-950` / `bg-neutral-900` → `bg-[var(--color-bg-secondary)]` or `bg-[var(--color-bg-tertiary)]`
- `border-zinc-800` / `border-neutral-800` → `border-[var(--color-border-default)]`
- `text-zinc-400` / `text-zinc-300` → `text-[var(--color-text-secondary)]` / `text-[var(--color-text-tertiary)]`
- `#0A0A0B` / `#121214` → `var(--color-bg-primary)` or `var(--color-bg-deepest)`

---

## 2. Typography

### 2.1 Fonts (existing — do not change)

- **Inter** (`--font-sans`) — body, UI, forms. Self-hosted via next/font.
- **Space Grotesk** (`--font-display`) — display headings, terminal personality. Self-hosted.
- **JetBrains Mono** (`--font-mono`) — all numerics, prices, metrics. Tabular nums.

### 2.2 Display scale (existing `.tp-*` utilities)

```
.tp-display-lg   → clamp(2rem, 1.4rem + 2.4vw, 3.25rem)  — hero/landing
.tp-display      → weight 600, tracking -0.03, line 1.04  — page titles
.tp-display-sm   → clamp(1.25rem, 1.05rem + 0.8vw, 1.6rem) — section titles
.tp-eyebrow      → 11px, weight 600, tracking 0.14em, uppercase, accent — labels
.tp-mono         → JetBrains Mono, tabular-nums — numerics
```

### 2.3 Typography rules

- **Landing headings** must use `.tp-display` / `.tp-display-lg` (Space Grotesk) to carry the terminal personality. Currently they use raw `font-extrabold tracking-[-0.03em]` — close but not the display font.
- **Section eyebrows** must use `.tp-eyebrow` (already used in places).
- **All prices/metrics** must use `.tp-mono` (tabular-nums). No more `font-mono` without tabular-nums.
- **Body copy** uses `var(--color-text-secondary)` / `var(--color-text-tertiary)`, never raw zinc.

---

## 3. Spacing & Radius

### 3.1 Spacing scale

```
--spacing-sidebar: 220px
--spacing-sidebar-collapsed: 64px
--spacing-topbar: 48px
```

Component spacing follows 4px increments. Card padding: `p-5` (20px) standard, `p-4` (16px) compact, `p-6` (24px) generous. Gap between cards: `gap-4` to `gap-6`.

### 3.2 Radius system (existing)

```
--radius-sm: 4px    --radius-md: 6px   --radius-lg: 8px
--radius-xl: 12px   --radius-2xl: 16px  --radius-full: 9999px
```

**Rule:** `.card` uses `--radius-xl` (12px). Buttons use `--radius-md` (6px). No more `rounded-2xl` (16px) on cards — that's the ElasticCard anti-pattern. No more `rounded-[20px]` on the auth card.

---

## 4. Surface & Card Hierarchy

### 4.1 THE card standard: `.card`

The existing `.card` class is best-in-class (gradient edge-lighting via `::before`, translucent surface, hover depth). It becomes THE single card standard.

```css
.card           → base card (translucent, edge-lit, shadow)
.card-interactive  → hover lift + cursor pointer + active press
.surface        → flat panel
.surface-raised → flat + shadow
.surface-floating → raised + stronger border/shadow
.glass          → translucent + backdrop-blur (overlays only)
```

### 4.2 Card retirement plan

- **`ElasticCard`** → **delete or rewrite** onto `.card` + tokens. Currently uses `border-neutral-800/80 bg-neutral-neutral-900/60 backdrop-blur-xl` + emerald hover. Used only on landing. Replace all usages with `.card`.
- **Auth login card** (inline `rgba(17,17,19,0.7)` glass) → rewrite on `.card` + tokens.
- **Inline-styled cards** across supporting pages → `.card`.

### 4.3 Shadows (existing)

```
--shadow-xs / --shadow-sm / --shadow-md / --shadow-lg / --shadow-xl
--shadow-card         → default card shadow
--shadow-card-hover   → hover elevation
--shadow-glow         → cyan accent glow (active/focus states)
```

---

## 5. Glow & Gradient Rules

- **Gradient edge-lighting** (`.card::before`) — always-on at low intensity, strengthens on hover. This is the signature premium detail.
- **Accent glow** (`--shadow-glow`) — reserved for active/focus states, not decoration.
- **Ambient body glow** (existing radial gradients on `body`) — kept. Low-opacity cyan + emerald hints.
- **No random neon.** Glows are always token-derived (cyan accent or semantic market colors).

---

## 6. Motion System

### 6.1 Motion tokens (existing — extend)

```ts
// lib/motion.ts
duration: instant(80) micro(120) fast(180) normal(250) slow(350) layout(400) page(500)
easing: outExpo, spring, outQuad, inOutQuad, smooth
spring: gentle, snappy, responsive
variants: fadeIn, fadeInUp, fadeInDown, scaleIn, slideUp, stagger, pressTap
```

### 6.2 Reusable motion primitives (NEW — to build)

These become the shared animation language. Each is a framer-motion variant set or component:

| Primitive | Purpose | Where |
|---|---|---|
| `PageTransition` | Page enter/exit | Layout-level |
| `Reveal` | Scroll-triggered reveal | Section entrances |
| `StaggerContainer` + `StaggerItem` | List/card grids | Feature cards, KPIs |
| `AnimatedNumber` | Count-up numerics | KPIs (currently dead code — wire it up) |
| `PriceTick` | Directional price illumination | LivePriceCard, watchlist, ticker |
| `PulseIndicator` | Live/breathing indicator | Connection dots |
| `ThinkingDots` | AI processing | AI surfaces (promote from CSS) |
| `ResultReveal` | Constructed result entrance | AI insight cards |
| `Shimmer` | Skeleton loading | Loading states (promote `.skeleton`) |
| `TabIndicator` | Animated active tab | Mobile nav (exists — extract) |
| `PanelSlide` | Side panel enter/exit | Notification panel, history sidebar |

### 6.3 Motion rules

1. **Every animation must communicate information.** If it answers only "look, motion," remove it.
2. **Hierarchy of motion strength:** Primary interactions (buttons, sends) = strongest. Secondary (cards, reveals) = subtle. Background (ambient) = extremely subtle.
3. **Respect prefers-reduced-motion.** The existing kill-switch in `globals.css:621-675` is excellent — extend it to new animations.
4. **No infinite loops that consume CPU.** The `pulse-glow` is acceptable (2s, low cost). The login 3D tilt and floating logo are NOT — remove.
5. **Stagger for lists.** Card grids and KPI rows use `staggerChildren: 0.04`.
6. **Spring for spatial.** Tabs, panels, modals use spring physics. Expo for fades.

### 6.4 State-responsive "alive" motion (NEW)

| State | Motion |
|---|---|
| **Live price up** | Subtle green border/glow flash, ~650ms fade (exists in LivePriceCard — extend) |
| **Live price down** | Subtle red border/glow flash, ~650ms fade |
| **WS connected** | Gentle breathing pulse on live dot |
| **WS reconnecting** | Amber pulse + honest label |
| **AI idle ("Watching")** | Extremely subtle ambient glow on copilot panel |
| **AI processing** | Thinking dots + skeleton cards + phase stepper (exists) |
| **AI result arrives** | Staggered insight cards + word-by-word stream (exists) |

---

## 7. AI Intelligence Surfacing

### 7.1 The flattening problem

The backend emits structured output with `## Market Structure / Momentum / Key Levels / Trade Thesis / Invalidation / Risk Assessment / Bottom Line` sections. Both the charts copilot and the AI assistant currently render this as a `whitespace-pre-line` text blob. This is the single biggest intelligence-leverage opportunity.

### 7.2 Structured narrative rendering (NEW)

Parse the `##`-sectioned output into styled, collapsible sections with:
- Per-section icons (TrendingUp, Activity, Target, AlertTriangle, etc.)
- Progressive disclosure (key sections open, detail sections collapsible)
- Confidence rendered as a calibrated gauge/dial, not just "HIGH" text
- Bias rendered as a color-coded indicator pill

### 7.3 Unify the two AI surfaces

The charts copilot (structured, streaming, instrumented) and the standalone AI assistant (flat blob) must feel like the same product. Options:
- **Preferred:** Elevate the AI assistant page to copilot parity (streaming, structured cards, motion).
- The embedded copilot remains the primary surface; the standalone page becomes a full-session view.

---

## 8. Component Standards

### 8.1 Buttons (existing `.btn-*` — extend adoption)

```
.btn-primary    → gradient cyan, dark text, glow shadow
.btn-secondary  → bordered, transparent bg
.btn-ghost      → text-only, subtle hover
.icon-button    → 32px square, icon-only
```

**Rule:** No more inline-styled buttons. All buttons use `.btn-*` variants. The auth "primary-btn" / "social-btn" / "demo-btn" classes → migrate to `.btn-primary` / `.btn-secondary`.

### 8.2 Forms

`FormInput` is good but underused. **All** inputs migrate to `FormInput` or a token-styled input using:
- `bg-[var(--color-bg-tertiary)]`
- `border-[var(--color-border-default)]` → `border-[var(--color-border-active)]` on focus
- Focus ring via `--shadow-glow`
- `text-[var(--color-text-primary)]`, `placeholder-[var(--color-text-quaternary)]`

### 8.3 Badges (existing `.badge-*`)

```
.badge-success / .badge-danger / .badge-info / .badge-neutral
```

**Rule:** No more hardcoded `bg-emerald-500/10 text-emerald-400` pills. Use `.badge-success` etc.

---

## 9. Responsive Strategy

- **Desktop (>1024px):** Full 3-column charts layout (watchlist + chart + copilot), sidebar visible.
- **Tablet (768–1024px):** Collapsed or hidden sidebar, charts stack.
- **Mobile (<768px):** Single column, bottom nav, tab switcher for chart/watchlist/copilot.
- **Do not simply shrink desktop.** Create deliberate responsive compositions.
- **44px touch targets** on coarse pointers (existing — keep).
- **Safe-area insets** for notch devices (existing — keep).

---

## 10. Accessibility & Performance

- **prefers-reduced-motion** kill-switch is comprehensive — extend to all new animations.
- **Keyboard navigation:** command palette and notification panel need arrow-key support (currently click-only).
- **Focus rings:** `:focus-visible` with `--color-accent-primary` (existing — keep).
- **No expensive continuous animations.** Skeleton shimmer and pulse-glow are acceptable; 3D tilt and per-frame canvas effects on data-dense pages are not.
- **Chart performance:** TradingView widget is isolated — never wrap it in animation.

---

## 11. Implementation Priority

| Phase | Work | Impact |
|---|---|---|
| 1 | Unify palette — replace ~400 hardcoded colors with tokens | Coherence |
| 2 | Unify cards — retire ElasticCard, standardize on `.card` | Coherence |
| 3 | Build motion primitives in `motion.ts` + shared components | Motion |
| 4 | Surface AI intelligence — structured narrative + gauges | Intelligence |
| 5 | Unify AI surfaces — elevate AI assistant to copilot parity | Intelligence |
| 6 | Clean up supporting pages (Settings/Backtester/Admin/News/Journal) | Coherence |
| 7 | Add state-responsive "alive" motion | Polish |
| 8 | Remove distracting motion (3D tilt, floating logo) | Polish |
| 9 | Responsive + accessibility pass | Quality |
| 10 | Verification suite (lint, typecheck, test, build) | Safety |
