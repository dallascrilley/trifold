---
date: 2026-08-11
topic: cli-mcp-api-boilerplate
status: approved-planning-complete
requirements: docs/internal/brainstorms/2026-08-11-cli-mcp-api-boilerplate-requirements.md
---

# Design: single-schema CLI + MCP + API boilerplate

## Intent

Ship a **standard TypeScript monorepo boilerplate** for internal tools and agent tooling. One **Operation Registry** (Zod-validated) is the source of truth. Three adapters produce:

1. **HTTP API** (machine clients, local services)
2. **CLI** (humans + scripts)
3. **MCP server** (agents)

OpenAPI 3.1 is **generated** from the registry for documentation and external interop. It is not the authoring format in v1.

## Locked product decisions

| Topic | Decision |
|---|---|
| Authoring | TS + Zod registry |
| Primary audience | Internal tools / agent tooling |
| Stack | TypeScript, pnpm monorepo, Node LTS |
| OpenAPI | Emit only |
| MCP default | Curated; writes opt-in |

## Architecture

```text
                    ┌─────────────────────┐
                    │  packages/ops       │
                    │  Operation defs +   │
                    │  handlers           │
                    └──────────┬──────────┘
                               │ register()
                    ┌──────────▼──────────┐
                    │  packages/core      │
                    │  Registry, Context, │
                    │  errors, IR types   │
                    └──────────┬──────────┘
           ┌───────────────────┼───────────────────┐
           ▼                   ▼                   ▼
    packages/adapters   packages/adapters   packages/adapters
         /http               /cli                /mcp
           │                   │                   │
           ▼                   ▼                   ▼
        apps/api            apps/cli            apps/mcp
           │
           ▼
    packages/openapi  →  openapi.json (build or boot)
```

### Core principle

**Handlers own behavior. Adapters own transport and presentation.**  
No business rule may live only in the CLI, only in MCP, or only in HTTP.

### Operation IR (conceptual)

```ts
type SideEffect = "read" | "write" | "idempotent-write"

type OperationDef<I, O> = {
  id: string                      // stable dotted id: "tasks.create"
  summary: string
  description?: string
  input: ZodType<I>
  output: ZodType<O>
  meta: {
    sideEffect: SideEffect
    auth?: "none" | "apiKey" | "bearer"
    tags?: string[]
  }
  surfaces: {
    http?: {
      method: "get" | "post" | "put" | "patch" | "delete"
      path: string                // "/tasks" | "/tasks/{id}"
      successStatus?: number
    }
    cli?: {
      command: string             // "tasks create"
      positional?: string[]       // input keys as positionals
      hidden?: boolean
    }
    mcp?: {
      enabled: boolean            // writes default false unless set true
      toolName?: string           // default: id with dots → underscores
      agentDescription?: string   // model-facing; required if enabled
      scopes?: string[]
    }
  }
  handler: (ctx: RequestContext, input: I) => Promise<O>
}
```

### RequestContext (shared)

```ts
type RequestContext = {
  surface: "http" | "cli" | "mcp"
  requestId: string
  actor?: { id: string; kind: "user" | "service" | "agent" }
  auth?: { type: string; tokenRef?: string }  // never log raw secrets
  signal: AbortSignal
  logger: Logger
}
```

### Surface mapping rules

| IR field | HTTP | CLI | MCP |
|---|---|---|---|
| `id` | `operationId` | help / telemetry | tool name base |
| `input` | path/query/body per `surfaces.http` | positionals + flags | JSON Schema from Zod |
| `output` | JSON body | `--format json\|table\|text` | structuredContent + short text |
| `sideEffect: read` | prefer GET | normal | `enabled` default **true** if `mcp` block present |
| `sideEffect: write` | POST/PATCH/DELETE | optional `--yes` | **requires** `mcp.enabled: true` |
| errors | status + problem body | stderr + exit code | `isError` / MCP error |

### MCP policy (non-negotiable for v1)

1. No automatic “every HTTP route is a tool.”
2. Write tools require explicit `surfaces.mcp.enabled: true` and `agentDescription`.
3. CI snapshot of `tools/list` names; unexpected tools fail the build.
4. Prefer fewer, higher-level tools for agents even if HTTP exposes finer routes (v1 may 1:1 with enable flags; higher-level compose ops are a later pattern).

## Package layout

```text
apps/
  api/                 # HTTP server entry
  cli/                 # bin: package.json bin field
  mcp/                 # stdio MCP entry
packages/
  core/                # IR types, Registry, context, error helpers
  ops/                 # product operations (or examples only in template)
  adapters-http/
  adapters-cli/
  adapters-mcp/
  openapi/             # registry → OpenAPI 3.1 document
examples/
  tasks/               # complete sample: list/create/get tasks
docs/
  brainstorms/         # requirements (this initiative)
  plans/               # this design + future implementation plan
```

Template-only note: in the pure boilerplate, `packages/ops` may re-export `examples/tasks` so the monorepo runs out of the box.

## Runtime choices (plan-time pick)

**HTTP (choose one in implementation plan):**

