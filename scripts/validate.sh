#!/usr/bin/env bash
# Local quality gate aligned with CI + public-release SOP.
set -euo pipefail
ROOT="$(CDPATH='' cd -P -- "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> typecheck"
pnpm typecheck

echo "==> test"
pnpm test

echo "==> secret pattern scan (heuristic)"
if command -v rg >/dev/null 2>&1; then
  # Fail on high-confidence secret patterns; allow documented demo "dev-key".
  if rg -n --hidden \
    -g '!.git' -g '!node_modules' -g '!pnpm-lock.yaml' -g '!**/.beads/embeddeddolt/**' -g '!**/docs/maintainer/**' \
    'ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]+|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN (RSA |OPENSSH )?PRIVATE KEY-----|xox[baprs]-' \
    . ; then
    echo "Possible secrets detected. Investigate before publish." >&2
    exit 1
  fi
  echo "No high-confidence secret patterns found."
else
  echo "rg not installed; skipping secret scan."
fi

echo "==> AI-slop scan (heuristic)"
bash "$ROOT/scripts/scan-ai-slop.sh"

echo "validate: OK"
