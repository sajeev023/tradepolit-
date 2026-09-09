# Trade Copilot V2 — Master Product Transformation Report

> Audit date: 2026-08-30. Read-only audit of the working tree. No architecture was modified.
> This report is grounded in the actual repository, not assumptions.

---

## 1. CURRENT PRODUCT SUMMARY

Trade Copilot is a **read-only, AI-assisted decision-support workstation for retail crypto and forex day traders**. It does not execute trades, hold funds, or connect to brokerages. Its core loop is:

1. User opens a chart (TradingView widget) for one of 9 instruments.
2. Deterministic code computes indicators (RSI, MACD, EMA, ATR, VWAP, swing support/resistance) from live OHLCV candles.
3. An AI layer (raced across Groq / NVIDIA / Gemini / OpenAI) turns those readings into a structured setup: bias, setup quality, confidence, entry/stop/target ideas, invalidation level, and a "coach narrative."
4. The AI output is validated for internal consistency (stop-loss side vs bias, R:R ≥ 1.5, MACD/RSI narrative match) and regenerated once if it fails.
5. The user can journal trades, set alerts, run a risk calculator, backtest EMA-crossover strategies, read a news feed, and view a market-pulse dashboard.

**Positioning today:** "AI trading copilot for crypto & forex." The differentiator is the **behavioral coaching layer** — revenge-trade and overtrading detection that personalizes every analysis against the user's last 20 trades and journal.

**Monetization:** Free tier (5 AI analyses/day, 3 alerts/day) + Pro Terminal ($7.49/mo, unlimited analyses/alerts, performance dashboard, weekly AI report). Stripe subscriptions with webhook-synced entitlements.

---

## 2. CURRENT FEATURE MAP

| Feature | Status | Depth |
|---|---|---|
| AI chart analysis (analyze-chart) | ✅ Implemented | Deep — multi-model race, validation, regeneration, cache |
| AI chat / coach (ai-assistant) | ✅ Implemented | Deep — intent routing, RAG, behavioral context |
| TradingView chart embed | ✅ Implemented | Working, CSP-gated |
| Live price (Binance WS + REST) | ✅ Implemented | Deep — singleton WS, stale watchdog, fallback |
| OHLCV + indicators | ✅ Implemented | Deep — server-computed, validated |
| Trade journal | ✅ Implemented | Deep — CRUD, emotion/mistake tags, screenshots |
| Behavioral detection (revenge/overtrading) | ✅ Implemented | Deep — heuristic + DB events (PRO only) |
| Risk calculator | ✅ Implemented | Deep — decimal.js, leverage caps, JPY handling |
| Backtester (EMA crossover) | ✅ Implemented | Shallow — single strategy DSL, LONG-only |
| Alerts (price/RSI/EMA/trend) | ✅ Implemented | Medium — daily cron, in-app notifications |
| News feed (Finnhub + NewsAPI) | ✅ Implemented | Medium — keyword sentiment, dedupe |
| Market pulse (Fear&Greed, funding) | ✅ Implemented | Shallow — 3 assets, cached 6h |
| Watchlist | ✅ Implemented | Shallow — list of symbols only |
| Saved analyses | ✅ Implemented | Shallow — 6 string fields, no revisit workflow |
| Performance dashboard | ✅ Implemented (PRO) | Medium — equity curve, KPIs, weekly report |
| Weekly AI report | ✅ Implemented (PRO) | Medium — 7-day aggregate |
| Admin panel | ✅ Implemented | Medium — users, feature flags, signup trend |
| Demo session (15-min) | ✅ Implemented | Deep — HMAC-signed, isolated |
| SEO / marketing site | ✅ Implemented | Deep — 20+ landing pages, JSON-LD, guides |

**Incomplete / superficial:** backtester (LONG-only, one strategy), watchlist (no intelligence), saved analyses (no revisit/review loop), market pulse (3 assets), news (keyword-only sentiment, no AI synthesis).

---

## 3. CURRENT TECHNICAL ARCHITECTURE

