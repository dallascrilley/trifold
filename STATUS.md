# cli-mcp-projects status

- Status: active
- Owner: dallascrilley
- Last verified: 2026-08-11
- Current Linear outcome: none
- Current Beads claim: none (P2 backlog items closed: scaffolder + MCP HTTP)
- Remote: https://github.com/dallascrilley/cli-mcp-projects (private)
- Base branch: `main` (PR #1–#4 merged)
- Next safe action: `bin/work-items ready` → `cli-mcp-8sa.5` (persist store) or `cli-mcp-8sa.4` (OpenAPI import)
- Blockers: none recorded
- Working tree: clean on `main`
- Backup: GitHub origin; Beads Dolt remote on origin; `.beads/issues.jsonl` passive export

## Product pointer

Single-schema TypeScript monorepo: **Operation Registry (Zod) → HTTP + CLI + MCP**, OpenAPI emitted.

- Scaffold: `pnpm scaffold -- <slug>`
- MCP: stdio default; Streamable HTTP via `pnpm dev:mcp:http` or `--http`
- Samples: `tasks` (`packages/ops`), `notes` (scaffolded)
- Requirements / design / plan under `docs/`
- Backlog epic: `cli-mcp-8sa`

This file is an orientation pointer. Beads remains authoritative for execution work.
Linear is not wired yet.
