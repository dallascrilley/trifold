---
date: 2026-08-11
topic: cli-mcp-api-boilerplate
origin: session research + design (greenfield cli-mcp-projects)
---

# CLI + MCP + API boilerplate: requirements

**Summary:** Standard TypeScript monorepo boilerplate where a single Zod-backed Operation Registry is the source of truth and produces three runtimes — HTTP API, CLI, and MCP server — optimized for internal tools and agent tooling, with OpenAPI emitted (not authored).

## Requirements

- R1. A developer defines each operation once (id, Zod input/output, handler, meta, surface config) and does not reimplement business logic per surface.
- R2. The same registry boots an HTTP API, a CLI binary, and an MCP server without hand-written per-operation adapter glue beyond surface metadata.
- R3. OpenAPI 3.1 is generated from the registry for docs, contract tests, and external consumers; OpenAPI is not the authoring surface in v1.
- R4. MCP exposure is curated: write/side-effect tools are opt-in; agent-oriented descriptions are first-class; tool dump of every HTTP route is forbidden by default.
- R5. Shared request context (auth actor, request id, abort signal, logger, surface tag) is available to every handler regardless of surface.
- R6. A sample domain (`examples/tasks` or equivalent) proves all three surfaces against one in-memory store with automated tests.
- R7. Cold-start path: clone → install → run API, CLI, and MCP against the sample with documented commands.
- R8. Adding a new operation requires only a registry registration (plus optional surface overrides); CI detects drift via OpenAPI and MCP tool-list snapshots.
- R9. Stack is TypeScript, pnpm monorepo, Node LTS; package manager is pnpm.

## Scope boundaries

**In:**
- Operation IR + registry
- HTTP adapter (Hono or oRPC)
- CLI adapter (citty or commander)
- MCP adapter (official TS SDK; stdio first)
- OpenAPI emitter from registry
- Auth/context plumbing (API key / bearer / env profiles for CLI+MCP)
- Sample domain, tests, README, scaffold conventions
- Surface metadata for http / cli / mcp

**Out (v1):**
- Multi-language server implementations
- GraphQL, gRPC
- Hosted MCP control plane
- Multi-language SDK generation (Speakeasy-class)
- Runtime OpenAPI→CLI without shipping our CLI (Restish remains optional external consumer of exported OpenAPI)
- OAuth/OIDC full product (document extension point only)
- TypeSpec authoring

**Deferred:**
- OpenAPI *import* into the registry (hybrid path)
- MCP resources and prompts (tools first)
- SSE/HTTP MCP transport beyond stdio
- Cookiecutter / `create-*` scaffolding CLI
- Plugin system for third-party adapters

## Key decisions

| Decision | Choice | Rationale |
|---|---|---|
| Schema authoring | TS + Zod Operation Registry | Best DX; zero dual-schema drift; Standard Schema friendly |
| Product focus | Internal tools / agent tooling | MCP curation and CLI ergonomics over public REST purity |
| Runtime | TS / pnpm monorepo | Ecosystem fit for MCP SDK, Hono/oRPC, Zod |
| OpenAPI role | Emitted artifact | Interop without making HTTP the king surface |
| MCP policy | Opt-in for writes; curated tools | Avoid naïve OpenAPI→tool dumps (Stainless/Neon lesson) |
| Handlers | Shared once | Adapters are pure presentation/transport |

## Prior art applied

- **Restish:** CLI mapping rules (operationId→command, path→args, query→flags); same source can feed MCP; surface extensions without forking the domain contract.
- **Speakeasy / Stainless:** MCP quality needs pruning, agent descriptions, and scopes — not 1:1 endpoint exposure.
- **tRPC-cli + trpc-to-mcp / oRPC:** Prove code-first routers can fan out to CLI, HTTP, and MCP; we take the pattern, not necessarily those exact packages.
- **TypeSpec MCP emitters:** Validate “IDL → handler stubs + protocol glue” model; we keep glue thin and author in TS for v1.
- **Empirical MCP studies:** Most production MCP tools are bare API consumption; design for intentional toolsets, not automatic dump.

## Open questions

- **Resolved in plan:** HTTP = Hono (registry-driven routes + separate OpenAPI emitter). CLI = citty. MCP omit = not a tool. Errors = `AppError` JSON. CLI formats = json|table|text. Packages private (no publish v1).
- **Deferred:** Whether monorepo later publishes `@trifold/*` packages.

## Success criteria

1. Register one operation → appears on HTTP route, CLI help, and (if enabled) MCP `tools/list` without further glue.
2. Sample domain tests green for handler + three adapters.
3. OpenAPI snapshot and MCP tool-list snapshot enforced in CI.
4. README documents Operation IR, MCP enablement rule, and run commands for all three surfaces.

## Handoff

- **Plan it** — produce `docs/internal/plans/` implementation units from these R-numbers.
- **Iterate here** — adjust requirements before planning.
- **Done for now** — design parked; no code yet.
