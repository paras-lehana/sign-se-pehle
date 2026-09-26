#!/usr/bin/env bash
# Pre-publish checks for the public repository. Fails on anything that must never ship:
# secrets, private notes, build artefacts, banned code patterns, or a repository over 10 MB.
#
# Usage: scripts/preflight.sh
set -euo pipefail
cd "$(dirname "$0")/.."

fail() { echo "PREFLIGHT FAILED: $1" >&2; exit 1; }

echo "--> tracked files that must never be published"
if git ls-files | grep -E '(^|/)\.env$|(^|/)\.env\.[^e]|^docs/|node_modules/|/dist/|coverage/' ; then
  fail "private or generated files are tracked"
fi

echo "--> secret patterns in tracked files"
if git grep -nE 'AIza[0-9A-Za-z_-]{35}|-----BEGIN [A-Z ]*PRIVATE KEY-----|ghp_[0-9A-Za-z]{36}' -- . ; then
  fail "a secret-looking value is tracked"
fi

echo "--> banned code patterns in sources"
SRC=(packages/core/src apps/server/src apps/web/src e2e)
if git grep -nE 'console\.(log|debug|info)|eslint-disable|@ts-ignore|@ts-expect-error|TODO|FIXME|: any\b|as any\b' -- "${SRC[@]}" ; then
  fail "banned pattern found"
fi

echo "--> repository size"
SIZE_KB=$(git count-objects -v | awk '/size-pack/ {print $2}')
LOOSE_KB=$(git count-objects -v | awk '/^size:/ {print $2}')
TOTAL_KB=$((SIZE_KB + LOOSE_KB))
echo "    ${TOTAL_KB} KB"
[ "${TOTAL_KB}" -lt 10240 ] || fail "repository is ${TOTAL_KB} KB (limit 10 MB)"

echo "==> preflight passed"
