---
name: repo-and-vercel-identity
description: Actual GitHub repo name and canonical vs stray Vercel project for TradCopilot
metadata:
  type: project
---

The TradCopilot GitHub repo is **`sajeev023/tradepolit-`** (with a trailing dash), NOT `tradepolit`. The working-tree folder `tradepolit--main` is GitHub's zip export naming (`<repo>-<branch>` → `tradepolit-` + `-` + `main`).

Two Vercel projects are linked to the same repo and BOTH deploy on every push/PR (noise + a false "production failed" status):
- **`tradepolit`** — canonical. Has the full production env-var set (DATABASE_URL, DIRECT_URL, ENCRYPTION_KEY, CRON_SECRET, Supabase, AI providers, Stripe). Production alias: `tradepolit-sajeev023s-projects.vercel.app`.
- **`tradepolit--main`** — stray duplicate auto-created from the zip folder name, with NO env vars. Its deploys go Ready (build is connection-free) but serve a broken app at runtime. Consider disconnecting/deleting it (needs user authorization — destructive).

Both projects' deployments (Preview AND Production) are behind **Vercel Deployment Protection (SSO)**, so anonymous `curl` hits the `vercel.com/sso-api` gate, not the app. Deployment Protection is a project access setting, not a defect. See [[prod-deploy-edge-module-fix]].