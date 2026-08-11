# cli-mcp-projects status

- Status: active
- Owner: dallascrilley
- Last verified: 2026-08-11
- Current Linear outcome: none
- Current Beads claim: none (post-v1 epic `cli-mcp-8sa` closed — landing OpenAPI import)
- Remote: https://github.com/dallascrilley/cli-mcp-projects (private)
- Base branch: `main` (PR #1–#5; #6 OpenAPI import pending)
- Next safe action: after merge, pick new product work or polish
- Blockers: none recorded
- Working tree: `feat/openapi-import`
- Backup: GitHub origin; Beads Dolt remote; `.beads/issues.jsonl` export

## Product pointer

Single-schema TypeScript monorepo: **Operation Registry (Zod) → HTTP + CLI + MCP**, OpenAPI emitted.

- Scaffold: `pnpm scaffold -- <slug>`
- MCP: stdio default; HTTP via `pnpm dev:mcp:http`
- Shared tasks: `TASKS_STORE_PATH=.data/tasks.json`
- Samples: `tasks`, `notes`
- Backlog epic: `cli-mcp-8sa` (last child: OpenAPI import)

This file is an orientation pointer. Beads remains authoritative for execution work.
