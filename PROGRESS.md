# TradCopilot — Production-Readiness Progress

Autonomous audit + remediation pass. Build state: **TypeScript 0 errors, ESLint 0 errors/warnings, 204/204 tests passing, `next build` succeeds.**

This note tracks what has been completed and what remains, grouped by the audit phases.

---

## ✅ Completed

### Phase 2 / 10 — Tooling baseline
- Cleared all 4 ESLint warnings (unused imports/vars in `ai-response-parser.ts`, `entitlements.ts`, `trade-validator.ts`, and `TradingViewChart.tsx` exhaustive-deps).
- Verified: `tsc --noEmit` clean, `eslint .` clean, `vitest run` 204/204, `next build` succeeds.

### Security (Phase 9)
- **CSRF middleware** (`src/middleware.ts`): exempted `/api/stripe/webhook` and `/api/cron/*` from the Origin check so Stripe billing webhooks and cron no longer get 403'd before the handler runs; replaced the bypassable `endsWith(host)` suffix check with an exact-origin comparison using `x-forwarded-proto`/host.
- **OAuth open redirect** (`src/app/auth/callback/route.ts`): added `safeRedirectPath()` to reject protocol-relative (`//`), backslash, scheme, and `@`-bearing `redirectTo` values; redirect via `new URL(redirectTo, origin)`.
- **Timing-safe secret compare** (`src/lib/secure-compare.ts`, new): constant-time `secureBearerMatch()` using `crypto.timingSafeEqual`; applied to `/api/cron/evaluate-alerts` and `/api/v1/admin/prewarm` (replaces `!==` string compare).
- **Profile PATCH validation** (`src/app/api/v1/profile/route.ts`): added Zod schema with length caps; fixed nonexistent `profile.lastAnalysisReset` field (now reads `user.lastUsageReset`).

### Database / Data layer (Phase 3 / 4)
- **Removed the `as any` on the Prisma client** (`src/lib/prisma.ts`): `prisma` is now typed `PrismaClient` everywhere, so the compiler validates every query against the real schema. This immediately surfaced and let us fix two hidden bugs (below). Also: bounded `pg.Pool` (`max: 5`, idle/connection timeouts) and cache the client globally in production too; **hard-fail in production if `DATABASE_URL` is missing/placeholder** instead of silently degrading to the in-memory mock.
- **Fixed production 500 on `record-alert`** (`src/lib/usage-limits.ts` deleted, `src/app/api/v1/ai/record-alert/route.ts` rewritten): the old module selected a nonexistent `subscriptionStatus` column from `User` (hidden by the `as any`), so `/api/v1/ai/record-alert` always threw a `PrismaClientValidationError` in production. Migrated the route to the atomic `limit-checker` path (`checkUsageLimit` + `recordUsage`) — this also fixes the non-atomic read-then-write race on `alertsCountToday`.
- **Free-tier pagination leak** (`src/app/api/v1/trades/route.ts`): `page=2` previously returned rows 21–40 while reporting `total=20`. Non-Pro `skip` is now clamped to 0 so free users only ever see the first 20.
- **`profitFactor` correctness** (`src/lib/performance-service.ts`, `src/lib/backtest-service.ts`): when `grossLoss === 0` the value was the raw dollar `grossProfit` (e.g. 1250) instead of a ratio. Now returns `Infinity` when there are wins but no losses, `0` otherwise; the Backtest Decimal column persists `null` for the Infinity case.
- **`releaseReservation` negative-count guard** (`src/app/api/v1/ai/analyze-chart/route.ts`): decrements via a conditional `updateMany` (`analysesCountToday: { gt: 0 }`) so a release can never drive the counter negative (which would let `recordUsage` succeed extra times — a small quota bypass).

### AI system (Phase 6)
- **Cross-user cache leak (CRITICAL)** (`src/app/api/v1/ai/analyze-chart/route.ts`): the pre-warm fallback cache query had no `userId` filter and returned *any* user's cached analysis (which embeds that user's name, trades, win rate, journal moods). Scoped to `userId: "system-prewarm"`.
- **Telemetry hallucination (HIGH)** (`src/lib/ai.ts`): the system prompt unconditionally asserted "LIVE MARKET TELEMETRY STATUS: CONNECTED" and forbade the model from admitting it lacked data, even when no telemetry values were injected. The CONNECTED block is now conditional on `activeChartContext.chartState`; when absent, an explicit "UNAVAILABLE / do not fabricate" block is injected instead.
- **Non-blocking price cross-check** (`src/app/api/v1/ai/analyze-chart/route.ts`): the post-response Binance cross-check (up to 2s latency, telemetry-only) was awaited before returning; now detached so the user gets the response immediately.
- **`weekly-report` rate limit** (`src/app/api/v1/ai/weekly-report/route.ts`): added per-user 5/min rate limit (the route uses the largest single token budget — 2000 — with no prior throttle).

### Global Markets (Phase 5) — *in progress*
- Created `src/lib/supported-symbols.ts`: the single source of truth for the tradable universe, covering Crypto, Forex, Commodities, Indices, and **US / Indian / Japanese / UAE / UK / European stocks** with per-symbol Twelve Data `exchange` routing, baseline prices, volatilities, and an ordered provider chain. Replaces the 6+ disjoint hardcoded symbol lists.

---

## 🟡 Still to do

