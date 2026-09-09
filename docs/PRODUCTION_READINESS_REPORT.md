# TradCopilot — Production Readiness Audit Report

> ⚠️ **SUPERSEDED — 2026-08-09.** This report's blockers (10 TS build errors,
> failing tests, Node-`crypto` Edge incompatibility) have since been resolved
> and re-verified. See `docs/RELEASE_REPORT_2026-08-09.md` for the current
> green-build state. The items below that remain valid (CVEs, middleware→proxy
> migration, observability gaps, L1 cache bound, per-process rate limiter) are
> carried forward as tech debt in the new report.

**Date:** 2026-08-05
**Auditor:** Principal QA & SRE (Claude)
**Scope:** Full-stack audit — build, type safety, tests, security, performance, caching, resilience, observability, CI/CD, Vercel deployment
**Environment:** Windows 10 / Node v24.14.1 / Next.js 16.2.9 / Prisma 7.8.0 / PostgreSQL (Supabase)

---

## Executive Summary

| Dimension | Score | Status |
|---|---|---|
| **Production Readiness** | **6.2 / 10** | ⚠️ NOT CLEARED — fix blockers below |
| **Reliability** | **7.5 / 10** | ✅ Good fallback architecture |
| **Performance** | **7.0 / 10** | ✅ Good caching layer, some gaps |
| **Security** | **7.5 / 10** | ✅ Strong headers/CSP/CSRF, known CVEs |
| **Observability** | **5.5 / 10** | ⚠️ No error tracker / APM |
| **Code Quality** | **6.5 / 10** | ⚠️ 10 TS errors block the build |

> **Verdict: DO NOT PUSH TO PRODUCTION yet.** There are **10 TypeScript compile errors that fail the build**, an **Edge-runtime incompatibility in middleware**, and **9 known high/moderate CVEs**. The underlying architecture (multi-provider fallback, typed errors, CSRF hardening, WebSocket resilience) is production-grade, but the build must be green and the security/stability gaps closed before a production deploy.

---

## 1. Benchmark Results — The Four Gates

These are the objective gates every production deploy must pass. Current state:

### Gate 1: TypeScript — ❌ FAILING (10 errors, exit 2)

The build **cannot complete** until these are fixed. All errors are real type bugs, not strictness noise:

| # | File | Line | Error | Category |
|---|---|---|---|---|
| 1 | `charts/ChartsClientPage.tsx` | 736 | `setAlertsCountToday` — did you mean `setAnalysesCountToday`? | **Bug** (wrong setter name) |
| 2 | `charts/ChartsClientPage.tsx` | 736 | `prev` implicitly `any` | Type safety |
| 3 | `api/v1/ai/analyze-chart/route.ts` | 511 | `userProfile` not in scope | **Bug** (undefined variable) |
| 4 | `api/v1/ai/analyze-chart/route.ts` | 512 | `userProfile` not in scope | **Bug** |
| 5 | `api/v1/ai/chat/route.ts` | 118 | `null` not assignable to analysis state | Type safety |
| 6 | `api/v1/ai/chat/route.ts` | 144 | same | Type safety |
| 7 | `api/v1/ai/chat/route.ts` | 311 | `sourceMetadata` not a known property | Type safety |
| 8 | `api/v1/ai/chat/route.ts` | 422 | missing required `rsiSentiment` field | Type safety |
| 9 | `ui/smooth-scroll-provider.tsx` | 74 | `.raf` missing on Lenis type | Type safety |
| 10 | `lib/encryption.ts` | 19, 40 | `Buffer.from(string \| undefined)` overload | Type safety |

**Impact:** Build aborts before the route manifest is emitted. No production bundle exists.

### Gate 2: ESLint — ✅ PASSING (0 errors, 11 warnings)

Clean. Warnings are all low-severity (unused vars, one `prefer-const`, one `exhaustive-deps`). No `--fix`-needed blockers.