```
Next.js 16 (App Router, Vercel)
├── proxy.ts (auth + CSRF gate, Edge)
├── API routes (REST, Zod-validated)
│   ├── /api/v1/ai/*        (analyze-chart, chat, weekly-report, saved-analyses)
│   ├── /api/v1/market/*    (price, ohlcv, indicators, pulse)
│   ├── /api/v1/{trades,journal,alerts,watchlists,strategies,backtests,...}
│   ├── /api/v1/admin/*     (metrics, users, feature-flags, provider-health)
│   ├── /api/cron/evaluate-alerts
│   └── /api/stripe/*       (checkout, portal, webhook)
├── Prisma ORM (PostgreSQL via Supabase, PrismaPg adapter)
├── Supabase (Auth GoTrue + Postgres + Storage)
├── Stripe (billing)
└── Upstream providers: Binance, TwelveData, Coinbase, Finnhub, NewsAPI,
    Groq, NVIDIA NIM, Gemini, OpenAI
```

**Caching:** two-tier (L1 in-memory Map + L2 `MarketCache` Postgres table). TTLs per data type.

**Resilience:** multi-provider AI fallback, typed errors (503/502/429/401 with Retry-After), WebSocket stale watchdog, deterministic fallback analysis, graceful degradation to clearly-labelled SIMULATED data.

---

## 4. CURRENT AI ARCHITECTURE

There are **two parallel AI systems** (a real source of confusion):

1. **`lib/ai-providers.ts`** — sequential chain Groq → NVIDIA → Gemini, with per-provider retry/backoff/circuit-breaker. Used by `runAIChat()` (chat) and `weekly-report`.
2. **`lib/nvidia-ai.ts`** — concurrent multi-model race (1 Groq + 3 NVIDIA + Gemini + OpenAI), first-winner-takes-all. Used by `analyze-chart` via `callFastestModel()`.

**Pipeline for chart analysis:**
```
OHLCV → compileTechnicalContext (deterministic indicators)
      → validateMarketData / validateIndicators / validateLevels
      → build prompt (telemetry + behavioral context)
      → callFastestModel (race)
      → safeParseAIResponse (JSON extract + repair)
      → validateTradeAnalysis (consistency: MACD, RSI, stop-loss, R:R)
      → if invalid: regenerate once with explicit fix instructions
      → if still invalid: 422 with issues
      → else: cache + return
```

**What the AI knows:** current price, RSI, MACD, EMA, ATR, VWAP, support/resistance, trend, bias, setup grade, volume surge, session, plus the user's last 20 trades, journal entries, behavioral events, and profile risk params.

**What the AI does NOT know:** order flow, news (explicitly told it has none), fundamentals, multi-timeframe context beyond the single selected TF, historical price series beyond the last 100 candles, and any persistent cross-session memory (see §5).

**RAG:** a small hand-curated knowledge base (`knowledge/events.ts`, `concepts.ts`, `psychology.ts`) with keyword scoring. Used only for historical/education/psychology intents.

**Validation is genuinely strong** — this is the most impressive part of the codebase. `trade-validator.ts` checks MACD/RSI narrative consistency, stop-loss side vs bias, R:R ≥ 1.5, support/resistance structure, and risk-engine agreement.

---

## 5. CURRENT DATA ARCHITECTURE

**Prisma schema** (Postgres): User, UserProfile (subscription state), Trade, JournalEntry, Strategy, Backtest, Watchlist, Alert, Notification, Performance, News, Setting, AIChat, UserApiKey, MarketCache, BehavioralEvent, SessionPerformance, ConversationMemory, FeatureFlag, SavedAnalysis, WebhookEvent.

**Critical finding — the "memory" is not persistent:**
- `lib/ai-memory.ts` (`SessionMemory`) is an **in-memory `Map`**. It is lost on every server restart and is **not shared across Vercel instances**. It is not the "persistent memory" the marketing claims.
- `ConversationMemory` (DB) is used only as an **analysis cache** (`role: "cached_analysis"`), not as a real memory layer.
- `SavedAnalysis` stores only 6 shallow string fields — no structured thesis, no outcome tracking, no revisit workflow.

