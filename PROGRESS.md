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

## ✅ Completed in this pass

### Global Markets (Phase 5) — DONE
- `src/lib/market.ts` rewritten to consume `supported-symbols.ts`; `normalizeSymbol` no longer mangles `BRK-B`/`USDT`-style tickers, maps crypto shorthand to canonical `BTC/USD` etc. Twelve Data URLs now append `&exchange=` via the registry; stocks route through Twelve Data.
- **Fail-fast on unsupported symbols**: `getLivePrice`/`getOHLCV` throw `UnsupportedSymbolError` (→ 422, `UNSUPPORTED_SYMBOL`) before touching the cache; SIMULATED is reserved for supported-but-provider-down symbols. `UnsupportedSymbolError` + `unsupportedSymbolError` + `dispatchCaughtError` wired in `typed-errors.ts`/`types.ts`.
- Twelve Data circuit breaker (`TD_CIRCUIT`): 3 failures → 30s open, with `tdRecordSuccess`/`tdRecordFailure`; prevents a 429/401 from cascading to silent SIMULATED app-wide.
- Registry wired into UI selectors: `charts/ChartsClientPage.tsx`, `watchlist/page.tsx`, `search/route.ts`, `ai/market-overview/route.ts`; `validate-market-data.ts` accepts `isSupportedSymbol`.
- `STOCK` added to the Prisma `AssetClass` enum + migration `20260728000000_add_stock_asset_class_and_indexes`; client `AssetClass` in `types.ts` now `CRYPTO | FOREX | COMMODITY | INDEX | STOCK`. Journal `<select>` offers COMMODITY/INDEX/STOCK.
- Tests: `src/lib/market.test.ts` (fail-fast + normalizeSymbol, 7 tests).

### Security (Phase 9) — DONE
- Demo session hardened: `src/lib/demo-session.ts` issues an HMAC-SHA256-signed, HttpOnly, 1h cookie with a pinned demo identity (`partner@tradcopilot.com` — a demo, not PRO, email). Signing key is a stable env secret (`DEMO_SESSION_SECRET || SUPABASE_SERVICE_ROLE_KEY || DATABASE_URL`) for cross-instance Vercel consistency. `auth.ts`/`supabase/middleware.ts` verify via `verifyDemoSession`/`verifyDemoSessionFromRequest`; `demo-button.tsx` clears legacy `sb-mock-*` cookies and POSTs to `/api/v1/demo/session`. Eliminates the client-supplied-email privilege-escalation.
- Tests: `src/lib/demo-session.test.ts` (round-trip, tamper, forged-sig, expired, wrong-identity, malformed — 6 tests).

### Database (Phase 3) — DONE
- `ensureDailyReset` (`limit-checker.ts`) is now an atomic conditional `updateMany` keyed on `lastUsageReset < startOfTodayUTC`; `count === 0` re-reads fresh counters. Concurrent day-rollover requests can no longer double-reset.
- `performance/summary/route.ts` queries `status:"CLOSED"` rows and `count`s `OPEN` in parallel instead of loading every trade into memory.
- Trade PATCH (`trades/[id]/route.ts`) wrapped in `prisma.$transaction`; ownership check, recompute, and update are now atomic. PnL/R-multiple computed with `decimal.js` (matches the risk engine). `STOCK` added to the PATCH + POST `assetClass` zod enums.
- Backtest double-execution guard: `runBacktestJob` claims via `updateMany({ where: { id, status: "PENDING" } })` and aborts on `count === 0`.
- Indexes added in migration: `conversation_memory(role, chatId)`, `conversation_memory(userId, role, chatId)`, `behavioral_events(userId, createdAt)`.
- `resolvePlan`/`getEntitlementForUser` accept an optional `dbSubscriptionExpiresAt`; a recorded expiry in the past downgrades a stale `ACTIVE` row to FREE (guards against a missed `subscription.deleted` webhook). Verified the Stripe webhook only writes `ACTIVE` for `active`/`trialing` statuses, so the existing behavior is preserved; threaded `subscriptionExpiresAt` through all `resolvePlan`/`getEntitlementForUser` call sites. Tests added in `__tests__/entitlements.test.ts`.
- Test stability: `backtest.test.ts` / `backtest-stress.test.ts` now mock `getOHLCV` with deterministic synthetic candles — eliminated network timeouts under parallel load.

## 🟡 Still to do

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