### Gate 3: Tests — ⚠️ PARTIAL PASS (194 passed / 10 failed / 204 total)

| Result | Count |
|---|---|
| ✅ Passed | 194 |
| ❌ Failed | 10 |
| 📁 Files failed | 2 (`backtest.test.ts`, `backtest-stress.test.ts`) |

**Root cause of all 10 failures:** `PrismaClientKnownRequestError` on `prisma.strategy.create()` — the tests require a live PostgreSQL connection and the local DB (placeholder `localhost:5432`) is unreachable. **This is an environment limitation, not a code defect**, but it means the backtest engine has no passing automated coverage in this run. 16 of 18 test files pass cleanly.

### Gate 4: Production Build — ❌ FAILING

Aborts on the TypeScript errors above (Gate 1). Compiled successfully in 22.5s, then failed type-checking. No `.next` production artifacts are usable.

---

## 2. Performance & Caching

### 2.1 Caching Strategy — ✅ Strong (L1 + L2)

`lib/cache.ts` implements a proper two-tier cache:

- **L1 in-memory Map** — 0ms retrieval, zero DB connections. Protects the DB from thundering herds.
- **L2 `MarketCache` PostgreSQL table** — `upsert` with TTL, survives restarts.
- Background cleanup of expired L2 entries (non-blocking `.catch`).
- L1 is populated from L2 on cache miss.

**Benchmark baseline:** L1 hit = memory lookup (~microseconds). L2 hit = 1 indexed query on `cacheKey` (unique index present ✅).

### 2.2 L1 Memory Usage — ⚠️ Unbounded growth risk

`const localCache = new Map<...>()` has **no size limit, no LRU eviction, no TTL-based pruning pass**. In a long-lived process (Vercel Fluid Compute reuses instances), this grows monotonically until the entry expires. For a high-cardinality key space (e.g. per-symbol-per-timeframe), this is a slow memory leak.

**Recommendation:** Add an LRU cap (e.g. 1000 entries) or a periodic pruning interval. Benchmark current RSS under load before/after.

### 2.3 React Query Config — ✅ Good

```ts
staleTime: 30_000, retry: 2, refetchOnWindowFocus: false
```
Sensible defaults. `refetchOnWindowFocus: false` avoids refetch storms.

### 2.4 Rate Limiting — ⚠️ Per-process only (correctly flagged)

`lib/rate-limit.ts` is an in-memory LRU map per Node process. The file's own doc comment correctly states: *"For multi-instance or production deployments, replace with Redis / Upstash / Vercel KV."* Behind Vercel's load balancer (multiple fluid instances), this limiter **will not be consistent** — an N-instance deployment effectively multiplies the limit by N.

**Recommendation:** Back with Vercel KV / Upstash Redis before production if the limit is a business requirement (it is — usage quotas).

### 2.5 Client-Side API Rate Limiter — ✅ Good

`lib/rate-limiter.ts` queues 429s with exponential backoff (3 retries, 1s base). Prevents cascading failures on the client.

### 2.6 Cron: Alert Evaluation — ⚠️ O(users × symbols) write storm

`api/cron/evaluate-alerts/route.ts` is well-structured (constant-time CRON_SECRET ✅, per-alert error isolation ✅, atomic alert+notification transactions ✅), but the proactive market-intelligence loop does:

```
for symbol in standardAssets (5):
  for user in ALL_USERS:
    notification.create()   // on sharp move AND/OR volatility spike
```

On a volatility event affecting all 5 symbols with N users, this writes **up to 10×N notifications per cron tick** with no batching. At 1,000 users that's 10,000 row inserts per run. The spam-suppression `findFirst` per (symbol, type) helps, but the per-user loop is the concern.

**Recommendation:** Batch `createMany`, or fan out via a queue (Vercel Queues) for large user bases.

---

## 3. Database Performance

### 3.1 Connection Setup — ✅ Correct

