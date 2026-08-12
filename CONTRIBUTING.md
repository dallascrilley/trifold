# Contributing

Thanks for your interest in improving this project. This guide keeps contributions focused, testable, and easy to review.

## Development setup

**Requirements**

- Node.js **22+**
- [pnpm](https://pnpm.io) **11+** (see `packageManager` in root `package.json`)

```bash
git clone https://github.com/dallascrilley/trifold.git
cd trifold
pnpm install
pnpm typecheck
pnpm test
```

Optional orientation helpers (agent/human):

```bash
./bin/orient
```

## Repository layout (short)

| Path | Role |
|---|---|
| `packages/core` | Operation IR, registry, auth, `JsonFileMapStore` |
| `packages/adapters-*` | HTTP / CLI / MCP adapters |
| `packages/openapi` | Emit + import OpenAPI |
| `packages/scaffold` | Product scaffolder |
| `packages/ops`, `packages/notes` | Sample domains |
| `apps/*` | Process entrypoints |
| `docs/` | Design notes and runbooks |

Handlers own business logic. Adapters own transport only.

## Making changes

1. Create a branch from `main`:
   ```bash
   git checkout -b feat/short-description
   ```
2. Prefer the smallest change that proves the behavior.
3. Add or update tests next to the code you touch (`*.test.ts`).
4. Keep public docs in the same PR when you change commands or architecture.
5. Run the quality gate before opening a PR:
   ```bash
   pnpm typecheck
   pnpm test
   # or
   pnpm validate
   ```

### Scaffold / OpenAPI tooling

```bash
pnpm scaffold -- my-product --dry-run
pnpm openapi:import -- examples/tasks/openapi.snapshot.json
```

If you change OpenAPI or MCP tool surfaces for the **tasks** sample:

```bash
pnpm snapshot:update
pnpm test
```

Commit snapshot updates only when intentional.

## Pull requests

- Fill out the PR template.
- Link related issues when applicable.
- Keep PRs reviewable (prefer focused commits or a clear story in the description).
- CI must be green (`typecheck` + `test`).

### PR title style

Conventional style is appreciated:

- `feat: …`
- `fix: …`
- `docs: …`
- `refactor: …`
- `chore: …`

## Code standards

- **TypeScript** strict mode (`tsconfig.base.json`).
- Prefer explicit types at public boundaries (`OperationDef`, store APIs).
- No secrets in source. Use env vars; document them in `.env.example` and the README.
- MCP tools must be **curated** — do not auto-expose every HTTP route. Writes require `agentDescription` when MCP-enabled.
- Production auth fails closed: do not invent credentials when `NODE_ENV=production`.

## Reporting bugs / security

- Bugs and features: GitHub Issues (use the templates when available).
- Security vulnerabilities: see [SECURITY.md](./SECURITY.md) — do not open a public issue for sensitive reports.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
