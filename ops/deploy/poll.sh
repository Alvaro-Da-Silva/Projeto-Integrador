#!/usr/bin/env bash
set -euo pipefail
umask 022
base=/opt/siscota-deploy
state=/var/lib/siscota-cd
tools=/opt/siscota-tools
config=/etc/siscota-cd/github.curl
exec 9>"$state/deploy.lock"
flock -n 9 || exit 0
current=$(cat "$state/current.sha" 2>/dev/null || true)
sha=$(python3 /usr/local/lib/siscota-cd/approved.py "$current")
[[ -n "$sha" ]] || exit 0
[[ ! -e "$state/rejected-$sha" ]] || exit 0
echo "Preparando revisão $sha"
release="$base/releases/$sha"
[[ ! -e "$release" ]] || { echo 'Diretório preexistente exige inspeção antes de uma nova tentativa'; exit 1; }
install -d -o siscota-ci -g siscota-ci -m 0755 "$release"
archive=$(mktemp "$state/archive.XXXXXX")
trap 'rm -f -- "$archive"' EXIT
curl --config "$config" --fail --silent --show-error --location --max-time 120 \
  "https://api.github.com/repos/Alvaro-Da-Silva/Projeto-Integrador/tarball/$sha" -o "$archive"
cat "$archive" | runuser -u siscota-ci -- tar --no-same-owner --no-same-permissions --strip-components=1 -xf - -C "$release"

# The manifest is held by root and is never modified by a release.
(cd "$release" && sha256sum -c "$state/persistence.sha256") ||
  { echo 'Alteração de contrato de persistência exige revisão administrativa'; touch "$state/rejected-$sha"; exit 1; }
(cd "$release" && python3 /usr/local/lib/siscota-cd/persistence.py) > "$state/candidate-persistence"
cmp -s "$state/persistence.paths" "$state/candidate-persistence" ||
  { echo 'Arquivos novos ou removidos de persistência exigem revisão'; touch "$state/rejected-$sha"; exit 1; }

if ! systemd-run --quiet --wait --collect --pipe \
  -p User=siscota-ci -p Group=siscota-ci -p ProtectHome=yes \
  -p ProtectSystem=strict -p PrivateTmp=yes -p NoNewPrivileges=yes \
  -p "ReadWritePaths=$release /var/lib/siscota-ci" \
  -p 'InaccessiblePaths=/var/lib/postgresql /run/postgresql /etc/siscota-cd' \
  -p MemoryMax=1400M -p RuntimeMaxSec=20min \
  --setenv="PATH=$tools/node/bin:$tools/pnpm/node_modules/.bin:/usr/bin:/bin" \
  --setenv=HOME=/var/lib/siscota-ci \
  /bin/bash "$release/ops/deploy/build-release.sh" "$release"; then
  echo 'Preparação falhou. A release anterior continua ativa.'
  touch "$state/rejected-$sha"
  exit 1
fi
runuser -u postgres -- /usr/lib/postgresql/18/bin/pg_dump -h /var/run/postgresql -p 5432 \
  -d siscota --schema-only --no-owner --no-privileges -n public |
  sed '/^\\restrict /d; /^\\unrestrict /d; /^--/d; /^$/d' > "$state/live.ddl"
if ! cmp -s "$state/live.ddl" "$release/expected.ddl"; then
  diff -u "$state/live.ddl" "$release/expected.ddl" > "$state/schema-diff-$sha.log" || true
  touch "$state/rejected-$sha"
  echo "Esquema divergente. Consulte $state/schema-diff-$sha.log"
  exit 1
fi
if ! /usr/local/lib/siscota-cd/activate-release.sh "$release"; then touch "$state/rejected-$sha"; exit 1; fi
printf '%s\n' "$sha" > "$state/current.next"
mv -T "$state/current.next" "$state/current.sha"
echo "Revisão $sha ativa"