`lib/prisma.ts` uses `PrismaPg` adapter with an explicit `pg.Pool`. The pool is reused via `globalThis` singleton (survives hot-reload / serverless reuse). Mock DB is **explicitly opt-in only** (`USE_DB_MOCK=true`) — no silent production misconfiguration landmine. ✅

### 3.2 Indexes — ✅ Good coverage

Verified against `schema.prisma`:
- `MarketCache`: `@@index([cacheKey])` (unique) + `@@index([expiresAt])` ✅
- `Alert`: `@@index([userId, isActive])` ✅ — supports the cron's `findMany({ where: { isActive: true } })` (filtered per-user in app code)
- `Notification`: `@@index([userId, isRead])`, `@@index([userId, createdAt])` ✅
- `Trade`: `@@index([userId, openedAt])`, `@@index([userId, status])`, `@@index([userId, instrument])` ✅
- `JournalEntry`, `Strategy`, `Backtest`, `Watchlist`, `AIChat`, `SavedAnalysis`, `ConversationMemory`: all indexed on `userId` ✅

### 3.3 Missing Index — ⚠️ Notification spam-suppression query

The cron's dedup query filters `Notification` by `type`, `body { contains: symbol }`, and `createdAt >= oneHourAgo`. The `body` filter is a `contains` (LIKE) scan — not covered by the existing indexes. At scale this becomes a table scan per symbol per run. Consider a generated column or a dedup hash column with an index.

---

## 4. API Latency & Resilience

### 4.1 Multi-Provider AI Fallback — ✅ Excellent

`lib/ai-providers.ts` is the strongest resilience component:
- Sequential chain: **Groq → NVIDIA → Gemini**
- Per-provider exponential backoff (3 retries, 1s base, jitter)
- Per-provider circuit breaker (3 consecutive failures → offline)
- 429 cooldown (60s), 401/403 → permanent offline
- Per-request timeouts (Groq 8s, NVIDIA 12s, Gemini 10s) with `AbortController`
- Redacted key logging on auth failures (env name + first6/last4, never full key)
- `getProviderHealth()` for observability

**Worst-case latency budget:** If all 3 providers fail with full retries ≈ 3 × (8s + backoff) ≈ **~40s+** before the client sees an error. The deterministic `ai-fallback.ts` (chart-state-aware synthetic response) fires as the 4th tier so the user never sees a blank. ✅

### 4.2 Typed Error Responses — ✅ Excellent

`lib/typed-errors.ts` provides structured errors with correct HTTP semantics:
- `dbError` → 503 + `Retry-After` (Prisma transient code detection: P1001/P1002/P1008/P2024/P2034)
- `upstreamError` → 502 + provider name
- `rateLimitedError` → 429 + `Retry-After`
- `authFailedError` → 401
- `marketDataStaleError` → 503 with `dataQuality: "cached"` for graceful degradation
- `dispatchCaughtError` — drop-in catch-block dispatcher

This is production-grade error taxonomy.

### 4.3 Client Analytics — ⚠️ Fire-and-forget, no reliability

`lib/analytics.ts` POSTs to `/api/v1/admin/metrics` with a 2s timeout, silently swallows all errors. Acceptable for analytics (non-critical), but the anonymous ID uses `Math.random().toString(36)` — not a UUID, collisions possible at scale. Low severity.

---

## 5. WebSocket Performance — ✅ Excellent

`hooks/useBinanceStream.ts` is a textbook resilient WebSocket implementation:
- **Singleton registry** — one socket per symbol shared across all components (no duplicate connections)
- **Subscriber pattern** — multiple components subscribe to one stream
- **Exponential backoff reconnect** (1s floor, 10s ceiling, max 20 attempts)
- **Stale-data watchdog** — detects silent Binance stalls (no frames for 30s while socket reports OPEN) and flips to REST fallback. This is a genuinely hard problem solved well.
- **Last-price replay** on subscribe — no UI flash on remount
- **10s drain window** after last unsubscribe — survives quick remounts
- **SSR guards** everywhere (`typeof window`, `typeof WebSocket`)
- **Malformed frame filtering** (drops non-finite / negative prices)

