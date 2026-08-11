# cli-mcp-projects status

- Status: active
- Owner: dallascrilley
- Last verified: 2026-08-11
- Current Linear outcome: none
- Current Beads claim: none — shared `JsonFileMapStore` epic complete
- Remote: https://github.com/dallascrilley/cli-mcp-projects (private)
- Base branch: `main` (PR #1–#8 merged)
- Next safe action: real product domain, Linear, or deeper OpenAPI→Zod
- Blockers: none recorded
- Working tree: clean on `main`
- Backup: GitHub origin; Beads Dolt; `.beads/issues.jsonl`

## Product pointer

| Capability | How |
|---|---|
| Scaffold | `pnpm scaffold -- <slug>` |
| OpenAPI import | `pnpm openapi:import -- <file>` |
| File stores | `@cli-mcp/core` `JsonFileMapStore`; `TASKS_STORE_PATH` / `NOTES_STORE_PATH` |
| MCP | `pnpm dev:mcp` / `pnpm dev:mcp:http` |

Orientation: `bin/orient`. Beads: `bin/work-items ready` (empty).
