#!/usr/bin/env bash
# Heuristic AI-slop detector for public-facing tree content and/or git history.
#
# High-confidence phrase matches fail the scan (exit 1). Soft patterns warn only.
# Intended for release hygiene and CI — not a style enforcer for all prose.
#
# Usage:
#   scripts/scan-ai-slop.sh            # tree (default)
#   scripts/scan-ai-slop.sh --history  # commit subjects + bodies on HEAD lineage
#   scripts/scan-ai-slop.sh --all      # tree + history
#   scripts/scan-ai-slop.sh --warn     # report findings but always exit 0
set -euo pipefail

ROOT="$(CDPATH='' cd -P -- "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MODE_TREE=1
MODE_HISTORY=0
WARN_ONLY=0

for arg in "$@"; do
  case "$arg" in
    --history) MODE_TREE=0; MODE_HISTORY=1 ;;
    --all) MODE_TREE=1; MODE_HISTORY=1 ;;
    --warn) WARN_ONLY=1 ;;
    -h|--help)
      sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 2
      ;;
  esac
done

# Pattern lists live in a data file so this script body is not self-matching.
PATTERN_FILE="${ROOT}/scripts/ai-slop-patterns.txt"
ALLOWLIST_FILE="${ROOT}/scripts/ai-slop-allowlist.txt"

if [[ ! -f "$PATTERN_FILE" ]]; then
  echo "Missing pattern file: $PATTERN_FILE" >&2
  exit 2
fi

# Load FAIL=/WARN=/HISTORY= lines from the pattern file.
FAIL_PATTERNS=()
WARN_PATTERNS=()
HISTORY_FAIL_PATTERNS=()
while IFS= read -r raw || [[ -n "$raw" ]]; do
  [[ -z "$raw" || "$raw" =~ ^# ]] && continue
  kind="${raw%%=*}"
  value="${raw#*=}"
  case "$kind" in
    FAIL) FAIL_PATTERNS+=("$value") ;;
    WARN) WARN_PATTERNS+=("$value") ;;
    HISTORY) HISTORY_FAIL_PATTERNS+=("$value") ;;
  esac
done <"$PATTERN_FILE"

is_skip_path() {
  local line="$1"
  # Normalize: strip leading ./
  local path="${line%%:*}"
  path="${path#./}"
  case "$path" in
    scripts/scan-ai-slop.sh|scripts/ai-slop-patterns.txt|scripts/ai-slop-allowlist.txt) return 0 ;;
    docs/maintainer/public-repo-release-sop.md) return 0 ;;
    .beads/*|.beads) return 0 ;;
    node_modules/*|pnpm-lock.yaml) return 0 ;;
    docs/assets/*) return 0 ;;
  esac
  return 1
}

is_allowlisted() {
  local line="$1"
  [[ -f "$ALLOWLIST_FILE" ]] || return 1
  while IFS= read -r entry || [[ -n "$entry" ]]; do
    [[ -z "$entry" || "$entry" =~ ^# ]] && continue
    if [[ "$line" == *"$entry"* ]]; then
      return 0
    fi
  done <"$ALLOWLIST_FILE"
  return 1
}

join_patterns() {
  local first=1 p
  for p in "$@"; do
    if (( first )); then
      printf '%s' "$p"
      first=0
    else
      printf '|%s' "$p"
    fi
  done
}

scan_tree_raw() {
  local pattern="$1"
  if command -v rg >/dev/null 2>&1; then
    rg -n -i --hidden --no-messages \
      -g '!.git/**' \
      -g '!node_modules/**' \
      -g '!**/node_modules/**' \
      -g '!pnpm-lock.yaml' \
      -g '!.beads/**' \
      -g '!**/.beads/**' \
      -g '!**/.data/**' \
      -g '!**/dist/**' \
      -g '!docs/assets/**' \
      -g '*.md' -g '*.mdx' -g '*.txt' -g '*.ts' -g '*.tsx' -g '*.js' -g '*.jsx' \
      -g '*.mjs' -g '*.cjs' -g '*.json' -g '*.yml' -g '*.yaml' -g '*.toml' -g '*.sh' \
      -e "$pattern" . 2>/dev/null || true
  else
    grep -RInE \
      --exclude-dir=.git \
      --exclude-dir=node_modules \
      --exclude-dir=.beads \
      --exclude-dir=.data \
      --exclude-dir=dist \
      --exclude='pnpm-lock.yaml' \
      --include='*.md' --include='*.ts' --include='*.tsx' --include='*.js' \
      --include='*.json' --include='*.yml' --include='*.yaml' --include='*.sh' \
      --include='*.txt' \
      -e "$pattern" . 2>/dev/null || true
  fi
}

FAIL_HITS=0
WARN_HITS=0

report_hits() {
  local severity="$1"
  local label="$2"
  local hits="$3"
  local line
  if [[ -z "${hits//[$'\n']/}" ]]; then
    return 0
  fi
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "$line" ]] && continue
    if is_skip_path "$line"; then
      continue
    fi
    if is_allowlisted "$line"; then
      continue
    fi
    if [[ "$severity" == "FAIL" ]]; then
      echo "FAIL [$label] $line"
      FAIL_HITS=$((FAIL_HITS + 1))
    else
      echo "WARN [$label] $line"
      WARN_HITS=$((WARN_HITS + 1))
    fi
  done <<<"$hits"
}

echo "==> AI-slop scan (tree=$MODE_TREE history=$MODE_HISTORY)"

if (( MODE_TREE )); then
  if ((${#FAIL_PATTERNS[@]} > 0)); then
    hits="$(scan_tree_raw "$(join_patterns "${FAIL_PATTERNS[@]}")")"
    report_hits FAIL "tree" "$hits"
  fi
  if ((${#WARN_PATTERNS[@]} > 0)); then
    hits="$(scan_tree_raw "$(join_patterns "${WARN_PATTERNS[@]}")")"
    report_hits WARN "tree" "$hits"
  fi
fi

if (( MODE_HISTORY )); then
  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "Not a git repository; skipping history scan." >&2
  elif ((${#HISTORY_FAIL_PATTERNS[@]} > 0)); then
    hist_pattern="$(join_patterns "${HISTORY_FAIL_PATTERNS[@]}")"
    hist_hits="$(
      git log --format='%h %s%n%b' HEAD 2>/dev/null \
        | grep -nEi "$hist_pattern" 2>/dev/null || true
    )"
    report_hits FAIL "history" "$hist_hits"
  fi
fi

echo "AI-slop scan: ${FAIL_HITS} fail hit(s), ${WARN_HITS} warn hit(s)."

if (( FAIL_HITS > 0 )); then
  if (( WARN_ONLY )); then
    echo "WARN mode: failing findings reported but exit 0." >&2
    exit 0
  fi
  echo "AI-slop scan failed. Rewrite the prose or add a narrow allowlist entry." >&2
  exit 1
fi

echo "AI-slop scan: OK"