**Benchmark note:** The profiler records WS tick latency (`eventTime → receivedTime`) — good for measuring real end-to-end latency.

---

## 6. Client Performance

### 6.1 Heavy Animation Libraries — ⚠️ Bundle size concern

Dependencies include `framer-motion`, `gsap`, `lenis` (smooth scroll), `recharts`, plus custom WebGL/canvas components (`antigravity-canvas`, `liquid-cursor`, `svg-traced-line`, `elastic-card`). These are visually rich but heavy. No bundle analysis was run (build failed), but this is the #1 area to audit with `@next/bundle-analyzer` once the build is green.

### 6.2 Performance Profiler — ✅ Well-gated

`lib/performance-profiler.ts` correctly **disables its expensive subsystems in production** (rAF FPS loop, fetch interceptor, memory tracker) unless `?debug=perf` is present. No production overhead. ✅

---

## 7. Security

### 7.1 Security Headers — ✅ Strong

`next.config.ts` sets per-route:
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- Full `Content-Security-Policy` with explicit allowlists for scripts, styles, connect-src (Binance, Groq, NVIDIA, Gemini, TwelveData, Finnhub, NewsAPI, Coinbase, Supabase)

### 7.2 CSRF Hardening — ✅ Strong

Middleware rejects cross-origin mutations with exact-origin comparison (not naive `endsWith`). Machine inbound (Stripe webhook, Vercel Cron) correctly exempted. ✅

### 7.3 Known CVEs — ❌ 9 vulnerabilities (4 high, 5 moderate)

| Package | Severity | Issue |
|---|---|---|
| **Next.js** (via deps) | High | Unbounded Server Action payload (Edge) |
| **Next.js** (via deps) | High | SSRF via rewrites (attacker-controlled host) |
| **Next.js** (via deps) | High | DoS via SVG image optimization |
| **Next.js** (via deps) | High | Unauthenticated disclosure of internal endpoints |
| **postcss** (≤8.5.22) | High | XSS via unescaped `</style>` in stringify |
| **postcss** | High | Arbitrary file read via sourceMappingURL |
| **postcss** | High | Path traversal in source map loading |
| **sharp** (<0.35.0) | High | libvips CVEs (33327, 33328, 35590, 35591) |
| **valibot** (≤1.4.1) | Moderate | record() flatten() throw on inherited props |

`npm audit fix --force` would upgrade to `next@16.3.0` (outside current range). **This is the single highest-priority fix after the build.**

### 7.4 Hardcoded PII — ✅ Cleaned

`entitlements.ts` explicitly documents and removes a previous hardcoded list of real user emails (GDPR violation). Demo users now resolve by `@tradcopilot.local` domain + a fixed set of test IDs. ✅

### 7.5 Key Redaction — ✅ Consistent

`startup.ts` `redactKey()` / `safeKeyInfo()` is the single format used everywhere — first6 + last4, never full values. Placeholder/mock keys treated as absent. ✅

---

## 8. Observability & Monitoring

### 8.1 Startup Banner — ✅ Good

`logStartupBanner()` prints a redacted per-provider key status at boot. Safe to call repeatedly, never logs values. ✅

### 8.2 Provider Health Endpoint — ✅ Present

`api/v1/admin/provider-health` exposes `getExtendedProviderHealth()` (AI + data providers). ✅

### 8.3 Error Tracking — ❌ None

**No Sentry / Datadog / Honeybadger / Logtail integration.** `ErrorBoundary` does `console.error` only. `analytics.trackError()` POSTs to a custom metrics endpoint but there's no alerting on it. In production, a server-side exception is visible only in Vercel logs with no aggregation, no alerting, no source maps.

**Recommendation:** Add Sentry (or equivalent) before production. This is a significant observability gap.

