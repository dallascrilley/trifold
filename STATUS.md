# cli-mcp-projects status

- Status: active
- Owner: dallascrilley
- Last verified: 2026-08-11
- Current Linear outcome: none
- Current Beads claim: none
- Remote: https://github.com/dallascrilley/cli-mcp-projects (private)
- Base branch: `main` (PR #1–#5 merged)
- Next safe action: `bin/work-items ready` → `cli-mcp-8sa.4` (OpenAPI import) or close epic
- Blockers: none recorded
- Working tree: clean on `main`
- Backup: GitHub origin; Beads Dolt remote; `.beads/issues.jsonl` export

## Product pointer

Single-schema TypeScript monorepo: **Operation Registry (Zod) → HTTP + CLI + MCP**, OpenAPI emitted.

- Scaffold: `pnpm scaffold -- <slug>`
- MCP: stdio default; HTTP via `pnpm dev:mcp:http`
- Shared tasks: `TASKS_STORE_PATH=.data/tasks.json`
- Samples: `tasks`, `notes`
- Backlog epic: `cli-mcp-8sa` (last child: OpenAPI import)

This file is an orientation pointer. Beads remains authoritative for execution work.
