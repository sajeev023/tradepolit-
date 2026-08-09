# TradCopilot — Release Stabilization Report

**Date:** 2026-08-09
**Author:** Lead Architect / Principal Engineer pass
**Scope:** Restore a single clean, production-ready state; stabilize CI/CD, Prisma, env validation, security posture, and deployment config; remove conflicting/dead code.

---

## 0. Environment reality (read first)

The mission assumed a git history to walk and a remote to push to. The working
tree has **no `.git` directory and `git` is not installed** on this machine, so
Phases 1, 2, 7 (squash) and 8 (push) are **physically not executable here**.
What *was* executable — and was done — is the full local verification chain
(`npm ci`, `prisma generate`, lint, `tsc`, vitest, `next build`) plus a static
audit and production-safe fixes. GitHub Actions / Vercel deploy verification
requires credentials and a repo not present in this environment; those gates
are flagged below as **pending external verification** rather than guessed.

Toolchain used: Node v24.19.0, npm 12.0.2, Next.js 16.2.9, Prisma 7.8.0,
Vitest 4.1.9. CI uses Node 22.

---

## 1. Timeline / root cause of "deployment failures"

There is no commit history to timeline. Instead, the authoritative artifact is
`docs/PRODUCTION_READINESS_REPORT.md` (2026-08-05), which documented a **broken
state**: 10 TypeScript errors failing the build, 10 failing tests, and a
Node-`crypto` Edge-runtime incompatibility in `demo-session.ts`.

Re-verifying the current tree shows **all of those are already resolved**:
- `tsc --noEmit` → **0 errors** (was 10).
- `next build` → **exit 0**, "Compiled successfully" (was aborting).
- vitest → **210/210 pass, 19 files** (was 194/204 with 10 backtest failures).
- `demo-session.ts` now uses **Web Crypto** (`globalThis.crypto.subtle`), not
  Node `crypto` — the Edge incompatibility is gone (no build warning).

**Root cause of the original failures (per the stale report + code inspection):**
real type bugs (`setAlertsCountToday` wrong setter, `userProfile` out-of-scope in
`analyze-chart/route.ts`, missing `rsiSentiment` field, Lenis `.raf` type,
`Buffer.from(string|undefined)` overload) plus tests that required a live
Postgres. All were fixed in the tree before this pass. **What the fixes left
behind was cleanup and posture debt** — the actual "conflicting/incomplete fixes"
this pass corrected are listed in §3.

---

## 2. Verification results (this pass, after fixes)

| Gate | Command | Result |
|---|---|---|
| Install | `npm ci` | ✅ exit 0 |
| Prisma client | `npx prisma generate` | ✅ Generated v7.8.0 |
| Lint | `npm run lint` | ✅ **0 errors**, 8 warnings |
| Type check | `npm run typecheck` (`tsc --noEmit`) | ✅ exit 0 |
| Tests | `npm test` (vitest) | ✅ **19 files, 210/210 pass** |
| Production build | `npm run build` | ✅ exit 0, "Compiled successfully in 7.3s" |
| Middleware→proxy deprecation | build stderr | ✅ warning **removed** (migrated) |
| Edge `crypto` warning | build stderr | ✅ none (Web Crypto) |

Build env used (CI-equivalent placeholders): `USE_DB_MOCK=true`,
`NEXT_PUBLIC_SUPABASE_URL/-ANON_KEY`, `DATABASE_URL`, `DEMO_SECRET`,
`ENCRYPTION_KEY` — exactly the pattern CI's build job uses.

**Pending external verification (cannot run here):** GitHub Actions run,
Vercel Preview deploy, Vercel Production deploy, live Prisma migration, live DB
connection, live auth/trading/AI flows. These need the GitHub repo + Vercel
project + real secrets.

---

## 3. Files changed and why

### Removed (dead / debug / PII)
- `fix.txt` — leftover P0 task description committed into the repo root. Not source.
- `scratch/` (`fix-domains.ps1`, `fix-email-casing.ps1`, `rename-urls.ps1`,
  `rename.ps1`, `test_consistency.ts`) — one-off debug/rename scripts. Not
  imported by `src/` (verified by grep).
- `src/lib/check-users.ts` — debug script that ran `main()` at **module
  top-level**, dumping every user row to `console.log` on import (a module
  import side-effect + PII dump). Not imported anywhere (verified).
- `src/lib/rate-limiter.ts` — client-side 429 retry queue exporting
  `rateLimitedFetch`; **zero imports** in `src/` (verified). Dead code.

### Migrated
- `src/middleware.ts` → **`src/proxy.ts`** — Next.js 16 renamed the "middleware"
  file convention to "proxy" (functionality identical per
  `node_modules/next/dist/docs/.../16-proxy.md`). Export `middleware` → `proxy`,
  `config`/matcher unchanged. **Removes the build deprecation warning.** The
  auth/CSRF gate logic is byte-identical.