### 8.4 APM / Tracing — ❌ None

No distributed tracing, no OpenTelemetry. The `performance-profiler` is client-only and dev-gated. No server-side request tracing.

### 8.5 Structured Logging — ⚠️ Console-based

All server logs are `console.log/error/warn` with ad-hoc prefixes (`[AI_PROVIDER]`, `[FALLBACK_PIPELINE]`, `[useBinanceStream]`). Good for Vercel's log drain, but not structured (no JSON, no levels, no trace IDs). Consider `pino` for production.

---

## 9. Error Handling & Recovery

| Capability | Status |
|---|---|
| Typed API errors with Retry-After | ✅ |
| Prisma transient detection → 503 | ✅ |
| Multi-provider AI fallback (3 tiers) | ✅ |
| Deterministic synthetic fallback (4th tier) | ✅ |
| React ErrorBoundary (root + inline) | ✅ |
| `app/error.tsx` (Next.js error page) | ✅ |
| `app/not-found.tsx` | ✅ |
| WebSocket auto-reconnect + stale watchdog | ✅ |
| Client 429 queue with backoff retry | ✅ |
| Graceful degradation (stale market data) | ✅ |
| Per-alert error isolation in cron | ✅ |
| Atomic alert+notification transactions | ✅ |

This is one of the strongest areas of the codebase.

---

## 10. Deployment Readiness

### 10.1 Middleware → Proxy Migration — ❌ BLOCKER

Next.js 16 emits: *`⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.`* The current `src/middleware.ts` runs on Edge runtime and imports `demo-session.ts`, which imports Node `crypto` — **this produces a build-time Edge runtime warning** (`A Node.js module is loaded ('crypto') which is not supported in the Edge Runtime`).

**Impact:** The middleware works today but is on a deprecated path that will break in a future Next.js version, and the Edge incompatibility is a latent bug. **Must migrate to `proxy.ts` (or move session logic out of the Edge path) before production.**

### 10.2 CI/CD Pipeline — ✅ Solid

`.github/workflows/ci.yml`:
- Node 22, `npm ci`, `prisma generate`
- Lint → Type check → Tests (sequential, `needs` gated)
- Hardcoded API key detection (`sk-...` grep)
- Console.log error-dump detection
- Build job with placeholder env fallbacks

**Missing:** No deploy step, no Vercel integration, no staging promotion, no smoke tests post-deploy.

### 10.3 Vercel Config — ⚠️ Minimal

`vercel.json` defines only a single cron (`/api/cron/evaluate-alerts` daily). No `regions`, no `functions` memory/timeout tuning, no headers (those are in `next.config.ts`), no redirects beyond what Next config handles. Per the Vercel knowledge update, a `vercel.ts` is now the recommended configuration format — consider migrating.

### 10.4 Feature Flags — ✅ Present

`lib/feature-flags.ts` (client) + `FeatureFlag` model + `api/v1/admin/feature-flags` route. Safe defaults (`live_ws: false`, `paper_execution: false`), 60s TTL, 2s fetch timeout, non-fatal refresh. ✅

### 10.5 Environment Validation — ✅ Good

`startup.ts` validates all provider keys at boot, reports redacted status, app runs with whatever providers are available. `prisma.ts` requires `DATABASE_URL` explicitly (no silent mock). ✅

---

## 11. Files Changed

> **None.** This audit is read-only. No source files were modified. A placeholder `.env` was created to allow `npm ci` + `prisma generate` to run (it is gitignored and contains no real secrets).

---

## 12. Production Readiness Score — Breakdown

| Dimension | Weight | Score | Weighted |
|---|---|---|---|
| Build passes (TS + lint) | 20% | 2/10 | 0.40 |
| Test pass rate | 10% | 7.5/10 | 0.75 |
| Security (headers, CSRF, CVEs) | 15% | 7.5/10 | 1.13 |
| Performance & caching | 10% | 7/10 | 0.70 |
| Resilience & fallback | 15% | 9/10 | 1.35 |
| Observability | 10% | 5.5/10 | 0.55 |
| Deployment config | 10% | 6/10 | 0.60 |
| Code quality & types | 10% | 6.5/10 | 0.65 |
| **TOTAL** | **100%** | | **6.13 / 10** |

