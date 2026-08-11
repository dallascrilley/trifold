# cli-mcp-projects status

- Status: active
- Owner: dallascrilley
- Last verified: 2026-08-11
- Current Linear outcome: none
- Current Beads claim: none — post-v1 epic `cli-mcp-8sa` complete (no open beads)
- Remote: https://github.com/dallascrilley/cli-mcp-projects (private)
- Base branch: `main` (PR #1–#6 merged)
- Next safe action: productize a real domain (`pnpm scaffold`) or wire Linear; backlog empty
- Blockers: none recorded
- Working tree: clean on `main`
- Backup: GitHub origin; Beads Dolt; `.beads/issues.jsonl`

## Product pointer

Single-schema TypeScript monorepo: **Operation Registry (Zod) → HTTP + CLI + MCP**, OpenAPI emit **and** import.

| Capability | Command / package |
|---|---|
| Scaffold product | `pnpm scaffold -- <slug>` |
| Import OpenAPI stubs | `pnpm openapi:import -- <file>` |
| Shared task store | `TASKS_STORE_PATH=.data/tasks.json` |
| MCP stdio / HTTP | `pnpm dev:mcp` / `pnpm dev:mcp:http` |
| Samples | `tasks` (`packages/ops`), `notes` |

Docs: `docs/brainstorms/…`, `docs/plans/…`. Orientation: `bin/orient`.

This file is an orientation pointer. Beads remains authoritative for execution work.
