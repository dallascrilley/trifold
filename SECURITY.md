# Security policy

## Supported versions

This project is a **boilerplate / starter monorepo**. Security fixes are applied on a best-effort basis to the default branch (`main`).

| Version | Supported |
|---|---|
| `main` | Yes |
| Older commits / forks | Best effort only |

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Prefer one of:

1. **GitHub Security Advisories** for this repository (if enabled):  
   Repository → Security → Advisories → Report a vulnerability  
2. **Email the maintainer** via the address on the GitHub profile for [dallascrilley](https://github.com/dallascrilley).

Include:

- A description of the issue and impact
- Steps to reproduce or a proof of concept
- Affected package path(s) if known
- Any suggested fix

You should receive an acknowledgment when practical. Coordinated disclosure is preferred.

## Security notes for operators

- Treat demo defaults (`dev-key`) as **non-production**.
- Set `APP_API_KEY` / `APP_API_KEYS` in real deployments.
- In `NODE_ENV=production`, missing API keys fail closed (no invented credentials).
- Prefer binding MCP HTTP to localhost unless you add authentication and host checks.
- Do not commit `.env` or local data under `.data/`.

## Scope

In scope: auth bypass, secret leakage, unsafe defaults that would affect a careful deployment following the README.

Out of scope: vulnerabilities that require ignoring documented production guidance, or issues solely in third-party dependencies (report upstream when possible; we will upgrade when feasible).
