---
date: 2026-08-11
origin: docs/brainstorms/2026-08-11-cli-mcp-api-boilerplate-requirements.md
design: docs/plans/2026-08-11-cli-mcp-api-boilerplate-design.md
td_epic: null
status: ready
---

# Feat: CLI + MCP + API boilerplate from Operation Registry

**Summary:** Scaffold a pnpm TypeScript monorepo where a Zod-backed Operation Registry is the single source of truth; HTTP (Hono), CLI (citty), and MCP (stdio) adapters mount the same handlers; OpenAPI 3.1 is emitted; a `tasks` sample proves all three surfaces with snapshots and tests.

Living document. Update Progress, Surprises, Decision Log, and Outcomes as work proceeds. Reader needs only this plan + the working tree.

## Purpose / Big Picture

After this work, a developer clones the repo, runs `pnpm install`, and can:

1. Define an operation once in `packages/ops` (or `examples/tasks`).
2. Hit it over HTTP (`pnpm --filter @app/api dev`).
3. Invoke it from the CLI (`pnpm --filter @app/cli start -- tasks list`).
4. Expose selected tools over MCP stdio (`pnpm --filter @app/mcp start`).
5. Fetch `GET /openapi.json` generated from the registry.
6. Rely on CI to fail if OpenAPI or MCP tool lists drift without intentional snapshot updates.

## Progress

- [x] (2026-08-11) Requirements and design approved; plan authored.
- [x] (2026-08-11) U1 Monorepo skeleton
- [x] (2026-08-11) U2 Core IR + registry + context + errors
- [x] (2026-08-11) U3 Tasks sample domain (handlers + store)
- [x] (2026-08-11) U4 HTTP adapter + app
- [x] (2026-08-11) U5 OpenAPI emitter + snapshot
- [x] (2026-08-11) U6 CLI adapter + app
- [x] (2026-08-11) U7 MCP adapter + app + curation rules
- [x] (2026-08-11) U8 Auth middleware (all surfaces)
- [x] (2026-08-11) U9 Root scripts, CI, README, AGENTS.md
- [x] (2026-08-11) U10 End-to-end smoke proof (`packages/smoke`)

## Surprises & Discoveries

- Observation: repo was empty at plan time (git only). Evidence: root listing had only `.git` and docs written in design session.
- Observation: no `docs/solutions/` or worktree posture tooling in-repo. Evidence: probe commands returned empty.

## Decision Log

- Decision: **Hono + manual OpenAPI emit** (not oRPC, not `@hono/zod-openapi` as SoT). Rationale: HTTP routes are derived from the registry; a separate `packages/openapi` keeps OpenAPI generation symmetric with CLI/MCP and avoids dual route definitions. Hono stays a thin transport. Date/Author: 2026-08-11 / plan.
- Decision: **citty** for CLI. Rationale: greenfield, typed command trees, low weight; registry walker builds command config. Date/Author: 2026-08-11 / plan.
- Decision: **MCP omit = not a tool.** Only `surfaces.mcp.enabled === true` registers a tool. Writes still require `agentDescription`. Rationale: strongest curation default for agent tooling. Date/Author: 2026-08-11 / plan.
- Decision: **Error model** = `AppError { code, message, status, details? }` JSON body `{ error: { code, message, details? } }`. Not full RFC 7807 in v1. Rationale: enough for three surfaces; simple to map to CLI exit and MCP isError. Date/Author: 2026-08-11 / plan.
- Decision: **CLI formats** = `json` (default for scripts via `--json` or non-TTY), `table`, `text`. Global `--format`. Date/Author: 2026-08-11 / plan.
- Decision: **No package publish** in v1; private workspace packages only. Template lives in this repo. Date/Author: 2026-08-11 / plan.
- Decision: **Zod 3.x** pin initially for converter ecosystem stability (`zod-to-json-schema`); upgrade path noted if Zod 4 is preferred later. Date/Author: 2026-08-11 / plan.
- Decision: **Vitest** + Node 22+. Date/Author: 2026-08-11 / plan.
- Decision: **Package names** under `@trifold/*` for libs and `@app/*` for apps. Date/Author: 2026-08-11 / plan.

## Outcomes & Retrospective