**Reliability Score: 7.5 / 10** — driven up by the excellent multi-provider fallback, typed errors, WebSocket resilience, and graceful degradation. Bounded down by the lack of error tracking and the per-process rate limiter.

---

## 13. Deployment Checklist

Fix in this order. **Do not push until 🔴 items are resolved.**

### 🔴 BLOCKERS (must fix)

- [ ] **Fix 10 TypeScript errors** (§1 Gate 1) — especially `userProfile` undefined in `analyze-chart/route.ts` and the `setAlertsCountToday` typo in `ChartsClientPage.tsx`
- [ ] **Migrate `middleware.ts` → `proxy.ts`** and remove the Node `crypto` import from the Edge path (`demo-session.ts`)
- [ ] **Resolve 9 CVEs** — upgrade Next.js to ≥16.3.0 (or apply targeted patches), bump `sharp` ≥0.35.0, `postcss` >8.5.22

### 🟡 HIGH (fix before production)

- [ ] **Add error tracking** (Sentry or equivalent) — server + client
- [ ] **Bound the L1 cache** — add LRU eviction or size cap
- [ ] **Run bundle analysis** (`@next/bundle-analyzer`) and code-split the animation libs (gsap, framer-motion, lenis, recharts)
- [ ] **Back the rate limiter with Redis/KV** for multi-instance consistency
- [ ] **Batch the cron notification writes** or fan out via queue

### 🟢 MEDIUM (fix within first 2 weeks post-launch)

- [ ] Add structured logging (pino) with trace IDs
- [ ] Add a `Notification` dedup-hash index for the cron's spam-suppression query
- [ ] Replace `Math.random()` anonymous-ID with crypto UUID
- [ ] Add a Vercel health-check / readiness endpoint
- [ ] Add post-deploy smoke tests to CI
- [ ] Consider migrating `vercel.json` → `vercel.ts`
- [ ] Add OpenTelemetry / server-side tracing

---

## 14. Rollback Plan

Since no deploy has occurred, this is the rollback plan **for the first production deploy** after the blockers are fixed:

1. **Vercel Rolling Releases** (GA since June 2025) — enable a canary rollout for the first production deploy (e.g. 10% → 50% → 100%) rather than an atomic cutover.
2. **Instant rollback:** Vercel keeps prior production deployments. If error rate / latency SLOs breach, `vercel rollback` redeploys the previous production deployment in <30s.
3. **Feature flags as circuit breakers:** `live_ws`, `paper_execution` default to `off`. If the new deploy misbehaves, flip `ai_monitoring` or disable the offending feature via `api/v1/admin/feature-flags` without a redeploy.
4. **DB safety:** No schema migrations are part of this audit. When migrations are added, ensure they're backward-compatible (expand-only) so the previous app version still works against the new schema.
5. **SLO guardrails for rollback trigger:**
   - 5xx rate > 1% for 2 minutes
   - AI analysis p95 latency > 30s
   - WebSocket connection success rate < 95%
   - Any unhandled server exception (once Sentry is added)

---

## 15. Recommended Immediate Next Steps

1. Fix the 10 TypeScript errors (est. 30–60 min — mostly straightforward).
2. Migrate middleware → proxy and decouple `crypto` from the Edge path.
3. Run `npm audit fix --force` and validate the Next.js 16.3.0 upgrade doesn't break the build.
4. Re-run this audit's four gates to confirm green.
5. Add Sentry.
6. Then push to a **preview** deploy first, validate, then promote to production via rolling release.

---

*Report generated 2026-08-05. Audit performed read-only. No production systems were modified.*