**This is the single biggest architectural gap for the V2 vision.** The product does not become more valuable after 30 days of use, because nothing meaningful accumulates. The behavioral context is recomputed fresh from the last 20 trades each time, which is good, but there is no *learned* context (e.g., "this user's win rate on BTC longs in London session is X").

---

## 6. CURRENT USER JOURNEY

1. **Landing** → strong SEO page, live hero workbench, "instant demo" CTA.
2. **Demo** → 15-min HMAC-signed session, 2 analyses, 1 alert, then conversion modal.
3. **Signup** → email/password or Google OAuth, email confirmation required.
4. **First value** → lands on `/charts`, selects symbol/timeframe, clicks "Analyze" → AI analysis in ~3-15s.
5. **Core workflow** → chart + AI analysis + chat + journal.
6. **Follow-up** → chat with the coach, save analysis, log trades.
7. **Returning** → chat history (last 7 days free), saved analyses, journal.

**Friction points:** email confirmation before first value (demo mitigates this); 5 analyses/day free cap; the "first value" requires the user to understand what to do (no guided onboarding); saved analyses have no revisit/review workflow.

---

## 7. CURRENT PRODUCT WEAKNESSES

1. **One-shot analysis, no continuity.** Each analysis is stateless. Nothing accumulates into a persistent, improving model of the user.
2. **No outcome loop.** You can save an analysis, but there's no "did this thesis play out?" review. The product never closes the loop from thesis → outcome → learning.
3. **Watchlist is dumb.** It's a list of symbols with no intelligence, no monitoring, no "what changed since you last looked."
4. **Backtester is a toy.** LONG-only, one strategy DSL, no risk sizing, no walk-forward.
5. **News is not connected to analysis.** The AI is explicitly told it has no news. News sentiment is keyword-only and never feeds the analysis.
6. **Market pulse is thin.** 3 crypto assets, cached 6 hours.
7. **No shareable output.** Analyses can be exported as PNG, but there's no shareable link, no collaboration, no public content loop.
8. **No referral or viral loop.** Growth is entirely top-of-funnel SEO + demo.

---

## 8. CURRENT TECHNICAL WEAKNESSES

1. **Analytics pipeline is broken** (verified): `analytics.ts` POSTs to `/api/v1/admin/metrics`, which has no POST handler. All events dropped.
2. **Two divergent AI systems** (`ai-providers.ts` sequential vs `nvidia-ai.ts` race) with confusing naming (`callFastestAIModel` vs `callFastestModel`).
3. **Session memory is in-memory only** — not persistent, not multi-instance safe.
4. **13 known CVEs** (Next.js, sharp, postcss, valibot) — flagged as tech debt, not yet upgraded.
5. **No error tracking / APM** (no Sentry, no structured logging, no trace IDs).
6. **Rate limiter is per-process** — inconsistent behind N Vercel instances.
7. **L1 cache unbounded** — no LRU eviction.
8. **Cron notification writes** O(users × symbols) — batched now, but still a fan-out concern at scale.
9. **`prisma.config.ts` imports `dotenv`** transitively (not declared).

---

## 9. CURRENT SECURITY RISKS

**Strong (verified):** CSRF exact-origin check, CSP with explicit allowlists, HMAC-signed demo sessions, AES-256-GCM at-rest API key encryption, constant-time secret comparison, Stripe webhook signature verification + idempotency, redacted key logging, prompt-injection sanitization (`sanitizeUserField` + `<client-data>` fences), user isolation on every query (`userId` scoped), admin role from single DB source.

**Risks to address:**
1. **13 CVEs** — the highest-priority security item. `npm audit fix --force` bumps Next.js to 16.3.0 (outside the pinned 16.2.9), which the AGENTS.md warns is a custom distribution with breaking changes. Must be done deliberately.
2. **CSP allows `'unsafe-eval'` + `'unsafe-inline'`** for the TradingView widget — acceptable but should be tightened if the widget is ever replaced.
3. **No rate limiting on the Stripe webhook** (relies on signature + idempotency, which is correct, but worth noting).
4. **`getClientIdentifier` trusts `x-forwarded-for` leftmost** — correct behind Vercel, but a footgun if the proxy topology changes.