### Fixed (security posture / contract conflicts)
- `src/lib/supabase/server.ts` — comment said "Fail fast rather than fall back to
  a placeholder anon key" but the code **did** fall back to
  `https://placeholder.supabase.co` / a placeholder JWT. Aligned code to the
  documented intent: throw on missing `NEXT_PUBLIC_SUPABASE_URL/-ANON_KEY`,
  matching `lib/supabase/middleware.ts`. Runs at request time only, so
  `next build` / `prisma generate` are unaffected; CI/Vercel inject real values.
- `src/lib/supabase/client.ts` — same misleading comment, but this is the
  **browser** client (NEXT_PUBLIC vars are build-inlined; throwing would
  white-screen the app). Rewrote the comment to honestly describe the browser
  fallback and that it is **not** a security boundary (anon key is public;
  auth is enforced server-side). No behavior change.
- `scripts/grant-pro.js` — removed **three hardcoded real user Gmail addresses**
  that granted PRO plan (PII in the repo + a Stripe-bypassing privilege grant).
  The script now reads emails from `GRANT_PRO_EMAILS` env or CLI args.

### Added
- `.env.example` — referenced by `README.md` but missing. Complete env-var
  inventory (Supabase, DB, encryption, demo secret, cron/admin secrets, Stripe,
  Clarity, AI providers, market/news providers) with non-functional placeholders
  and generation instructions for the secrets.
- `package.json` — added `"typecheck": "tsc --noEmit"` script (the mission's
  Phase 6 runs `npm run typecheck`; CI already ran `npx tsc --noEmit`). Now both
  work.

### Corrected
- `README.md` — wrong framework version ("Next.js 15" → 16, + Prisma 7,
  multi-provider AI) and broken absolute paths
  (`file:///C:/Users/Lenovo/.gemini/...`) → repo-relative paths pointing at the
  correct `src/lib/market-registry.ts`.
- `docs/PRODUCTION_READINESS_REPORT.md` — added a SUPERSEDED banner pointing at
  this report so the stale "10 TS errors / failing build" claims aren't acted on.

### Dead code pruned (lint-confirmed)
- `src/lib/ai.ts` — removed unused non-exported `clientData()` helper.
- `src/lib/ai-response-parser.ts` — removed unused
  `validateAnalysisConsistency` import.
- `src/components/ui/smooth-scroll-provider.tsx` — removed a stale
  `eslint-disable-next-line react-hooks/exhaustive-deps` (lint confirmed no
  problem is reported without it).

Net lint warnings: **11 → 8**, 0 errors throughout.

---

## 4. Why previous fixes failed / left debt

1. **Comment/code contradiction in Supabase clients.** A fail-fast security
   hardening was applied to `middleware.ts` and documented in `server.ts`/
   `client.ts` comments, but the code in those two files kept the placeholder
   fallback. Result: one entry point threw, two silently used a placeholder —
   an inconsistent security posture and a misleading codebase. Fixed by
   aligning server.ts to throw and making client.ts's comment honest.
2. **Stale audit report.** The 2026-08-05 report listed build blockers that were
   later fixed, so anyone reading it would believe the build is broken when it
   is green. Fixed with a superseded banner + this report.
3. **PII + privilege backdoor left in a script.** `entitlements.ts` was cleaned
   of hardcoded emails, but `scripts/grant-pro.js` still shipped three real
   addresses and a PRO-grant path. Fixed.
4. **Leftover debug artifacts.** `fix.txt`, `scratch/`, `check-users.ts` (with a
   top-level side effect) survived the stabilization. Removed.
5. **Deprecated convention.** `middleware.ts` was never migrated to the Next 16
   `proxy.ts` convention, leaving a build warning. Migrated.

---

## 5. Audit findings (severity / evidence / fix)

| # | Severity | Finding | Evidence | Status |
|---|---|---|---|---|
| 1 | High | Hardcoded real user emails + PRO grant in script | `scripts/grant-pro.js` (3 Gmail addresses) | ✅ Fixed |
| 2 | High | Supabase server/client used placeholder fallback despite fail-fast docs | `supabase/server.ts`, `client.ts` vs `middleware.ts` | ✅ Fixed |
| 3 | Medium | Deprecated `middleware.ts` convention (build warning) | Next 16 deprecation emit | ✅ Migrated to `proxy.ts` |
| 4 | Medium | 13 npm audit vulnerabilities (7 high, 6 mod) — transitive `sharp`, `valibot`, `postcss`, `@hono/node-server` | `npm audit` | ⏳ Tech debt — controlled upgrade needed (see §6) |
| 5 | Medium | `.env.example` missing (README references it) | filesystem | ✅ Added |
| 6 | Low | Dead code: `rate-limiter.ts`, `check-users.ts` (side-effect), `clientData()`, unused import | grep + lint | ✅ Removed |
| 7 | Low | README wrong version + broken absolute paths | `README.md` | ✅ Fixed |
| 8 | Low | No `typecheck` npm script | `package.json` | ✅ Added |
| 9 | Low | L1 in-memory cache unbounded (no LRU/TTL prune) | `lib/cache.ts` (per stale report, still valid) | ⏳ Tech debt |
| 10 | Low | Rate limiter is per-process (in-memory) — inconsistent behind N instances | `lib/rate-limit.ts` (self-documented) | ⏳ Tech debt — back with Vercel KV/Redis |
| 11 | Info | CSP allows `'unsafe-eval'`+`'unsafe-inline'` for scripts | `next.config.ts` | ⏳ Needed for TradingView widget; tighten if widget replaced |
| 12 | Info | `dotenv` imported in `prisma.config.ts` but not declared in `package.json` (resolves transitively) | `prisma.config.ts` | ⏳ Acceptable; declare explicitly if desired |
| 13 | Info | No error tracking / APM (Sentry etc.) | codebase | ⏳ Tech debt |
| 14 | Info | Cron notification writes O(users×symbols), no batching | `api/cron/evaluate-alerts` | ⏳ Tech debt at scale |

