#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "$0")/release-paths.sh"
[[ $EUID == 0 ]]
for projection in ddl privileges; do
  expected=$(<"$control/live-$projection.sha256")
  [[ $expected =~ ^[0-9a-f]{64}$ ]]
  actual=$(bash "$(dirname -- "$0")/snapshot-schema.sh" "--$projection" | sha256sum)
  [[ ${actual%% *} == "$expected" ]] || { echo "Projeção $projection fora do baseline revisado"; exit 1; }
done
