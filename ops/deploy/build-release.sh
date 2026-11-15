#!/usr/bin/env bash
set -euo pipefail
cd "${1:?release obrigatória}"
npm ci --prefix backend --no-audit --no-fund
npm --prefix backend test
bash ops/deploy/check-db.sh "$PWD/expected.ddl"
cd frontend
pnpm install --frozen-lockfile
pnpm exec next typegen
pnpm check-types
pnpm exec eslint --format json --output-file ../eslint.json || test "$?" -eq 1
node ../ops/deploy/check-lint.mjs ../eslint.json
NEXT_TELEMETRY_DISABLED=1 pnpm build