---

## 10. CURRENT RETENTION PROBLEMS

The product has **no compounding value**. A user who has used Trade Copilot for 30 days has essentially the same experience as a new user, except for a longer journal and chat history. There is no:

- Persistent learned context (win rate by symbol/session/setup).
- Outcome review loop (did the saved thesis work?).
- Watchlist intelligence (what changed since last visit).
- Personalized recurring insight (weekly report exists but is PRO-only and manual).

**The core retention question — "why would a user come back tomorrow?" — is currently answered only by:** (a) they're actively trading and want a fresh analysis, or (b) they want to journal a trade. There is no *pull* mechanism that brings them back when they're not already in the app.

---

## 11. CURRENT GROWTH LIMITATIONS

1. **No shareable analysis** — the single most natural viral loop for a trading product is "share this setup." It doesn't exist.
2. **No referral mechanism.**
3. **No public content loop** — the guides are static SEO pages, not product-generated insights.
4. **Analytics broken** — we can't even measure the funnel.
5. **Acquisition is 100% SEO + demo** — no product-led growth.

---

## 12. WHAT OUR 131 USERS TELL US — ONLY IF DATA EXISTS

**We do not have reliable behavioral data.** The analytics pipeline is broken (events dropped at a missing POST endpoint). The only real data available is:
- `prisma.user.count()` (total signups) and `createdAt` timestamps (signup trend) — available via the admin metrics GET endpoint.
- Trade/journal/chat rows per user (available in the DB, but not aggregated into any retention/activation report).

**We cannot currently answer:** activation rate, first-meaningful-action rate, repeat-usage rate, most-used workflows, abandoned workflows, or retention curves. **This must be fixed before we can make evidence-based product decisions.**

**What we should instrument (Phase 1):** signup, activation (first analysis), repeat analysis, sessions, retention (D1/D7/D30), feature usage, AI latency, AI failures, market-data failures, conversion points. The `analytics.ts` client already has the right event names — we just need a working POST endpoint and a storage model.

---

## 13. LARGEST PROBLEMS WE SHOULD SOLVE

Ranked by pain × frequency × urgency × willingness-to-use × retention × differentiation × feasibility × market size:

1. **Traders don't learn from their own history.** They repeat the same mistakes (revenge trading, cutting winners, overtrading) because nothing closes the loop. *This is the problem Trade Copilot is uniquely positioned to solve* — it already has the behavioral detection, it just doesn't persist and surface the learning.
2. **Analysis is one-shot and forgettable.** A trader analyzes a chart, maybe acts, and the insight evaporates. There's no "what did I think, what happened, what should I do differently."
3. **No reason to return when not actively trading.** The product is pull-only (you come when you need an analysis), not push (it tells you when something you care about changed).
4. **Retail traders lack a structured decision process.** They jump between charts, news, and gut feel. A persistent "thesis → monitor → review" workflow is missing.

---

## 14. LARGE-MARKET OPPORTUNITIES

The current MVP is crypto + forex. The larger category is **AI-powered decision intelligence for financial markets**. Real, large, painful adjacent markets:

| Opportunity | Pain | Frequency | AI advantage | Moat |
|---|---|---|---|---|
| **Retail trading decision support** (current) | High | Daily | High (behavioral coaching) | Accumulated user context |
| **Trading journal → performance coaching** | High | Daily | High | Personal history |
| **Research/analysis workflow** (equities, ETFs) | Medium | Weekly | Medium | Watchlist intelligence |
| **Financial education** | Medium | Occasional | Medium | RAG knowledge base |
| **Institutional market intelligence** | High | Daily | High | Data + workflow |

**Strategic recommendation:** Do NOT expand to equities/ETFs/options yet. The strongest company is built by **deepening the retail-trader decision-support loop** (thesis → monitor → review → learn) rather than widening the instrument list. The market abstraction already exists (`market-registry.ts`), so expansion is *possible* later without a rewrite — but it is not the near-term priority.

