# SOP: Public GitHub repository release

**Purpose:** Repeatable checklist for turning a private/local project into a public GitHub repo that can withstand employer, open-source, and security scrutiny.

**Audience:** Agents and humans shipping Dallas-owned repositories (`dallascrilley` / `dallascrilleymartech`).

**Default posture:** Repos stay **private** until Dallas gives **explicit approval to change visibility** (e.g. “make it public”, “publish now”). Completing this SOP’s prep steps is **not** permission to flip public. This document is the decision gate.

---

## 0. Preconditions

- [ ] You have authority to publish **this** repository (owner account, no third-party code without license).
- [ ] Product intent is clear enough for a stranger to understand in 30 seconds.
- [ ] Working tree is on a clean feature branch (or main with intentional release PR).
- [ ] Remote is Dallas-owned: `gh repo view --json owner` → `dallascrilley` or `dallascrilleymartech`.

---

## 1. Identity & narrative

- [ ] **Name** is accurate, searchable, and non-embarrassing.
- [ ] **One-line description** (GitHub + package.json) states problem + approach.
- [ ] **README** answers: what / why / who / how to try in under 5 minutes.
- [ ] **Non-goals** are stated so reviewers do not over-read the scope.
- [ ] Architecture is visible (diagram or package map).
- [ ] License chosen and committed (`LICENSE` file). Prefer **MIT** unless a reason exists.

**Done when:** A cold reader can clone, run, and explain the project without asking you.

---

## 2. Secrets & private surface scrub

Never publish real credentials. Scan and fix:

```bash
# High-signal secret patterns (extend as needed)
rg -n --hidden \
  -g '!.git' -g '!node_modules' -g '!pnpm-lock.yaml' -g '!**/.beads/embeddeddolt/**' \
  'ghp_[A-Za-z0-9]+|github_pat_|sk-[A-Za-z0-9]+|AKIA[0-9A-Z]{16}|-----BEGIN (RSA |OPENSSH )?PRIVATE KEY-----|xox[baprs]-|op://[^"'\'' ]+' \
  .
```

- [ ] No private keys, tokens, or `op://` resolved secrets in git history of the public default branch.
- [ ] Only `op://` **references** (if any) in durable files — never resolved values.
- [ ] `.env` ignored; `.env.example` has placeholders only (demo keys clearly labeled as demos).
- [ ] Absolute home paths (`/Users/...`) removed from committed docs/config or replaced with placeholders.
- [ ] STATUS / project identity files do not leak private infra hosts, account IDs, or internal ticket noise.
- [ ] Agent-only state that is junk for strangers is either documented as optional or gitignored (Dolt DB, local `.data/`, etc.).
- [ ] `git log` / `git rev-list --all` spot-check for accidental secret commits; if found, **stop** and rewrite/rotate before public.

**Done when:** Secret scan is clean and any intentional demo secrets are obviously non-production.

---

## 3. Code quality gate

Run the project’s real quality commands; do not invent weaker substitutes.

```bash
# TypeScript / pnpm monorepo pattern (adapt per stack)
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
# Optional if present:
# pnpm lint
# pnpm build
```

- [ ] Typecheck / compile green.
- [ ] Tests green (unit + smoke as claimed in README).
- [ ] CI workflow exists and runs on PR + main.
- [ ] CI is green on the release branch.
- [ ] No debug `console.log` spam or dead scaffold leftovers in default paths.
- [ ] Public APIs and entrypoints documented match code (no doc-only commands).
- [ ] Dependencies reviewed: no abandoned critical libs if avoidable; lockfile committed.

**Done when:** A stranger can trust the green badge (or local commands) as evidence.

---

## 4. Repository hygiene files

Minimum set for employer/open-source scrutiny:

| File | Required | Notes |
|---|---|---|
| `README.md` | Yes | Problem, features, quickstart, architecture, license |
| `LICENSE` | Yes | Full text |
| `CONTRIBUTING.md` | Yes | How to build, test, PR |
| `SECURITY.md` | Yes | How to report vulnerabilities |
| `CODE_OF_CONDUCT.md` | Recommended | Contributor Covenant or short equivalent |
| `.gitignore` | Yes | env, build, OS, local data, Dolt DB |
| `.env.example` | If secrets used | Placeholders only |
| `.github/workflows/ci.yml` | Yes | Install + quality gates |
| `.github/PULL_REQUEST_TEMPLATE.md` | Recommended | Checklist for PRs |
| `.github/ISSUE_TEMPLATE/*` | Recommended | Bug + feature |

Optional but strong signals:

- [ ] `docs/ARCHITECTURE.md` (or codemap) for deeper review.
- [ ] Badges in README (CI, license, Node version).
- [ ] `package.json` `repository`, `bugs`, `homepage` fields when publishing packages.

**Done when:** Root of the repo looks intentional, not abandoned.

---

## 5. Public-facing docs tone

- [ ] First person or project voice is professional; no private jokes or unfinished TODOs as headlines.
- [ ] “Agent” / automation tooling (Beads, AGENTS.md) is framed as **workflow**, not magic.
- [ ] Trade-offs and limitations are honest (builds credibility).
- [ ] Screenshots or terminal examples are copy-paste accurate.
- [ ] License section matches `LICENSE` file.

---

## 6. GitHub repository settings

```bash
# Description + topics (safe while private)
gh repo edit --description "…" --add-topic typescript --add-topic mcp --add-topic cli
```

- [ ] Description and topics set.
- [ ] Default branch protected if the repo will accept external PRs (optional for personal showcases).
- [ ] Actions enabled.
- [ ] No accidental org secrets exposed to forks (review Actions secrets).
- [ ] **Visibility remains private** until Dallas explicitly approves going public.

**Prep done when:** scrub + quality + docs are green and `isPrivate` is still `true`.

### 6b. Visibility flip (explicit approval only)

Run **only** after a clear go-ahead for visibility (not merely “prep for public”):

```bash
gh repo edit --visibility public --accept-visibility-change-consequences
gh repo view --json isPrivate,visibility,url
```

**Done when:** `isPrivate` → `false` **and** that change was explicitly requested.

---

## 7. Post-publish verification

- [ ] Incognito / logged-out browser can open the repo.
- [ ] Clone fresh into a temp dir and run quickstart:

```bash
git clone <url> /tmp/review-clone && cd /tmp/review-clone
# follow README exactly
```

- [ ] README badges resolve.
- [ ] No broken internal links.
- [ ] Record publish date in STATUS or release notes (optional tag `v0.1.0`).

---

## 8. Stop conditions (do not publish)

Stop and escalate if:

- Real secrets found in history and rotation is incomplete.
- License of vendored code is unknown or incompatible.
- Project claims capabilities tests do not prove.
- Repo is not owned by Dallas.
- Production customer data or private client work is present.

---

## 9. Agent execution notes

When an agent runs this SOP:

1. Create a feature branch; do not force-push main.
2. Prefer one PR: “chore: public release prep”.
3. Cite evidence (commands + results) in the PR body against this checklist.
4. **Do not flip visibility** unless Dallas explicitly approved the public change for this repo in the current request (or a standing instruction naming this repo). Checklist green alone is insufficient.
5. Never commit the Beads Dolt database; export `issues.jsonl` is fine if used.
6. If the repo is found public without approval, set it private immediately and report.

---

## 10. Minimal copy-paste checklist

```text
[ ] Narrative README + LICENSE
[ ] CONTRIBUTING + SECURITY (+ CoC)
[ ] Secret scrub clean
[ ] No private absolute paths
[ ] typecheck + test + CI green
[ ] .env.example placeholders only
[ ] GitHub description/topics
[ ] Fresh clone quickstart works
[ ] Repo still private (default)
[ ] Visibility → public  **only after explicit Dallas approval**
```

---

## Revision history

- 2026-08-11: Initial SOP (first applied to `cli-mcp-projects`).
