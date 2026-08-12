---
name: vercel-sso-blocks-anonymous-preview
description: Vercel Deployment Protection SSO blocks anonymous access to previews; how to verify headers anyway
metadata:
  type: reference
---

Vercel previews for `sajeev023s-projects` have **Deployment Protection (Standard SSO)** — anonymous `curl` of a preview URL returns `302 → https://vercel.com/sso-api?...`. So anonymous browser/curl verification of previews is impossible; the Vercel CLI token lives in the OS keychain (not a file), so a programmatic SSO bypass is impractical.

Workarounds that DO work:
- `vercel ls` / `vercel inspect <url>` (authenticated CLI) — shows deployment status, commit, aliases, build output. Does NOT show response headers.
- `vercel env ls --project <name>` — lists env var names (values Hidden) without a project link (pass `--project`).
- **Production `tradcopilot.com` is NOT SSO-protected** — anonymous `curl -I https://tradcopilot.com/` returns real headers incl. the CSP. The CSP in `next.config.ts` is a pure static string (no dynamic computation), so a Ready preview built from a commit serves exactly that commit's committed CSP string. Verify on prod (older commit) to confirm the mechanism, then infer the preview's CSP from the committed source.

See [[vercel-project-mapping]].