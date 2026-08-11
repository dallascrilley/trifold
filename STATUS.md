# cli-mcp-projects status

- Status: active
- Owner: dallascrilley
- Last verified: 2026-08-11
- Current Linear outcome: none
- Current Beads claim: none (`cli-mcp-8sa.5` closed — landing)
- Remote: https://github.com/dallascrilley/cli-mcp-projects (private)
- Base branch: `main` (PR #1–#4; #5 persist store pending)
- Next safe action: after merge, `cli-mcp-8sa.4` OpenAPI import (last open child)
- Blockers: none recorded
- Working tree: `feat/persist-tasks-store`
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
