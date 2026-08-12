# cli-mcp-projects status

- Status: active
- Owner: dallascrilley
- Last verified: 2026-08-11
- Current Linear outcome: none
- Current Beads claim: none (`cli-mcp-uan` OpenAPI→Zod landing)
- Remote: https://github.com/dallascrilley/cli-mcp-projects (private)
- Base branch: `main` (PR #1–#8; #9 OpenAPI→Zod pending)
- Next safe action: after merge — product domain, Linear, or polish
- Blockers: none recorded
- Working tree: `feat/openapi-json-schema-zod`
- Backup: GitHub origin; Beads Dolt; `.beads/issues.jsonl`

## Product pointer

| Capability | How |
|---|---|
| Scaffold | `pnpm scaffold -- <slug>` |
| OpenAPI import | `pnpm openapi:import -- <file>` (JSON Schema → Zod) |
| File stores | `JsonFileMapStore`; `TASKS_STORE_PATH` / `NOTES_STORE_PATH` |
| MCP | `pnpm dev:mcp` / `pnpm dev:mcp:http` |

Orientation: `bin/orient`. Beads: `bin/work-items ready`.
