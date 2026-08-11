# Agent notes — cli-mcp-projects

## Orientation

Run `bin/orient`, then read `STATUS.md` and `README.md`.

Single-schema boilerplate: **Operation Registry** (Zod) → HTTP + CLI + MCP.

- Requirements: `docs/brainstorms/2026-08-11-cli-mcp-api-boilerplate-requirements.md`
- Design: `docs/plans/2026-08-11-cli-mcp-api-boilerplate-design.md`
- Plan: `docs/plans/2026-08-11-feat-cli-mcp-api-boilerplate-plan.md`
- Identity: `project.yaml`
- Execution ledger: Beads (`bd` / `bin/work-items`) — epic `cli-mcp-8sa`

## Work selection

Use the project adapter, not raw invent-a-todo lists:

```bash
bin/work-items ready
bin/work-items next          # claim first ready
bin/work-items show <id>
bin/work-items close <id>
bin/work-items doctor
```

Raw `bd` is fine for create/inspect when the adapter lacks a verb.

## Package boundaries

| Package | Owns |
|---|---|
| `@cli-mcp/core` | IR types, Registry, context, AppError, invoke, auth helpers |
| `@cli-mcp/ops` | Sample product operations (tasks) |
| `@cli-mcp/adapters-http` | Hono app from registry |
| `@cli-mcp/adapters-cli` | citty CLI from registry |
| `@cli-mcp/adapters-mcp` | MCP stdio server from registry |
| `@cli-mcp/openapi` | OpenAPI 3.1 emit from registry |
| `@app/api` / `@app/cli` / `@app/mcp` | Process entrypoints |

**Handlers own business logic. Adapters own transport only.**

## Scaffolding a product

```bash
pnpm scaffold -- <slug> [--title "Title"] [--dry-run]
pnpm install
pnpm --filter @cli-mcp/<slug> test
```

This creates `packages/<slug>` plus `apps/<slug>-{api,cli,mcp}`. Generator lives in
`@cli-mcp/scaffold` (`packages/scaffold`). Do not hand-copy apps for new products.

## Adding an operation

1. Prefer scaffolding a product, or define ops in `packages/ops` / `packages/<product>`.
2. Call `registry.register({...})` with `surfaces.http` / `cli` / `mcp` as needed.
3. MCP: set `surfaces.mcp.enabled: true` only for intentional tools. Writes require `agentDescription`.
4. Update snapshots if HTTP or MCP surface set changes (tasks sample):
   ```bash
   pnpm snapshot:update
   ```
5. Run `pnpm test`.

## Do not

- Expose every HTTP route as an MCP tool by default.
- Put domain rules inside adapters.
- Commit secrets; use `APP_API_KEY` / `APP_API_KEYS` env vars.
- Commit the Beads Dolt database (`.beads/embeddeddolt/`); it is gitignored.
- Edit `examples/tasks/*.snapshot.json` without regenerating via `pnpm snapshot:update`.
- Create parallel markdown TODO lists — use Beads.

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:970c3bf2 -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

Prefer `bin/work-items` for ready/next/close when available.

### Rules

- Use `bd` / `bin/work-items` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export when enabled.

## Agent Context Profiles

The managed Beads block is task-tracking guidance, not permission to override repository, user, or orchestrator instructions.

- **Conservative (default)**: Use `bd` for task tracking. Do not run git commits, git pushes, or Dolt remote sync unless explicitly asked. At handoff, report changed files, validation, and suggested next commands.
- **Team-maintainer / plow-ahead / land-and-closeout**: When the user authorizes autonomous delivery (e.g. plow ahead, merge-forward standing policy for complete verified work), agents may close beads, run quality gates, commit, push, open/merge PRs per repository policy.

## Session Completion

1. **File issues for remaining work** in Beads
2. **Run quality gates** if code changed (`pnpm test`, `pnpm typecheck`)
3. **Update issue status** — close finished work
4. **Git** per active authorization (commit/push/PR as authorized)
5. **Hand off** — summarize changes, validation, bead status

Explicit user or orchestrator instructions override this block.
<!-- END BEADS INTEGRATION -->