Implemented v1 boilerplate on `feat/cli-mcp-api-boilerplate`. Proof: `pnpm typecheck` and `pnpm test` green (28 unit/integration tests + smoke). Smoke package holds e2e to avoid workspace cycles. MCP curation proven: `tasks.complete` on HTTP/CLI only.

## Requirements

From `docs/brainstorms/2026-08-11-cli-mcp-api-boilerplate-requirements.md`:

- R1. Define each operation once; no per-surface business logic.
- R2. Same registry boots HTTP, CLI, MCP without per-op adapter glue beyond surface metadata.
- R3. OpenAPI 3.1 generated from registry.
- R4. MCP curated; writes opt-in; no automatic route dump.
- R5. Shared RequestContext on every handler.
- R6. Sample domain proves all three surfaces with tests.
- R7. Cold-start documented and works.
- R8. New op = registration only; CI snapshots for OpenAPI + MCP tools.
- R9. TypeScript, pnpm monorepo, Node LTS.

## Key technical decisions

| Topic | Choice | Why |
|---|---|---|
| HTTP | Hono | Thin router; registry owns contracts |
| OpenAPI | `packages/openapi` from registry | Single emit path; not dual-written with Hono OpenAPI helpers as SoT |
| CLI | citty | Modern, composable command trees |
| MCP | `@modelcontextprotocol/sdk` stdio | Official, minimal |
| Schema | Zod 3 + zod-to-json-schema | Stable JSON Schema for OpenAPI + MCP |
| Test | Vitest | Fast, TS-native |
| Build | tsup for app entrypoints; tsx for dev | Simple bins |
| Layout | apps/* + packages/* | Clear runtime vs library boundary |

## Context and Orientation

- **Empty greenfield** monorepo named `cli-mcp-projects`.
- Design reference: `docs/plans/2026-08-11-cli-mcp-api-boilerplate-design.md`.
- Terms:
  - **Operation** — unit of work with id, schemas, handler, surface metadata.
  - **Registry** — map of operation id → definition; adapters iterate it.
  - **Adapter** — transport binding (HTTP route, CLI command, MCP tool).
  - **Surface** — `http` | `cli` | `mcp`.

Target tree after implementation:

```text
package.json
pnpm-workspace.yaml
tsconfig.base.json
.npmrc
.gitignore
README.md
AGENTS.md
.github/workflows/ci.yml
apps/
  api/package.json
  api/src/index.ts
  cli/package.json
  cli/src/index.ts
  mcp/package.json
  mcp/src/index.ts
packages/
  core/package.json
  core/src/index.ts
  core/src/types.ts
  core/src/registry.ts
  core/src/context.ts
  core/src/errors.ts
  core/src/invoke.ts
  ops/package.json
  ops/src/index.ts
  ops/src/tasks/*
  adapters-http/package.json
  adapters-http/src/index.ts
  adapters-cli/package.json
  adapters-cli/src/index.ts
  adapters-mcp/package.json
  adapters-mcp/src/index.ts
  openapi/package.json
  openapi/src/index.ts
examples/
  tasks/openapi.snapshot.json
  tasks/mcp-tools.snapshot.json
```

Note: sample operations live in `packages/ops` (runnable out of the box). Snapshot fixtures live under `examples/tasks/` as committed goldens.

## Plan of Work

Build bottom-up: monorepo → core → sample ops → HTTP → OpenAPI → CLI → MCP → auth → docs/CI → smoke. Each unit is independently testable and committable. Do not start a later adapter before the registry can `invoke(id, input, ctx)`.

## Implementation units

### U1. Monorepo skeleton

- **Goal:** pnpm workspace installs; TypeScript base config; empty package shells build; root scripts placeholders.
- **Requirements:** R9
- **Files:**
  - Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.npmrc`, `.gitignore`, `packages/*/package.json`, `apps/*/package.json`
- **Approach:**
  - Root `packageManager: pnpm@9` (or latest installed 9/10 — pin what `pnpm -v` reports at implement time).
  - Workspaces: `apps/*`, `packages/*`.
  - Each package: `"type": "module"`, `private: true`, name as decided.
  - `pnpm-workspace.yaml` includes both globs.
  - Shared `tsconfig.base.json`: `strict`, `moduleResolution: bundler`, `target: ES2022`, `module: ESNext`.
  - Root scripts: `build`, `test`, `typecheck`, `dev:api`, `dev:cli`, `dev:mcp` (wire fully in U9 if stubs first).
- **Tests:** `pnpm install` succeeds; `pnpm -r exec tsc --noEmit` with empty `src/index.ts` exports.
- **Verification:** `pnpm install && pnpm -r run typecheck` exit 0.

### U2. Core IR + registry + context + errors

- **Goal:** Type-safe operation definition, registry register/get/list, shared context factory, `AppError`, and `invokeOperation` that validates input/output with Zod.
- **Requirements:** R1, R5
- **Files:**
  - Create: `packages/core/src/types.ts`, `registry.ts`, `context.ts`, `errors.ts`, `invoke.ts`, `logger.ts`, `index.ts`
  - Create: `packages/core/src/*.test.ts`
- **Approach:**
  - Export `OperationDef`, `RequestContext`, `SideEffect`, surface config types matching design IR.
  - `Registry` class: `register(op)`, `get(id)`, `list()`, `listForSurface(surface)`.
  - `createContext(partial)` fills `requestId` (ulid or crypto.randomUUID), default logger, requires `surface` + `signal`.
  - `AppError` with `code`, `message`, `status` (default 400/500), optional `details`.
  - `invokeOperation(registry, id, rawInput, ctx)`: lookup → Zod parse input → handler → Zod parse output → return; map Zod errors to `AppError` code `VALIDATION_ERROR` status 400.
  - Package export map via `package.json` `exports`.
- **Tests:**
  - Register + get round-trip.
  - Invoke success path.
  - Invalid input throws `AppError` VALIDATION_ERROR.
  - Handler throw of `AppError` propagates; unknown throw becomes INTERNAL status 500.
  - `listForSurface('mcp')` only returns ops with mcp enabled (helper can live here or in MCP adapter — prefer core helper `isMcpEnabled(op)`).
- **Verification:** `pnpm --filter @trifold/core test`

### U3. Tasks sample domain

- **Goal:** In-memory task store and three operations proving read/write and multi-surface metadata.
- **Requirements:** R1, R6
- **Files:**
  - Create: `packages/ops/src/tasks/store.ts`, `schemas.ts`, `ops.ts`, `index.ts`
  - Create: `packages/ops/src/tasks/*.test.ts`
- **Approach:**
  - Store: Map-backed `{ id, title, done, due? }`; methods create/list/get/setDone.
  - Operations (minimum):
    | id | sideEffect | http | cli | mcp |
    |---|---|---|---|---|
    | `tasks.list` | read | GET `/tasks` | `tasks list` | enabled, agentDescription |
    | `tasks.get` | read | GET `/tasks/{id}` | `tasks get` positional id | enabled |
    | `tasks.create` | write | POST `/tasks` 201 | `tasks create` positional title | enabled + agentDescription |
    | `tasks.complete` | write | POST `/tasks/{id}/complete` | `tasks complete` | **mcp disabled** (prove curation) |
  - `meta.auth`: `none` for list/get in sample; `apiKey` for create/complete (auth enforced in U8; handlers may ignore until then).
  - Export `createTasksRegistry()` or `registerTasks(registry, store)` so tests inject fresh store.
- **Tests:**
  - create → list includes task; get by id; complete flips done.
  - get missing → AppError NOT_FOUND 404.
- **Verification:** `pnpm --filter @trifold/ops test`

### U4. HTTP adapter + API app

- **Goal:** Hono app mounts all ops with `surfaces.http`; health endpoint; invokes shared handlers.
- **Requirements:** R2, R5, R6
- **Files:**
  - Create: `packages/adapters-http/src/create-app.ts`, `bind-input.ts`, `map-error.ts`, `index.ts`
  - Create: `packages/adapters-http/src/*.test.ts`
  - Create: `apps/api/src/index.ts`, `apps/api/package.json` scripts
- **Approach:**
  - `createHttpApp(registry, options)` returns Hono instance.
  - For each op with `surfaces.http`: register method+path.
  - Input binding:
    - Path params from `{name}` segments.
    - GET/DELETE: merge path + query.
    - POST/PUT/PATCH: merge path + JSON body (empty body → `{}`).
  - Context: `surface: "http"`, requestId from header `x-request-id` or new UUID, AbortSignal from request.
  - Errors → JSON `{ error: { code, message, details? } }` + status.
  - `GET /healthz` → `{ ok: true }`.
  - `apps/api` constructs registry via ops, listens `PORT` default 8787.
- **Tests:**
  - `app.request('GET', '/healthz')` 200.
  - Create task via POST, list via GET, get by id.
  - Validation failure → 400 VALIDATION_ERROR.
  - complete + get reflects done.
- **Verification:** `pnpm --filter @trifold/adapters-http test` and `pnpm --filter @app/api typecheck`

### U5. OpenAPI emitter + snapshot

- **Goal:** Generate OpenAPI 3.1 document from registry HTTP surfaces; serve at `/openapi.json`; commit snapshot.
- **Requirements:** R3, R8
- **Files:**
  - Create: `packages/openapi/src/emit.ts`, `index.ts`, `emit.test.ts`
  - Create: `examples/tasks/openapi.snapshot.json`
  - Modify: `packages/adapters-http` to mount `GET /openapi.json`
- **Approach:**
  - Convert Zod schemas with `zod-to-json-schema` (target openApi3 / draft appropriate).
  - paths from `surfaces.http.path` + method; `operationId` = op.id.
  - summary/description from op fields.
  - components.securitySchemes for apiKey + bearer when any op needs them.
  - Deterministic JSON stringify (sorted keys) for stable snapshots.
  - Test compares emit(tasksRegistry) to snapshot; script `pnpm openapi:snapshot` to refresh intentionally.
- **Tests:**
  - Snapshot match for tasks registry.
  - Every op with http surface appears as a path operation.
  - `tasks.complete` present in OpenAPI even though MCP-disabled.
- **Verification:** `pnpm --filter @trifold/openapi test` and HTTP `GET /openapi.json` returns same document shape.

### U6. CLI adapter + CLI app

- **Goal:** citty command tree from registry; shared invoke; formatters; exit codes.
- **Requirements:** R2, R5, R6, R7
- **Files:**
  - Create: `packages/adapters-cli/src/create-cli.ts`, `format.ts`, `parse-args.ts`, `index.ts`, tests
  - Create: `apps/cli/src/index.ts` with bin `cli-mcp` or `tasks-cli`
- **Approach:**
  - Walk ops with `surfaces.cli`; split `command` on spaces into nested command tree.
  - Positionals from `positional[]`; remaining input keys → flags (`--title`, kebab-case).
  - Booleans as boolean flags; optional strings as optional flags.
  - Global: `--format json|table|text`, `--json` alias for json, `--verbose`.
  - Exit: 0 success; 1 AppError/domain; 2 usage/parse; preserve signal codes when feasible.
  - `createCli(registry).run(argv)` for tests without spawn.
- **Tests:**
  - `tasks create "Buy milk"` then `tasks list --format json` shows task.
  - `tasks get <id>` returns task.
  - Invalid args → exit code 2 or validation 1 with clear stderr.
  - Help text includes command summaries.
- **Verification:** `pnpm --filter @trifold/adapters-cli test`

### U7. MCP adapter + MCP app + curation

- **Goal:** stdio MCP server exposes only explicitly enabled tools; write tools require agentDescription; snapshot tool names.
- **Requirements:** R2, R4, R5, R6, R8
- **Files:**
  - Create: `packages/adapters-mcp/src/create-server.ts`, `tool-meta.ts`, `index.ts`, tests
  - Create: `apps/mcp/src/index.ts`
  - Create: `examples/tasks/mcp-tools.snapshot.json`
- **Approach:**
  - `isMcpTool(op)` ≡ `op.surfaces.mcp?.enabled === true`.
  - At register time (dev assert / test): if enabled and `sideEffect !== 'read'` and !agentDescription → throw config error.
  - Tool name: `mcp.toolName ?? id.replace(/\./g, '_')`.
  - Description: `agentDescription ?? description ?? summary`.
  - inputSchema: JSON Schema from Zod (same helper as OpenAPI package — share small `zodToJsonSchema` util in core or openapi to avoid drift).
  - Handler: createContext surface mcp → invokeOperation → return content with `structuredContent` when SDK supports, plus text JSON fallback.
  - Snapshot: sorted list of `{ name, description }` for tasks registry; `tasks_complete` **absent**; create/list/get **present**.
- **Tests:**
  - Tool list matches snapshot.
  - Call `tasks_create` then `tasks_list` via in-process client if feasible; else unit-test register+handler wrappers.
  - Config error when write enabled without agentDescription.
- **Verification:** `pnpm --filter @trifold/adapters-mcp test`

### U8. Auth middleware (all surfaces)

- **Goal:** Enforce `meta.auth` consistently; resolve `ctx.actor` from API key or bearer token.
- **Requirements:** R5
- **Files:**
  - Create: `packages/core/src/auth.ts` (or `packages/adapters-*/auth.ts` shared in core)
  - Modify: HTTP, CLI, MCP adapters to call `authorize(op, credentials) -> actor`
  - Tests across adapters
- **Approach:**
  - Env: `APP_API_KEYS` comma-separated valid keys (dev default `dev-key` documented); or single `APP_API_KEY`.
  - HTTP: `X-API-Key` or `Authorization: Bearer`.
  - CLI/MCP: env `APP_API_KEY` / `APP_TOKEN`.
  - `meta.auth: 'none'` → actor optional anonymous.
  - `apiKey` | `bearer` → 401 UNAUTHORIZED if missing/invalid.
  - Sample: protect create/complete; leave list/get open.
- **Tests:**
  - HTTP create without key → 401; with key → 201.
  - CLI create without env → exit 1 UNAUTHORIZED.
  - list without auth still works.
- **Verification:** adapter tests including auth cases green.

### U9. Root scripts, CI, README, AGENTS.md

- **Goal:** Cold-start path documented and CI enforces typecheck, tests, snapshots.
- **Requirements:** R7, R8, R9
- **Files:**
  - Create/Modify: root `package.json` scripts, `.github/workflows/ci.yml`, `README.md`, `AGENTS.md`, optional `docs/PLANS.md` pointer
  - Modify: design doc status → implemented-in-progress when started
- **Approach:**
  - Scripts:
    - `pnpm test` → `pnpm -r test`
    - `pnpm typecheck`
    - `pnpm build`
    - `pnpm dev:api` / `dev:cli` / `dev:mcp`
    - `pnpm snapshot:update` refreshes both goldens
  - CI: install with frozen lockfile, typecheck, test.
  - README: architecture diagram (text), Operation IR example, MCP enablement rule, run commands, auth env vars.
  - AGENTS.md: how agents add an operation; do not edit snapshots without intent; package boundaries.
- **Tests:** CI workflow validates on push (manual act optional).
- **Verification:** README commands work locally; CI file present and complete.

### U10. End-to-end smoke proof

- **Goal:** One scripted smoke that exercises HTTP + CLI against the same process model (MCP optional interactive note).
- **Requirements:** R6, R7
- **Files:**
  - Create: `scripts/smoke.sh` or `packages/ops/src/smoke.test.ts` integration
- **Approach:**
  - Prefer Vitest integration: create registry → HTTP app.request create/list → CLI run create/list → MCP tool list assert.
  - Document manual MCP: Claude/Cursor config snippet pointing at `pnpm --filter @app/mcp start`.
- **Tests:** single `smoke.test.ts` covering three surfaces in-process.
- **Verification:** `pnpm test` includes smoke; exit 0.

## Worktree & concurrency

- **worktree_slug:** `feat/cli-mcp-api-boilerplate`
- **spine_owner:** self (greenfield; entire tree is exclusive)
- **Pre-flight:** none available (`worktree-posture.sh` missing); primary checkout is fine for first implementation or create worktree:
  - `git fetch origin main 2>/dev/null; git worktree add -b feat/cli-mcp-api-boilerplate $HOME/Code/.worktrees/.hub/cli-mcp-api-boilerplate origin/main` if remote exists; else branch on current empty root.
- **Active conflicts:** none

### Write surfaces

| Unit | Paths |
|---|---|
| U1 | root configs, all package.json shells |
| U2 | `packages/core/**` |
| U3 | `packages/ops/**` |
| U4 | `packages/adapters-http/**`, `apps/api/**` |
| U5 | `packages/openapi/**`, `examples/tasks/openapi.snapshot.json`, adapters-http openapi route |
| U6 | `packages/adapters-cli/**`, `apps/cli/**` |
| U7 | `packages/adapters-mcp/**`, `apps/mcp/**`, `examples/tasks/mcp-tools.snapshot.json` |
| U8 | `packages/core/src/auth.ts`, adapter auth hooks |
| U9 | README, AGENTS, CI, root scripts |
| U10 | smoke test/script |

Serial execution recommended (U1→U10). Parallel only after U3: U4+U5 sequential; U6 and U7 can parallelize after U3 if core API frozen.

## Interfaces and Dependencies

### Core exports (stable)

```ts
// @trifold/core
export type SideEffect = "read" | "write" | "idempotent-write"
export type Surface = "http" | "cli" | "mcp"
export type RequestContext = { surface: Surface; requestId: string; actor?: Actor; auth?: AuthInfo; signal: AbortSignal; logger: Logger }
export type OperationDef<I, O> = { /* as design */ }
export class Registry { register(op: OperationDef<any, any>): void; get(id: string): OperationDef<any, any>; list(): OperationDef<any, any>[]; }
export function createContext(partial: Partial<RequestContext> & Pick<RequestContext, "surface">): RequestContext
export class AppError extends Error { code: string; status: number; details?: unknown }
export function invokeOperation(registry: Registry, id: string, rawInput: unknown, ctx: RequestContext): Promise<unknown>
export function isMcpEnabled(op: OperationDef<any, any>): boolean
```

### Adapter factories

```ts
// @trifold/adapters-http
export function createHttpApp(registry: Registry, opts?: { openapi?: OpenAPIObject }): Hono