The **largest company hiding in the MVP** is: *a persistent decision-intelligence layer that makes a trader measurably better over time, and becomes more valuable the longer they use it.* That is a moat competitors (ChatGPT, TradingView, generic journal apps) cannot easily replicate, because it requires accumulated personal context.

---

## 15. RECOMMENDED STRATEGIC DIRECTION

**Evolve from "one-shot AI chart analysis" to "continuous intelligent decision support."**

The core job-to-be-done: *"Help me make better trading decisions and stop repeating my mistakes."*

The 10x improvement: *"Trade Copilot remembers every thesis I form, monitors it, tells me when it's invalidated, and shows me — with my own data — where I keep going wrong."*

This is the "DISCOVER → ANALYZE → QUESTION → FORM THESIS → SAVE → MONITOR → REVISIT → REVIEW OUTCOME → LEARN" loop from the directive, and it is the right one.

---

## 16. TRADE COPILOT V2 PRODUCT DEFINITION

**TRADE COPILOT V2 =**

- **Core value proposition:** A persistent decision-intelligence layer for retail traders that turns every analysis into a tracked thesis, monitors it, and closes the loop from decision → outcome → learning — so the product gets *more* valuable the longer you use it.

- **Core user workflow:** Analyze a chart → form a thesis (bias, entry, invalidation, target) → save it → get notified when it's invalidated or hit → review the outcome → see your personal pattern (win rate by setup/session/emotion) → improve.

- **AI advantage:** Deterministic indicators + validated AI reasoning + *persistent personal context* (not just last-20-trades, but learned patterns over time).

- **Data advantage:** Accumulated theses, outcomes, and behavioral patterns per user — a moat that compounds.

- **Personalization:** Every analysis and every review is grounded in *your* history, *your* risk rules, *your* recurring mistakes.

- **Retention loop:** Saved theses that need monitoring → notifications when they resolve → outcome review → a "you're improving / here's your pattern" insight → reason to return.

- **Differentiation:** No competitor closes the thesis→outcome→learning loop with behavioral coaching. ChatGPT can't (no persistent personal context). TradingView can't (no behavioral layer). Journal apps can't (no live market monitoring).

---

## 17. TRADE COPILOT V2 TARGET ARCHITECTURE

**Current → Problem → Target:**

| Current | Problem | Target |
|---|---|---|
| In-memory `SessionMemory` | Lost on restart, not shared | Persistent `Thesis` + `Outcome` + `UserInsight` models |
| `SavedAnalysis` (6 strings) | No structure, no outcome | Structured `Thesis` (bias, entry, invalidation, target, confidence, rationale) |
| One-shot analysis | No continuity | Analysis → save thesis → monitor → review |
| Watchlist (symbols only) | No intelligence | Watchlist with per-symbol "what changed" + thesis status |
| Alerts (daily cron) | Coarse, no thesis link | Thesis-linked invalidation/target alerts |
| No outcome tracking | No learning | `Outcome` model + `UserInsight` (win rate by setup/session/emotion) |
| Broken analytics | No measurement | Working event pipeline + retention/activation dashboard |
| Two AI systems | Confusion, drift | One unified AI orchestration layer |

**Migration strategy:** Additive. New models (`Thesis`, `Outcome`, `UserInsight`, `AnalyticsEvent`) are expand-only migrations. Existing routes keep working. The AI orchestration is unified behind one interface without deleting the working fallback logic.

---

## 18. AI SYSTEM ARCHITECTURE (V2)

Separate concerns explicitly:

```
DATA (deterministic OHLCV/indicators)
  → RETRIEVAL (user context: theses, outcomes, insights, journal, trades)
  → AI REASONING (unified orchestration, one entry point)
  → STRUCTURED OUTPUT (JSON schema)
  → VALIDATION (existing trade-validator + new thesis-consistency checks)
  → PRESENTATION
```