| Option | Why consider |
|---|---|
| **oRPC** | End-to-end types + first-class OpenAPI; contract-first optional |
| **Hono + zod-openapi** | Minimal, explicit REST, excellent DX for small tools |

**Recommendation lean:** Hono + `@hono/zod-openapi` for a boilerplate that teaches clear HTTP mapping; oRPC if dual RPC+REST clients matter immediately.

**CLI:** citty (modern, typed) or commander (ubiquitous). Prefer **citty** for greenfield unless commander familiarity is required.

**MCP:** `@modelcontextprotocol/sdk` only; stdio transport first.

**Schema:** Zod (align version with monorepo peer range at implement time).

**Build:** `tsup` or `tsdown` for app bins; `tsc` project references optional.

## Adapter responsibilities

### HTTP

- Walk registry ops with `surfaces.http`
- Bind path params / query / body from Zod object shape conventions:
  - keys listed in path as `{param}` → path
  - GET → remaining keys as query
  - write methods → JSON body (unless annotated later)
- Map thrown `AppError` → status + JSON
- Serve `GET /openapi.json` and optional Scalar/Swagger UI in dev
- Health: `GET /healthz`

### CLI

- Build command tree from `surfaces.cli.command` (space-separated)
- Positionals from config; other input keys → flags (`--kebab-case`)
- Global flags: `--format`, `--profile`, `--verbose`, `--json` alias
- Exit codes: `0` ok, `1` domain/validation, `2` usage, `130` signal
- Never print secrets; config via env `APP_*` + optional profile file

### MCP

- Register only ops where `surfaces.mcp?.enabled === true` (and reads may default enable if `mcp` block exists — finalize in plan)
- Tool description = `agentDescription ?? description ?? summary`
- Validate input with Zod; return structured output
- Propagate `RequestContext.surface = "mcp"`
- Config: env-based auth same as CLI

### OpenAPI emitter

- Build paths from `surfaces.http`
- `operationId` = `id` (or stable transform)
- Schemas from Zod → JSON Schema (zod-to-json-schema or equivalent)
- Security schemes from `meta.auth`
- Snapshot test committed under `examples/tasks/openapi.snapshot.json`

## Auth (v1 minimal)

| Surface | Mechanism |
|---|---|
| HTTP | `Authorization: Bearer <token>` or `X-API-Key` |
| CLI | env `APP_API_KEY` / `APP_TOKEN` or profile |
| MCP | same env as CLI (server process env) |

Handlers receive resolved `ctx.actor` after adapter middleware. Unauthenticated ops declare `meta.auth: "none"`.

No OAuth server in v1.

## Testing

| Layer | What |
|---|---|
| Unit | Handler pure logic with fake ctx |
| Schema | Invalid inputs rejected identically across adapters |
| HTTP | supertest / app.request |
| CLI | spawn bin or invoke run(argv) |
| MCP | in-process Server transport test harness |
| Snapshots | OpenAPI doc + MCP tool names |

Proof bar for “boilerplate works”: `examples/tasks` green on all layers in CI.

## Example operation (illustrative)

```ts
register({
  id: "tasks.create",
  summary: "Create a task",
  input: z.object({ title: z.string().min(1), due: z.string().date().optional() }),
  output: z.object({ id: z.string(), title: z.string(), due: z.string().optional() }),
  meta: { sideEffect: "write", auth: "apiKey", tags: ["tasks"] },
  surfaces: {
    http: { method: "post", path: "/tasks", successStatus: 201 },
    cli: { command: "tasks create", positional: ["title"] },
    mcp: {
      enabled: true,
      agentDescription:
        "Create a task with a title and optional due date (YYYY-MM-DD). Use for new work items only.",
    },
  },
  handler: async (ctx, input) => store.create(input),
})
```

## Delivery phases (for later plan units)

1. **Core IR + registry + context + errors**
2. **Sample ops (tasks) with in-memory store**
3. **HTTP adapter + OpenAPI emit**
4. **CLI adapter**
5. **MCP adapter + curation defaults**
6. **CI snapshots, README, dev scripts**
7. **(Optional) template packaging / create script**

## Risks

| Risk | Mitigation |
|---|---|
| Framework sprawl | Keep `core` tiny; adapters swappable |
| Zod↔JSON Schema fidelity | Pin converter; snapshot schemas |
| MCP over-exposure | Defaults + CI tool-list gate |
| HTTP path/query inference wrong | Explicit conventions + tests per sample op |
| Monorepo friction | Minimal packages; no premature publish |

## Explicit non-goals (v1)

- Generating Python/Go servers
- TypeSpec or OpenAPI as authoring input
- Hosted multi-tenant MCP
- GraphQL
- Full OAuth product

## Approval gate

This design is ready for **implementation planning** once approved.

Remaining plan-time choices only:

1. Hono vs oRPC  
2. citty vs commander  
3. Exact MCP default for read-only ops when `surfaces.mcp` is omitted  

No application code should land until those are decided in the plan (or defaults accepted: **Hono + citty + omit means not an MCP tool**).
