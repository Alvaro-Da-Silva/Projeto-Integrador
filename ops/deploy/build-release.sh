#!/usr/bin/env bash
set -euo pipefail
cd -- "${1:?release obrigatória}"
npm_args=(--ignore-scripts --no-audit --no-fund)
pnpm_args=(--ignore-scripts --frozen-lockfile)
if [[ ${2:-} != --ci ]]; then
  npm_args+=(--offline --cache "$HOME/cache/npm")
  pnpm_args+=(--offline --store-dir "$HOME/cache/pnpm")
fi
npm ci --prefix backend "${npm_args[@]}"
find backend/src -type f -name '*.js' -exec bash -c 'for js; do node --check "$js" || exit; done' _ {} +
if [[ ${2:-} == --ci ]]; then
  shopt -s nullglob
  tests=(backend/test/*.test.js backend/test/integration/*.test.js)
  if (( ${#tests[@]} )); then npm --prefix backend test; fi
fi
cd frontend
pnpm install "${pnpm_args[@]}"
pnpm exec next typegen
pnpm check-types
lint=$(mktemp)
trap 'rm -f -- "$lint"' EXIT
pnpm exec eslint --format json --output-file "$lint" || test "$?" -eq 1
node ../ops/deploy/check-lint.mjs "$lint"
NEXT_TELEMETRY_DISABLED=1 pnpm build --webpack
