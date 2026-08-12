# Agent notes — cli-mcp-projects

## Orientation

Single-schema boilerplate: **Operation Registry** (Zod) → HTTP + CLI + MCP.

- Requirements: `docs/brainstorms/2026-08-11-cli-mcp-api-boilerplate-requirements.md`
- Design: `docs/plans/2026-08-11-cli-mcp-api-boilerplate-design.md`
- Plan: `docs/plans/2026-08-11-feat-cli-mcp-api-boilerplate-plan.md`

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

## Adding an operation

1. Define Zod input/output and handler in `packages/ops` (or a new ops package).
2. Call `registry.register({...})` with `surfaces.http` / `cli` / `mcp` as needed.
3. MCP: set `surfaces.mcp.enabled: true` only for intentional tools. Writes require `agentDescription`.
4. Update snapshots if HTTP or MCP surface set changes:
   ```bash
   pnpm snapshot:update
   ```
5. Run `pnpm test`.

## Do not

- Expose every HTTP route as an MCP tool by default.
- Put domain rules inside adapters.
- Commit secrets; use `APP_API_KEY` / `APP_API_KEYS` env vars.
- Edit `examples/tasks/*.snapshot.json` without regenerating via `pnpm snapshot:update`.
