# Architecture

## Idea

Define each capability once as an **operation** (id, Zod input/output, handler, metadata, surface config). A **registry** holds operations. Thin **adapters** expose the same handlers as:

1. **HTTP** (Hono) + emitted OpenAPI 3.1  
2. **CLI** (citty)  
3. **MCP** (stdio or Streamable HTTP)

Business rules live only in handlers. Adapters own validation presentation, auth extraction, and transport.

```text
                    packages/* domain ops
                            │
                     Registry.register
                            │
          ┌─────────────────┼─────────────────┐
          ▼                 ▼                 ▼
   adapters-http      adapters-cli      adapters-mcp
          │                 │                 │
       apps/*-api        apps/*-cli        apps/*-mcp
          │
     openapi emit  ←——  packages/openapi  ——→  openapi import
```

## Core concepts

| Concept | Package | Role |
|---|---|---|
| `OperationDef` | `@cli-mcp/core` | Contract + handler |
| `Registry` | `@cli-mcp/core` | Catalog of operations |
| `invokeOperation` | `@cli-mcp/core` | Shared validation + call path |
| `JsonFileMapStore` | `@cli-mcp/core` | Optional multi-process JSON persistence |
| `createHttpApp` | `@cli-mcp/adapters-http` | Hono routes from registry |
| `createCli` | `@cli-mcp/adapters-cli` | citty command tree |
| `createMcpServer` / `runMcpMain` | `@cli-mcp/adapters-mcp` | MCP stdio or Streamable HTTP |
| `emitOpenAPI` / `openApiToOperations` | `@cli-mcp/openapi` | Bidirectional OpenAPI bridge |
| `scaffoldProduct` | `@cli-mcp/scaffold` | New domain + three apps |

## Surface mapping

| Field | HTTP | CLI | MCP |
|---|---|---|---|
| `id` | `operationId` | command path | tool name (`a.b` → `a_b`) |
| `input` | path/query/body | positionals + flags | tool `inputSchema` |
| `meta.sideEffect` | method choice | normal | writes require explicit MCP enable |
| `meta.auth` | API key / bearer | env credentials | same as CLI |

## MCP curation

MCP is **not** “every HTTP route.” Only operations with `surfaces.mcp.enabled: true` become tools. Write tools require `agentDescription` so models get operator-facing guidance.

## Samples

- **tasks** (`packages/ops` + `apps/{api,cli,mcp}`) — full CRUD-ish sample; `tasks.complete` is HTTP/CLI only (MCP deliberately omitted).
- **notes** (`packages/notes` + `apps/notes-*`) — scaffolded product demonstrating the generator.

## Persistence

Stores default to **in-memory**. Set `TASKS_STORE_PATH` / `NOTES_STORE_PATH` / `<SLUG>_STORE_PATH` to a JSON file for multi-process demos. Implementation: `JsonFileMapStore` (atomic write, reload-on-op, last-writer-wins).

## Design docs

- Requirements: `docs/brainstorms/2026-08-11-cli-mcp-api-boilerplate-requirements.md`
- Design: `docs/plans/2026-08-11-cli-mcp-api-boilerplate-design.md`
- Implementation plan: `docs/plans/2026-08-11-feat-cli-mcp-api-boilerplate-plan.md`
