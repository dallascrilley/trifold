# cli-mcp-projects

**One Operation Registry → HTTP API + CLI + MCP server.**

TypeScript / pnpm monorepo boilerplate for internal tools and agent tooling. Define each operation once with Zod schemas and a handler; adapters mount it on three surfaces. OpenAPI 3.1 is **emitted** from the registry (not hand-authored).

```text
packages/ops  →  Registry  →  HTTP (Hono)
                           →  CLI  (citty)
                           →  MCP  (stdio)
                           →  OpenAPI 3.1
```

## Quick start

```bash
pnpm install
pnpm test
bin/orient                 # agent/human orientation
bin/work-items ready       # Beads backlog
pnpm scaffold -- notes     # new product domain + api/cli/mcp apps
```

### API

```bash
pnpm dev:api
# http://localhost:8787/healthz
# http://localhost:8787/openapi.json

curl -s http://localhost:8787/tasks
curl -s -X POST http://localhost:8787/tasks \
  -H 'content-type: application/json' \
  -H 'x-api-key: dev-key' \
  -d '{"title":"Ship boilerplate"}'
```

### CLI

```bash
export APP_API_KEY=dev-key
pnpm --filter @app/cli start -- tasks create "Ship boilerplate" --json
pnpm --filter @app/cli start -- tasks list --json
pnpm --filter @app/cli start -- tasks complete <id> --json
```

### MCP (stdio default, or Streamable HTTP)

```bash
export APP_API_KEY=dev-key
pnpm dev:mcp                          # stdio
pnpm --filter @app/mcp start -- --http   # Streamable HTTP on :8790/mcp
# MCP_TRANSPORT=http MCP_PORT=8790 pnpm --filter @app/mcp start
```

Example client config (stdio):

```json
{
  "mcpServers": {
    "tasks": {
      "command": "pnpm",
      "args": ["--filter", "@app/mcp", "start"],
      "cwd": "/path/to/cli-mcp-projects",
      "env": { "APP_API_KEY": "dev-key" }
    }
  }
}
```

HTTP mode: `POST http://127.0.0.1:8790/mcp` (Streamable HTTP). Health: `GET /healthz`.

MCP tools are **curated**. Sample exposes `tasks_list`, `tasks_get`, `tasks_create` — not `tasks_complete` (HTTP/CLI only).

## Operation IR (minimal)

```ts
registry.register({
  id: "tasks.create",
  summary: "Create a task",
  input: z.object({ title: z.string().min(1) }),
  output: TaskSchema,
  meta: { sideEffect: "write", auth: "apiKey" },
  surfaces: {
    http: { method: "post", path: "/tasks", successStatus: 201 },
    cli: { command: "tasks create", positional: ["title"] },
    mcp: {
      enabled: true,
      agentDescription: "Create a task with a title. New work items only.",
    },
  },
  handler: async (_ctx, input) => store.create(input),
});
```

### MCP rules

- Omit `surfaces.mcp` or set `enabled: false` → **not** a tool.
- Write ops with `enabled: true` **require** `agentDescription`.
- Snapshots: `examples/tasks/mcp-tools.snapshot.json`, `examples/tasks/openapi.snapshot.json`.
- Refresh: `pnpm snapshot:update`.

## Auth

| Surface | Mechanism |
|---|---|
| HTTP | `X-API-Key` or `Authorization: Bearer` |
| CLI / MCP | `APP_API_KEY` or `APP_TOKEN` / `APP_API_KEYS` |

Default accepted key when none configured **and** `NODE_ENV !== production`: `dev-key`.  
In production you must set `APP_API_KEY` or `APP_API_KEYS` or authenticated ops fail closed.

## Scaffold a product

```bash
pnpm scaffold -- <slug> [--title "Title"] [--dry-run]
# e.g. pnpm scaffold -- notes
pnpm install
pnpm --filter @cli-mcp/<slug> test
pnpm --filter @app/<slug>-api dev
APP_API_KEY=dev-key pnpm --filter @app/<slug>-cli start -- <slug> create "First" --json
```

Generates `packages/<slug>` (domain + sample list/get/create ops) and
`apps/<slug>-{api,cli,mcp}`. The repo includes a **`notes`** product produced this way.

## Layout

```text
apps/api|cli|mcp           tasks sample entrypoints
apps/<product>-{api,cli,mcp}  scaffolded products (e.g. notes-*)
packages/core              registry, context, errors, invoke, auth
packages/ops               sample tasks domain
packages/<product>         scaffolded domains (e.g. notes)
packages/scaffold          product file generator
packages/adapters-*        HTTP / CLI / MCP
packages/openapi           OpenAPI emitter
examples/tasks             golden snapshots
docs/                      requirements, design, plan
bin/orient                 orientation
bin/work-items             Beads adapter
```

## Scripts

| Command | Purpose |
|---|---|
| `pnpm test` | All package tests |
| `pnpm typecheck` | `tsc --noEmit` everywhere |
| `pnpm scaffold -- <slug>` | New domain + API/CLI/MCP apps |
| `pnpm dev:api` | Tasks HTTP server |
| `pnpm dev:cli` | Tasks CLI entry |
| `pnpm dev:mcp` | Tasks MCP stdio server |
| `pnpm snapshot:update` | Regenerate OpenAPI + MCP tool goldens |

## Docs

- Requirements: `docs/brainstorms/2026-08-11-cli-mcp-api-boilerplate-requirements.md`
- Design: `docs/plans/2026-08-11-cli-mcp-api-boilerplate-design.md`
- Implementation plan: `docs/plans/2026-08-11-feat-cli-mcp-api-boilerplate-plan.md`
