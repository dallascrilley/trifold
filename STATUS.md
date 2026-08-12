# Project status

- **Status:** active (private; public-ready prep complete)
- **Owner:** dallascrilley
- **Last verified:** 2026-08-11
- **Repository:** https://github.com/dallascrilley/trifold (**private** until explicit approval to go public)
- **Default branch:** `main`
- **Beads:** `bin/work-items ready` (optional execution ledger)
- **Next focus:** external feedback when public is approved; optional product domains
- **Blockers:** none
- **Flair:** logo, architecture hero, demo GIF, OG card under `docs/assets/`
- **Release gates:** `pnpm validate` (typecheck, test, secret scan, AI-slop scan); presentable `git log`

## Quality

```bash
pnpm install && pnpm validate
pnpm scan:ai-slop:all   # optional: include commit-history scan
```

## Release process

Repeatable checklist: [docs/runbooks/public-repo-release-sop.md](./docs/runbooks/public-repo-release-sop.md)

**Visibility rule:** prep may complete while the repo stays private. Do **not** flip to public without explicit owner approval.

Git history and CI are the durable evidence of quality.
