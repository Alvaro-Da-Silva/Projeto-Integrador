#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "$0")/release-paths.sh"
[[ $EUID == 0 ]]
for projection in ddl privileges; do
  baseline="$control/live-$projection.sha256"
  if [[ $projection == ddl ]]; then baseline="$control/live-schema.sha256"; fi
  [[ -f $baseline && ! -L $baseline && $(stat -c '%u:%a' "$baseline") == 0:600 ]]
  expected=$(<"$baseline")
  [[ $expected =~ ^[0-9a-f]{64}$ ]]
  actual=$(bash "$(dirname -- "$0")/snapshot-schema.sh" "--$projection" | sha256sum)
  [[ ${actual%% *} == "$expected" ]] || { echo "Projeção $projection fora do baseline revisado"; exit 1; }
done