### Global Markets (Phase 5) — wiring (registry created, not yet consumed)
- Refactor `src/lib/market.ts` to consume `supported-symbols.ts`: fix `normalizeSymbol` (currently blanket-replaces `-`→`/` and `USDT`→`/USD`, mangling tickers like `BRK-B` and any `USDT`-containing symbol), append `&exchange=` to Twelve Data URLs from the registry, and route stocks through Twelve Data.
- **Fail-fast on unsupported symbols**: `getLivePrice`/`getOHLCV` currently return **SIMULATED** data with HTTP 200 for any unknown symbol — the most dangerous defect for a trading app. Throw a typed `UnsupportedSymbolError` (→ 422 from routes) and reserve SIMULATED for supported-but-provider-down symbols.
- Add a Twelve Data **circuit breaker / token bucket** so a 429/401 doesn't cascade to silent SIMULATED data app-wide.
- Wire the registry into the UI selectors: `charts/ChartsClientPage.tsx`, `watchlist/page.tsx`, `search/route.ts`, `ai/market-overview/route.ts`, `market-pulse.ts` (replace their local hardcoded lists with imports from `supported-symbols.ts`).
- Align `src/lib/validate-market-data.ts` `KNOWN_BARE_INDICES` with the registry.
- Add `STOCK` to the Prisma `AssetClass` enum + a migration; update the client-side `AssetClass` type in `src/lib/types.ts` (currently only `CRYPTO | FOREX`, also missing `COMMODITY`/`INDEX`).
- Journal asset-class `<select>` (`journal/page.tsx`) only offers CRYPTO/FOREX — add COMMODITY/INDEX/STOCK options.

### Security (Phase 9)
- **Harden the mock/demo session** (`src/lib/auth.ts`, `src/lib/supabase/middleware.ts`, `components/landing/demo-button.tsx`): the "instant demo" path trusts unsigned client-set cookies (`sb-mock-session`/`sb-mock-email`) and authenticates every demo visitor as one shared user id. Replace with a server-issued signed (HMAC) short-lived cookie and a unique per-session `userId`; never trust a client-supplied email cookie.

### Database (Phase 3) — remaining
- `ensureDailyReset` (`limit-checker.ts`) is a non-atomic read-then-write; make the midnight reset a conditional `updateMany` so a concurrent reset can't zero a just-incremented counter.
- `performance/summary/route.ts` loads **all** trades (open + closed) into memory; query `status: "CLOSED"` separately and `count` open positions.
- Trade PATCH (`trades/[id]/route.ts`) is a non-atomic read-then-write; wrap fetch + recompute + update in `prisma.$transaction`.
- Backtest status machine has no double-execution guard; use `updateMany({ where: { id, status: "PENDING" } })` and abort if `count === 0`.
- Add missing indexes: `ConversationMemory(role, chatId)` and `(userId, role, chatId)`; `BehavioralEvent(userId, createdAt)`.
- Trade PnL computed with IEEE-754 floats while the risk engine uses `decimal.js` — compute via `Decimal` for consistency.
- `resolvePlan` treats `dbSubscriptionStatus === "ACTIVE"` as PRO — verify against Stripe webhook states.

### UI / UX (Phase 7) — high-value subset
- Notification bell `aria-label` mismatch breaks close-on-toggle (`notification-panel.tsx`); remove auto-close on `onMouseLeave`.
- `DemoConversionModal` missing dialog semantics / Escape / backdrop-click / focus trap (cross-cutting for all modals: journal, ai-assistant sidebar, BottomSheet, command-palette, mobile-menu).
- Clickable non-button elements (`<div>`/`<tr>`/`<span>` with `onClick`) across watchlist, alerts, journal, ai-assistant, command-palette lack `role="button"`/`tabIndex`/`onKeyDown`.
- Icon-only buttons systematically missing `aria-label`.
- Query failures collapse into misleading empty states across watchlist, alerts, journal, market-pulse, backtester, admin — branch on `isError` and render retry cards.
- `settings/page.tsx` calls `createClient()` every render (churns Supabase auth state) — memoize the client.
- Charts `localStorage` in `useState` initializer risks hydration mismatch — sync in `useEffect`.
- Alerts "Force Evaluate" mutates DOM directly (`innerHTML`/`disabled`) — use React state.
- Backtester "Show Demo Result" triggers a real fetch and disables Run — exclude `"demo"` from the query `enabled`.
- Risk-calculator copy has replacement chars and broken arrow glyphs; settings renders `**bold**` as literal asterisks.
- Pricing border `border-[var(--color-accent-primary)]/25` is a no-op (Tailwind opacity on a CSS var).

### Performance (Phase 8)
- Code-split `lenis`+`gsap` (root layout), `recharts` (4 dashboard pages), and `framer-motion` (mobile-only nav) — currently shipped to every route.
- Add `Cache-Control: s-maxage` to cacheable GET routes (`news`, `market/price`, `market/indicators`); add a tiny in-memory TTL cache in `MarketDataService.getLivePrice`.
- Use `next/image` for avatar + journal screenshots (only raw `<img>` today).
- Memoize the watchlist merged-prices object on the charts WebSocket hot path; extract a `React.memo` watchlist row.
- `next.config.ts`: add `experimental.optimizePackageImports: ['lucide-react']`.

### Testing (Phase 10)
- No API route has any test (all 204 existing tests are pure `src/lib/*` unit tests). Highest-value untested paths: Stripe webhook (revenue), cron `evaluate-alerts`, `getAuthenticatedUser` demo-session fallback, per-route quota enforcement, IP rate-limit 429 path.

---

## Build state
- `tsc --noEmit`: 0 errors
- `eslint .`: 0 errors, 0 warnings
- `vitest run`: 204/204 passing
- `next build`: succeeds