// @trifold/adapters-cli
export function createCli(registry: Registry): { run(argv: string[]): Promise<number> }

// @trifold/adapters-mcp
export function createMcpServer(registry: Registry): { start(): Promise<void>; listToolNames(): string[] }

// @trifold/openapi
export function emitOpenAPI(registry: Registry, info: { title: string; version: string }): OpenAPIObject
```

### Runtime dependencies (pin at implement)

| Package | Used by |
|---|---|
| `zod` | core, ops |
| `hono` | adapters-http, api |
| `@hono/node-server` | apps/api |
| `citty` | adapters-cli |
| `@modelcontextprotocol/sdk` | adapters-mcp |
| `zod-to-json-schema` | openapi, adapters-mcp |
| `vitest` | all packages |
| `tsup` / `tsx` | apps build/dev |
| `typescript` | all |

## Validation and Acceptance

Observable acceptance (maps to requirements success criteria):

1. **Single registration:** Adding a new op file under `packages/ops` and calling `registry.register` is the only product code needed for it to appear on configured surfaces.
2. **HTTP:** `curl -s localhost:8787/tasks` and `POST /tasks` with API key work for sample.
3. **CLI:** `pnpm --filter @app/cli exec node dist/index.js tasks list --format json` returns JSON array.
4. **MCP:** tool list equals `examples/tasks/mcp-tools.snapshot.json`; `tasks_complete` not listed.
5. **OpenAPI:** `GET /openapi.json` matches `examples/tasks/openapi.snapshot.json` (or semantic equality).
6. **Auth:** unauthenticated write fails; read succeeds.
7. **CI-local:** `pnpm install && pnpm typecheck && pnpm test` exit 0.

## Idempotence and Recovery

- Re-running unit implementations should only touch that unit's paths.
- Snapshot updates are intentional via `pnpm snapshot:update`.
- If Zod converter output changes across versions, regenerate snapshots in the same commit as the dependency bump.
- Rollback: git revert unit commits; packages are additive.

## Deferred / out of scope

- OpenAPI import into registry
- MCP resources/prompts; HTTP/SSE MCP transport
- `create-cli-mcp-app` scaffolder
- Published npm packages
- oRPC / TypeSpec
- OAuth/OIDC
- Restish integration beyond documenting exported OpenAPI URL

## Open questions

None blocking. Defaults locked in Decision Log.

Residual (non-blocking): exact bin name (`cli-mcp` vs product-specific) — use **`cli-mcp`** for the template binary.

## Prior learnings applied

- No in-repo `docs/solutions/` entries. External research constraints carried from design: MCP curation mandatory; adapters must not own business logic.

## Requirements traceability

| Req | Units |
|---|---|
| R1 | U2, U3 |
| R2 | U4, U6, U7 |
| R3 | U5 |
| R4 | U7 |
| R5 | U2, U4, U6, U7, U8 |
| R6 | U3, U4, U6, U7, U10 |
| R7 | U9, U10 |
| R8 | U5, U7, U9 |
| R9 | U1, U9 |

## Revision History

- 2026-08-11: Initial plan from requirements + design; locked Hono, citty, MCP omit=off, AppError shape, Zod 3.
