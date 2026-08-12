<p align="center">
  <img src="docs/assets/logo.svg" width="96" height="96" alt="Trifold logo"/>
</p>

<h1 align="center">Trifold</h1>

<p align="center">
  <strong>Define an operation once, ship it as an HTTP API, a CLI, and an MCP server.</strong><br/>
  <em>TypeScript Operation Registry → HTTP API · CLI · MCP</em>
</p>

<p align="center">
  <a href="https://github.com/dallascrilley/trifold/actions/workflows/ci.yml"><img src="https://github.com/dallascrilley/trifold/actions/workflows/ci.yml/badge.svg" alt="CI"/></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="MIT"/></a>
  <a href="./package.json"><img src="https://img.shields.io/badge/node-%3E%3D22-brightgreen" alt="Node 22+"/></a>
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-ready-7C3AED" alt="MCP"/></a>
  <a href="./docs/ARCHITECTURE.md"><img src="https://img.shields.io/badge/docs-architecture-0B0F14" alt="Architecture"/></a>
</p>

<p align="center">
  <a href="#quick-start">Quick start</a> ·
  <a href="#demo">Demo</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#included-samples">Samples</a> ·
  <a href="docs/demo.md">Deep dive</a> ·
  <a href="#contributing">Contributing</a>
</p>

---

### 30-second story

I kept writing the **same capability** three times, once for the API, once for a CLI, once for an agent MCP server, and the three copies drifted. **Trifold** makes the capability (an *operation*) the source of truth: Zod I/O, handler, auth, and side-effect metadata live in one definition. Thin adapters expose HTTP, CLI, and curated MCP tools. OpenAPI is emitted from the same registry, and can be imported back as stubs.

**Proof:** clone the repo, run `pnpm install && pnpm test`, create a task over CLI or `curl`, then list the MCP tools and see that they are deliberately not a 1:1 REST dump.

---

<p align="center">
  <img src="docs/assets/architecture.svg" alt="Architecture: domain ops feed a registry that fans out to HTTP, CLI, and MCP, with OpenAPI emit/import" width="100%"/>
</p>

---

## Demo

<p align="center">
  <img src="docs/assets/demo.gif" alt="Terminal demo: create task, list tasks, import OpenAPI stubs" width="100%"/>
</p>

Step-by-step commands: **[docs/demo.md](./docs/demo.md)**.

Regenerate the GIF (optional): `vhs docs/assets/demo.tape` from the repo root.

---

## Before / after

| Before (typical glue) | After (this boilerplate) |
|---|---|
| Hand-written CLI flags drift from REST handlers | One `registry.register(...)` drives CLI + HTTP |
| MCP wraps every OpenAPI path → tool spam | MCP is **opt-in** per operation; writes need agent copy |
| OpenAPI docs disagree with runtime | OpenAPI **emitted** from the live registry |
| New product = copy-paste three apps | `pnpm scaffold -- <slug>` generates domain + apps |

### Why not only X?

| Approach | Good for | Gap this fills |
|---|---|---|
| OpenAPI → MCP wrappers | Existing public APIs | Weak multi-surface authoring; naïve tool dumps |
| Runtime OpenAPI CLIs (e.g. Restish) | Ad-hoc exploration | Not an owned product monorepo with tests |
| tRPC / oRPC alone | App backends | MCP + first-class CLI still bolted on |

---

## Features

- **Single registration** → HTTP route, CLI command, optional MCP tool  
- **Zod** validation on every invoke path  
- **OpenAPI 3.1 emit** + **import** (JSON Schema → Zod subset)  
- **MCP curation** — explicit enable; writes need `agentDescription`  
- **Product scaffolder** — domain + API/CLI/MCP apps in one command  
- **Shared demo stores** — optional JSON files via `JsonFileMapStore`  
- **Production auth defaults** — no invented keys when `NODE_ENV=production`  
- **CI** — typecheck + test on every PR  

---

## Quick start

