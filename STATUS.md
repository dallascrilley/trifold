# cli-mcp-projects status

- Status: active
- Owner: dallascrilley
- Last verified: 2026-08-11
- Current Linear outcome: none
- Current Beads claim: none — v1.1 store parity (`cli-mcp-8tb`) complete
- Remote: https://github.com/dallascrilley/cli-mcp-projects (private)
- Base branch: `main` (PR #1–#7 merged)
- Next safe action: productize a real domain, wire Linear, or deeper OpenAPI→Zod
- Blockers: none recorded
- Working tree: clean on `main`
- Backup: GitHub origin; Beads Dolt; `.beads/issues.jsonl`

## Product pointer

| Capability | How |
|---|---|
| Scaffold | `pnpm scaffold -- <slug>` |
| OpenAPI import | `pnpm openapi:import -- <file>` |
| Tasks store | `TASKS_STORE_PATH=.data/tasks.json` |
| Notes store | `NOTES_STORE_PATH=.data/notes.json` |
| MCP | `pnpm dev:mcp` / `pnpm dev:mcp:http` |

Orientation: `bin/orient`. Beads: `bin/work-items ready` (empty).
