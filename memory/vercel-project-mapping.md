---
name: vercel-project-mapping
description: Which Vercel project serves production tradecopilot.com and where env vars live
metadata:
  type: project
---

The repo `sajeev023/tradepolit-` (trailing dash) maps to TWO Vercel projects under team `sajeev023s-projects`:

- **`tradepolit`** → production domain **`tradcopilot.com`** (the real production app). Holds ALL env vars.
- **`tradepolit--main`** → `tradepolit-main.vercel.app` (auto-created from `tradepolit-` repo + branch; double dash). Has **ZERO** env vars — orphan, not production.

Both get a deployment per push. Production `tradcopilot.com` tracks `main`; `release/stabilization-2026-08` deploys to PREVIEW only (not promoted until merged to main).

Env vars on `tradepolit` (SET): TWELVEDATA_API_KEY, GROQ_API_KEY, GROQ_API_KEY_2, NVIDIA_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, DATABASE_URL, DIRECT_URL, ENCRYPTION_KEY, CRON_SECRET, FINNHUB_API_KEY, NEWS_API_KEY, RESEND_API_KEY, DEEPSEEK_API_KEY.

MISSING on `tradepolit`: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID, DEMO_SECRET, ADMIN_SECRET.

**Why:** Knowing which project is live matters for any deploy/env/debug work.
**How to apply:** To check/rotate prod secrets use `vercel env ls --project tradepolit`. Verify with [[vercel-sso-blocks-anonymous-preview]].