- **Unify** `ai-providers.ts` and `nvidia-ai.ts` behind a single `callAI()` interface. Keep the race (it's faster) but make the sequential chain a fallback, not a parallel system.
- **Add a persistent context layer** that feeds the AI: not just last-20-trades, but *learned* insights (e.g., "your BTC longs in London session win 62% but your revenge trades lose 80%").
- **Keep the validation-first principle.** Extend `trade-validator.ts` to validate thesis consistency (invalidation vs bias, target vs R:R) before a thesis is saved.
- **Never let the LLM compute what deterministic code can compute.** Indicators, PnL, win rates, R:R are all deterministic. The LLM only *explains* and *coaches*.

---

## 19. DATA / MARKET ARCHITECTURE (V2)

- **Market abstraction already exists** (`market-registry.ts` + `AssetClass` enum). Keep it. Do NOT add new markets now — deepen the workflow on the 9 existing instruments first.
- **Add models:**
  - `Thesis` (userId, symbol, timeframe, bias, entry, invalidation, target, confidence, rationale, status: OPEN/INVALIDATED/HIT/EXPIRED, createdAt, resolvedAt, outcomeId)
  - `Outcome` (thesisId, result: WIN/LOSS/NO_TRADE, pnl, rMultiple, notes)
  - `UserInsight` (userId, type, content, computedAt) — deterministic, recomputed from trades/theses
  - `AnalyticsEvent` (userId?, anonymousId, type, payload, createdAt) — fixes the broken pipeline
- **Provider abstraction:** already clean (`market.ts` dispatches by symbol). No change needed.

---

## 20. USER EXPERIENCE ARCHITECTURE (V2)

- **Activation:** shortest path to first value. Demo already does this well. Add a 3-step guided "form your first thesis" flow after first analysis.
- **Core screen:** chart + analysis + a persistent "Theses" panel showing open theses and their status.
- **Review screen:** "Outcome review" — when a thesis resolves, prompt the user to log the outcome and see the pattern.
- **Insight surface:** a "Your patterns" card (deterministic, not AI-fluff) showing win rate by setup/session/emotion, and the top recurring mistake.
- **Loading/empty/error states:** already strong (skeletons, empty states, typed errors). Preserve.
- **Mobile:** already has bottom nav. Ensure the thesis/review flow works on mobile.

---

## 21. RETENTION LOOP (V2)

```
Analyze → Form thesis → Save → Monitor (alerts) → Resolve → Review outcome
   ↑                                                          ↓
   └────────────── Learn (insight: "your pattern") ←──────────┘
```

The loop is closed by **outcome review + learned insight**. A user returns because: (a) they have open theses to monitor, (b) a thesis resolved and they want to log it, (c) they want to see their improving pattern. This is a *legitimate* retention loop — it's utility, not manufactured engagement.

---

## 22. 500-USERS-IN-30-DAYS PRODUCT/GROWTH STRATEGY

Legitimate, product-driven growth loops (no fake growth, no dark patterns):

1. **Shareable analysis (P0).** A "share this setup" link that renders a public, read-only snapshot of the analysis (with a "get your own analysis" CTA). This is the single highest-leverage growth loop for a trading product.
2. **Fix analytics (P0).** We cannot grow what we cannot measure.
3. **Referral (P1).** "Give a friend 1 free Pro week, get 1 free Pro week." Legitimate, value-based.
4. **Public educational content (P1).** Product-generated insights (e.g., "this week's most common mistake among our users") as shareable content — anonymized, honest.
5. **Fast time-to-value (P0).** The demo already works; tighten the signup→first-analysis path.
6. **Compelling onboarding (P1).** A 3-step "form your first thesis" flow.

**Target:** 131 → 500 real users in 30 days is achievable if (a) the shareable-analysis loop works and (b) activation is measured and optimized. This is a product-led growth problem, not a paid-acquisition problem.

---

## 23. P0 / P1 / P2 / P3 FEATURE ROADMAP

### P0 — MUST BUILD (this cycle)

1. **Fix the analytics pipeline** — add POST handler to `/api/v1/admin/metrics`, add `AnalyticsEvent` model, wire the existing `analytics.ts` events. *(Unblocks all measurement.)*
2. **Persistent Thesis + Outcome models** — the foundation of the retention loop.
3. **Thesis save + monitor + review workflow** — the core V2 experience.
4. **Shareable analysis** — the growth loop.
5. **Unify AI orchestration** — one `callAI()` interface (reduces drift, enables the context layer).

### P1 — HIGH VALUE

6. **Learned user insights** (deterministic win-rate-by-setup/session/emotion).
7. **Watchlist intelligence** (what changed since last visit + thesis status).
8. **Thesis-linked alerts** (invalidation/target notifications).
9. **Referral program.**
10. **Guided onboarding** (form-first-thesis flow).

### P2 — LATER

11. **Backtester depth** (SHORT support, risk sizing, walk-forward).
12. **News → analysis integration** (feed verified news into the AI context).
13. **Market pulse expansion** (more assets, more signals).
14. **Public educational content loop.**

### P3 — DO NOT BUILD (now)

15. **New asset classes (equities/ETFs/options).** The market abstraction supports it, but it's not the near-term priority. Deepen before widening.
16. **Paper execution / broker integration.** Read-only is a feature and a trust signal. Do not blur it.
17. **Social feed / community.** Not yet; shareable analysis is the right first step.

---

## 24. IMPLEMENTATION PLAN

**Phase 1 — Foundation + reliability (P0 #1, #5):**
- Fix analytics POST endpoint + `AnalyticsEvent` model + migration.
- Unify AI orchestration behind `callAI()`.
- Run typecheck, lint, tests, build after each step.

**Phase 2 — Core V2 experience (P0 #2, #3):**
- `Thesis` + `Outcome` models + migrations.
- Thesis save/monitor/review API + UI.
- Extend `trade-validator` for thesis consistency.

**Phase 3 — AI intelligence + context (P1 #6):**
- `UserInsight` deterministic computation.
- Feed learned context into the AI prompt.

**Phase 4 — Retention systems (P1 #7, #8):**
- Watchlist intelligence, thesis-linked alerts.

**Phase 5 — Growth/activation (P0 #4, P1 #9, #10):**
- Shareable analysis, referral, onboarding.

**Phase 6 — Security/performance/scaling:**
- CVE upgrade (deliberate, gated), Sentry, LRU cache, Redis-backed rate limiter.

**Phase 7 — Polish + launch readiness:**
- Full test pass, mobile/desktop verification, AI validation verification.

---

## 25. RISKS AND TRADEOFFS

1. **CVE upgrade risk.** Bumping Next.js 16.2.9 → 16.3.0 may break the custom distribution. Mitigation: do it in isolation, re-run all four gates, smoke-test auth + AI + market data.
2. **Thesis model scope creep.** Risk of over-engineering the thesis/outcome schema. Mitigation: start minimal (bias, entry, invalidation, target, confidence, rationale, status), expand only when a real need appears.
3. **Shareable analysis privacy.** Public snapshots must never leak user PII or trade history. Mitigation: render only the analysis, not the user's journal/trades.
4. **"Learned insights" accuracy.** Deterministic insights must be honest (small sample sizes, no fabricated certainty). Mitigation: show sample size, never overstate.
5. **Unifying AI systems could regress the working race.** Mitigation: keep the race as the primary path, make the sequential chain a fallback, test latency before/after.

---

## 26. MEASURABLE SUCCESS CRITERIA

- **Activation:** ≥ 40% of signups complete a first analysis within 24h.
- **Thesis adoption:** ≥ 30% of analyses result in a saved thesis.
- **Retention:** D7 ≥ 25%, D30 ≥ 15% (measurable only after analytics is fixed).
- **Outcome review:** ≥ 20% of resolved theses get an outcome logged.
- **Shareable loop:** ≥ 5% of analyses are shared; shared links drive ≥ 10% of new signups.
- **Growth:** 131 → 500 real users in 30 days.
- **Reliability:** AI analysis p95 latency < 30s; 5xx rate < 1%; zero silent AI failures (every failure either validated, regenerated, or surfaced).

---

## THE NORTH STAR

Every decision in V2 is judged by one question:

**"Does this move Trade Copilot closer to becoming a product that traders genuinely depend on — because it makes them measurably better over time?"**

The answer is not "add more features." It is: **close the loop from decision to outcome to learning, and make the product more valuable the longer a trader uses it.**
