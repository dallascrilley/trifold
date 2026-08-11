# cli-mcp-projects status

- Status: active
- Owner: dallascrilley
- Last verified: 2026-08-11
- Current Linear outcome: none
- Current Beads claim: none (`cli-mcp-7op` JsonFileMapStore landing)
- Remote: https://github.com/dallascrilley/cli-mcp-projects (private)
- Base branch: `main` (PR #1–#7; #8 shared store pending)
- Next safe action: after merge, product domain or OpenAPI→Zod depth
- Blockers: none recorded
- Working tree: `feat/json-file-store-helper`
- Backup: GitHub origin; Beads Dolt; `.beads/issues.jsonl`

## Product pointer

| Capability | How |
|---|---|
| Scaffold | `pnpm scaffold -- <slug>` |
| OpenAPI import | `pnpm openapi:import -- <file>` |
| Shared file stores | `JsonFileMapStore` in `@cli-mcp/core`; `TASKS_STORE_PATH` / `NOTES_STORE_PATH` |
| MCP | `pnpm dev:mcp` / `pnpm dev:mcp:http` |

Orientation: `bin/orient`. Beads: `bin/work-items ready`.
