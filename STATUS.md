# cli-mcp-projects status

- Status: active
- Owner: dallascrilley
- Last verified: 2026-08-11
- Current Linear outcome: none
- Current Beads claim: none (v1.1 store parity epic `cli-mcp-8tb` closed — landing)
- Remote: https://github.com/dallascrilley/cli-mcp-projects (private)
- Base branch: `main` (PR #1–#6; #7 store parity pending)
- Next safe action: after merge, choose new product domain or Linear wiring
- Blockers: none recorded
- Working tree: `feat/product-store-parity`
- Backup: GitHub origin; Beads Dolt; `.beads/issues.jsonl`

## Product pointer

Single-schema TypeScript monorepo: **Operation Registry (Zod) → HTTP + CLI + MCP**.

| Capability | How |
|---|---|
| Scaffold | `pnpm scaffold -- <slug>` (file store + env wired) |
| OpenAPI import | `pnpm openapi:import -- <file>` |
| Tasks store | `TASKS_STORE_PATH=.data/tasks.json` |
| Notes store | `NOTES_STORE_PATH=.data/notes.json` |
| MCP | `pnpm dev:mcp` / `pnpm dev:mcp:http` |

Orientation: `bin/orient`. Beads: `bin/work-items ready`.