**Requirements:** Node.js 22+, [pnpm](https://pnpm.io) 11+

```bash
git clone https://github.com/dallascrilley/trifold.git
cd trifold
pnpm install
pnpm validate   # typecheck + test + secret-pattern scan
```

### Tasks sample (API + CLI)

```bash
export APP_API_KEY=dev-key                       # demo only
export TASKS_STORE_PATH=$PWD/.data/tasks.json    # one file shared by API + CLI

# terminal A (blocks)
pnpm dev:api
# → http://localhost:8787/healthz
# → http://localhost:8787/openapi.json

# terminal B — same two exports, then:
pnpm --filter @app/cli start -- tasks create "Ship demo" --json
pnpm --filter @app/cli start -- tasks list --json
```

`pnpm dev:api` runs in the foreground, so run the CLI commands in a second
terminal. A relative `TASKS_STORE_PATH` is resolved against the directory you
launched the command from (`INIT_CWD`), so the API and the CLI still share one
file under `pnpm --filter`; `$PWD` makes that explicit.

### MCP (agents)

```bash
export APP_API_KEY=dev-key
pnpm dev:mcp                 # stdio
pnpm dev:mcp:http            # Streamable HTTP → :8790/mcp
```

```json
{
  "mcpServers": {
    "tasks": {
      "command": "pnpm",
      "args": ["--filter", "@app/mcp", "start"],
      "cwd": "/absolute/path/to/trifold",
      "env": { "APP_API_KEY": "dev-key" }
    }
  }
}
```

---

## Included samples

| Sample | Packages / apps | Highlights |
|---|---|---|
| **tasks** | `packages/ops`, `apps/{api,cli,mcp}` | Full sample; `tasks.complete` is HTTP/CLI only (MCP omitted on purpose) |
| **notes** | `packages/notes`, `apps/notes-*` | Generated via scaffolder; file store with `NOTES_STORE_PATH` |

```bash
# notes product
export APP_API_KEY=dev-key
export NOTES_STORE_PATH=$PWD/.data/notes.json
pnpm --filter @app/notes-cli start -- notes create "Hello" --json
pnpm --filter @app/notes-cli start -- notes list --json
```

---

## Define an operation

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

| Rule | Behavior |
|---|---|
| Omit `surfaces.mcp` / `enabled: false` | Not a tool |
| Write + MCP enabled | Requires `agentDescription` |
| Snapshots | `examples/tasks/*` — refresh with `pnpm snapshot:update` |

---

## Scaffold a product

```bash
pnpm scaffold -- inventory --title "Inventory"
pnpm install
pnpm --filter @trifold/inventory test
export APP_API_KEY=dev-key
export INVENTORY_STORE_PATH=$PWD/.data/inventory.json
pnpm --filter @app/inventory-cli start -- inventory create "Widget" --json
```

---

## Import OpenAPI → stubs

```bash
pnpm openapi:import -- examples/tasks/openapi.snapshot.json
pnpm openapi:import -- examples/tasks/openapi.snapshot.json --skeleton > handlers.stub.ts
```

Swap `examples/tasks/openapi.snapshot.json` for your own `<openapi-file>`. A
missing file exits `1` with a one-line error. `handlers.stub.ts` is gitignored.

Stubs get HTTP/CLI surfaces and Zod inputs from JSON Schema. Handlers start as `NOT_IMPLEMENTED`. MCP stays off unless `--mcp`.

---

## Architecture

```text
  packages/* (domain ops)     packages/scaffold
           │                         │
           ▼                         ▼
    Operation Registry  ◄── register / generate
           │
     ┌─────┼──────┐
     ▼     ▼      ▼
   HTTP   CLI    MCP
   Hono  citty  stdio/HTTP
     │
     └── OpenAPI emit / import
```

| Package | Responsibility |
|---|---|
| `@trifold/core` | IR, registry, invoke, auth, `JsonFileMapStore` |
| `@trifold/adapters-http` | Hono app from registry |
| `@trifold/adapters-cli` | citty CLI from registry |
| `@trifold/adapters-mcp` | MCP stdio / Streamable HTTP |
| `@trifold/openapi` | OpenAPI emit + import |
| `@trifold/scaffold` | Product generator |

Deep dive: **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** · walkthrough: **[docs/demo.md](./docs/demo.md)**

---

## Auth

| Surface | Mechanism |
|---|---|
| HTTP | `X-API-Key` or `Authorization: Bearer` |
| CLI / MCP | `APP_API_KEY` / `APP_TOKEN` / `APP_API_KEYS` |

- Every authenticated call must **present** a key — the HTTP header above, or
  `APP_API_KEY` / `APP_TOKEN` for CLI and MCP. Presenting none is `401 UNAUTHORIZED`.
- Outside production, when no `APP_API_KEY` / `APP_API_KEYS` is configured, the
  literal `dev-key` is *accepted* so the samples work — it is an accepted value,
  not an applied default.
- **`NODE_ENV=production`:** fail closed — no accepted key unless you configure one.
- See [`.env.example`](./.env.example).

---

## Scripts

| Command | Purpose |
|---|---|
| `pnpm validate` | Typecheck + test + secret-pattern scan |
| `pnpm test` / `pnpm typecheck` | Quality gates |
| `pnpm scaffold -- <slug>` | New domain + apps |
| `pnpm openapi:import -- <file>` | OpenAPI → stubs |
| `pnpm dev:api` / `dev:cli` / `dev:mcp` | Tasks sample |
| `pnpm dev:mcp:http` | MCP Streamable HTTP |
| `pnpm snapshot:update` | Refresh tasks goldens |

---

## Project status

Working **boilerplate** (not a hosted SaaS). Samples use in-memory or local JSON stores.
Packages live under the `@trifold/*` scope. Clone, install, and run the quick start above.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md), [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md), and [SECURITY.md](./SECURITY.md).

---

## License

[MIT](./LICENSE) © Dallas Crilley
