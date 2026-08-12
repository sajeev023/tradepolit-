---
name: prod-deploy-edge-module-fix
description: Root cause of the Aug 2026 production deploy failures and the fix
metadata:
  type: project
---

The Aug 6 2026 production deploy failures: build completed but `Deploying outputs...` failed with
`The Edge Function "_middleware" is referencing unsupported modules: node:util/types`.

Fix (in release commit `7157b40` on main, 2026-08-09): migrated `src/middleware.ts` → `src/proxy.ts` (Next.js 16 "proxy" convention) and the `demo-session.ts` Node-`crypto` → Web Crypto (`globalThis.crypto.subtle`) change. After this, the Edge Function deploys as `ƒ Proxy (Middleware)` with no unsupported-module error — verified on both Preview and Production deployments (Ready).

**How to apply:** When debugging future Vercel deploy failures, distinguish build-stage errors from deploy-stage ("Deploying outputs") errors. `node:*` module references in Edge Functions are deploy-stage blockers even when `next build` passes locally. See [[repo-and-vercel-identity]].