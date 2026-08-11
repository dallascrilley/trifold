# cli-mcp-projects

[![CI](https://github.com/dallascrilley/cli-mcp-projects/actions/workflows/ci.yml/badge.svg)](https://github.com/dallascrilley/cli-mcp-projects/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](./package.json)

**Define once. Ship three surfaces.**

A TypeScript / pnpm monorepo boilerplate where a single **Operation Registry** (Zod-validated handlers) drives:

| Surface | Stack | Role |
|---|---|---|
| **HTTP API** | Hono | Machines, webhooks, local services |
| **CLI** | citty | Humans and scripts |
| **MCP server** | Official MCP SDK | Agents (stdio or Streamable HTTP) |

OpenAPI 3.1 is **emitted** from the same registry (and can be **imported** back as stubs). MCP tools are **curated** — not a naïve dump of every HTTP route.

---

## Why this exists

Teams keep reinventing the same glue:

- Hand-written CLIs that drift from the API  
- MCP servers that mirror REST 1:1 and overwhelm models  
- OpenAPI docs that disagree with runtime behavior  

This boilerplate treats **operations** as the source of truth: types, validation, auth metadata, and side-effect class live with the handler. Adapters only handle transport.

**Compared to common alternatives**

| Approach | Good for | Gap this fills |
|---|---|---|
| OpenAPI → MCP wrappers | Existing public APIs | Weak multi-surface authoring; tool spam |
| Runtime OpenAPI CLIs | Ad-hoc API ops | Not a product you own end-to-end |
| tRPC / oRPC alone | App backends | MCP + first-class CLI still bolted on |

---

## Features

- **Single registration** → HTTP route, CLI command, optional MCP tool  
- **Zod** input/output validation on every invoke path  
- **OpenAPI 3.1 emit** + **import** (JSON Schema → Zod subset)  
- **MCP curation** — explicit enable; writes need agent-facing descriptions  
- **Product scaffolder** — `pnpm scaffold -- <slug>` generates domain + three apps  
- **Shared demo stores** — optional JSON files for multi-process CLI/API (`JsonFileMapStore`)  
- **Production auth defaults** — no invented keys when `NODE_ENV=production`  
- **CI** — typecheck + test on every PR  

---

## Quick start

**Requirements:** Node.js 22+, [pnpm](https://pnpm.io) 11+

```bash
git clone https://github.com/dallascrilley/cli-mcp-projects.git
cd cli-mcp-projects
pnpm install
pnpm test
```

### Try the tasks sample

```bash
# optional: share state across processes
export TASKS_STORE_PATH=.data/tasks.json
export APP_API_KEY=dev-key   # demo only — see Auth

# terminal 1
pnpm dev:api
# http://localhost:8787/healthz
# http://localhost:8787/openapi.json

# terminal 2
pnpm --filter @app/cli start -- tasks create "Ship demo" --json
pnpm --filter @app/cli start -- tasks list --json
```

### MCP (agents)

```bash
export APP_API_KEY=dev-key
pnpm dev:mcp                 # stdio (default)
pnpm dev:mcp:http            # Streamable HTTP → http://127.0.0.1:8790/mcp
```

Example stdio client config:

```json
{
  "mcpServers": {
    "tasks": {
      "command": "pnpm",
      "args": ["--filter", "@app/mcp", "start"],
      "cwd": "/absolute/path/to/cli-mcp-projects",
      "env": { "APP_API_KEY": "dev-key" }
    }
  }
}
```

The tasks sample exposes `tasks_list`, `tasks_get`, and `tasks_create` over MCP — **not** `tasks_complete` (HTTP/CLI only), demonstrating curation.

---

## Define an operation

```ts
import { z } from "zod";

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
      agentDescription:
        "Create a task with a title. Use only for new work items.",
    },
  },
  handler: async (_ctx, input) => store.create(input),
});
```

### MCP rules

| Rule | Behavior |
|---|---|
| Omit `surfaces.mcp` / `enabled: false` | Not a tool |
| Write + MCP enabled | Requires `agentDescription` |
| Snapshots | `examples/tasks/*` — update with `pnpm snapshot:update` |

---

## Scaffold a product

```bash
pnpm scaffold -- inventory --title "Inventory"
pnpm install
pnpm --filter @cli-mcp/inventory test
export APP_API_KEY=dev-key
export INVENTORY_STORE_PATH=.data/inventory.json
pnpm --filter @app/inventory-cli start -- inventory create "Widget" --json
```

Generates `packages/<slug>` plus `apps/<slug>-{api,cli,mcp}` with file-store wiring.

The repo includes a **notes** product produced this way.

---

## Import OpenAPI → stubs

```bash
pnpm openapi:import -- examples/tasks/openapi.snapshot.json
pnpm openapi:import -- ./openapi.json --skeleton > handlers.stub.ts
```

Imports produce `OperationDef` stubs (HTTP + CLI surfaces). Handlers start as `NOT_IMPLEMENTED` until you implement them. Request/response JSON Schemas map to Zod (subset). MCP stays off unless `--mcp`.

---

## Architecture

```text
  packages/* (ops)          packages/scaffold
        │                          │
        ▼                          ▼
   Operation Registry ◄──── register / generate
        │
        ├──────────────┬──────────────┐
        ▼              ▼              ▼
     HTTP API         CLI           MCP
     (Hono)         (citty)     (stdio / HTTP)
        │
        └──► OpenAPI emit / import  (@cli-mcp/openapi)
```

Deeper write-up: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

| Package | Responsibility |
|---|---|
| `@cli-mcp/core` | IR, registry, invoke, auth, `JsonFileMapStore` |
| `@cli-mcp/adapters-http` | Hono app from registry |
| `@cli-mcp/adapters-cli` | citty CLI from registry |
| `@cli-mcp/adapters-mcp` | MCP server (stdio / Streamable HTTP) |
| `@cli-mcp/openapi` | OpenAPI emit + import |
| `@cli-mcp/scaffold` | Product generator |
| `@cli-mcp/ops` / `@cli-mcp/notes` | Sample domains |

---

## Auth

| Surface | Mechanism |
|---|---|
| HTTP | `X-API-Key` or `Authorization: Bearer` |
| CLI / MCP | `APP_API_KEY`, `APP_TOKEN`, or `APP_API_KEYS` |

- Demo default (non-production): `dev-key` when no keys are configured.  
- **`NODE_ENV=production`:** missing keys fail closed — no invented credentials.  
- See [`.env.example`](./.env.example).

---

## Scripts

| Command | Purpose |
|---|---|
| `pnpm test` | All package tests |
| `pnpm typecheck` | TypeScript across the workspace |
| `pnpm validate` | Typecheck + test + heuristic secret scan |
| `pnpm scaffold -- <slug>` | New domain + apps |
| `pnpm openapi:import -- <file>` | OpenAPI → operation stubs |
| `pnpm dev:api` / `dev:cli` / `dev:mcp` | Tasks sample runtimes |
| `pnpm dev:mcp:http` | MCP Streamable HTTP |
| `pnpm snapshot:update` | Refresh tasks OpenAPI + MCP goldens |

---

## Project status

This is a **working boilerplate**, not a hosted SaaS. Samples use in-memory or optional local JSON stores. See [STATUS.md](./STATUS.md) for a compact project pointer.

Design history lives under `docs/brainstorms/` and `docs/plans/`.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Please read [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) and [SECURITY.md](./SECURITY.md).

Publishing / hygiene process for repos like this: [docs/runbooks/public-repo-release-sop.md](./docs/runbooks/public-repo-release-sop.md).

---

## License

[MIT](./LICENSE) © Dallas Crilley