---

## 6. Remaining technical debt (ordered)

1. **CVEs (13).** `npm audit fix --force` would bump `next` → 16.3.0 (outside
   the current `16.2.9` pin) plus `sharp`/`valibot`/`postcss`. Because
   `AGENTS.md` flags this Next distribution as custom with breaking changes,
   this upgrade must be done deliberately: bump, re-run all four gates, smoke
   test auth + AI + market data, then promote. **Do not `--force` blind.**
2. **Observability:** no Sentry/APM; server logs are unstructured `console.*`.
   Add Sentry (server+client) and structured logging before production.
3. **Rate limiter:** back `lib/rate-limit.ts` with Vercel KV/Upstash for
   multi-instance consistency (usage quotas depend on it).
4. **L1 cache:** bound `lib/cache.ts`'s in-memory Map (LRU cap or prune pass).
5. **Cron writes:** batch `createMany` or fan-out via Vercel Queues for large
   user bases; add a `Notification` dedup-hash index.
6. **`prisma.config.ts`:** declare `dotenv` as a devDependency for explicit
   dependency hygiene (currently transitive).
7. **CSP:** investigate removing `'unsafe-eval'` if the TradingView widget can
   be sandboxed differently.
8. **Lint warnings (8):** unused vars (`ChartsClientPage`, `search/route`,
   `entitlements`, `trade-validator`) and `TradingViewChart` exhaustive-deps.
   The exhaustive-deps fix is intentionally deferred — re-adding `symbol`/
   `timeframe` to the effect deps would change chart re-init behavior and needs
   runtime verification against live TradingView.

---

## 7. Git strategy & push

**Not executed.** No `.git`, no `git` binary, no remote, no Vercel/GH credentials
in this environment. The clean state exists as the working tree. When this tree
is placed in a real repository:

1. `git init` → commit the working tree as the single clean commit:
   `fix(release): restore production deployment, stabilize CI/CD, preserve security hardening`
2. Push to a **preview/feature branch** first, let GitHub Actions run the
   `ci.yml` pipeline (lint → typecheck → test → secret scan → build).
3. Deploy to Vercel Preview, smoke-test auth + charts + AI + paper trading.
4. Promote to Production via Vercel Rolling Release; set production secrets
   (`DATABASE_URL`, `DIRECT_URL`, `ENCRYPTION_KEY`, `DEMO_SECRET`,
   `STRIPE_*`, `CRON_SECRET`, `ADMIN_SECRET`, provider keys).

**Never push until the external gates (GitHub Actions, Vercel Preview,
Vercel Production) are green** — those are the gates this environment could not
run.

---

## 8. Production readiness score

| Dimension | Score | Notes |
|---|---|---|
| Build (TS + lint) | 9/10 | 0 TS errors, 0 lint errors, 8 warnings |
| Tests | 9/10 | 210/210 pass (backtest coverage is mock-DB) |
| Security posture | 8/10 | PII removed, fail-fast aligned, CSRF/CSP strong; CVEs pending |
| Resilience/fallback | 9/10 | Multi-provider AI, typed errors, WS watchdog, graceful degradation |
| Deployment config | 7/10 | proxy migrated, env example added; no Sentry, rate limiter per-process |
| Observability | 5.5/10 | Startup banner + provider health; no error tracking/APM |
| Code quality | 8/10 | Dead code removed; minor unused-var warnings remain |
| **Overall** | **7.8 / 10** | **Green build, safe to promote to Preview; not yet fully production-hardened (CVEs + observability).** |

**Verdict:** The working tree is a clean, building, passing state. It is ready
for a **Preview deploy and CI run**. It is **not** declared fully
production-ready because (a) the CVE upgrade and (b) error tracking are
outstanding, and (c) the external CI/Vercel gates have not been run in this
environment. Close those three and the score clears 9.