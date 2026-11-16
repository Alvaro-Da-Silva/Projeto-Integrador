#!/usr/bin/env bash
set -euo pipefail
umask 077
cd -- "$(dirname -- "$0")"
source ./release-paths.sh
sha=${1:?SHA requerido}
[[ $EUID == 0 && $sha =~ ^[0-9a-f]{40}$ && ! -e $releases/$sha && ! -L $releases/$sha ]]
work=$(mktemp -d /var/lib/siscota-build/work.XXXXXX)
quarantine=

cleanup() {
  rm -rf -- "$work"
  if [[ -n $quarantine ]]; then rm -rf -- "$quarantine"; fi
}
trap cleanup EXIT
quarantine=$(mktemp -d "$releases/.prepare.XXXXXX")
install -d "$work/tree"
python3 fetch-release.py "$sha" "$quarantine/source.tar.gz" "$work/tree"
cp -a --reflink=auto /var/lib/siscota-build/cache "$work/cache"
chown -R siscota-build:siscota-build "$work"
systemd-run --quiet --wait --collect \
  -p User=siscota-build -p Group=siscota-build -p KillMode=control-group \
  -p ProtectSystem=strict -p ProtectHome=yes -p PrivateNetwork=yes -p PrivateTmp=yes \
  -p 'InaccessiblePaths=/run/postgresql /var/lib/postgresql /etc/siscota-cd /var/lib/siscota-cd' \
  -p NoNewPrivileges=yes -p RuntimeMaxSec=30min -p UMask=0022 \
  -p "ReadWritePaths=$work" -p "WorkingDirectory=$work/tree" \
  /usr/bin/env -i PATH=/usr/local/lib/siscota-cd/tools/bin:/usr/bin:/bin HOME="$work" \
  bash /usr/local/lib/siscota-cd/build-release.sh "$work/tree"
[[ -z $(find "$work/tree" ! -type f ! -type d ! -type l -print -quit) ]]
# Links relativos gerados pelo gerenciador de pacotes devem permanecer na árvore.
while IFS= read -r -d '' link; do
  [[ $(readlink "$link") != /* && $(realpath -e "$link") == "$work/tree/"* ]] || exit 1
done < <(find "$work/tree" -type l -print0)
install -d -m 0755 "$quarantine/tree"
cp -a --no-preserve=ownership "$work/tree/." "$quarantine/tree/"
chown -hR root:root "$quarantine/tree"
chmod -R a+rX,go-w,a-s "$quarantine/tree"
[[ -f $quarantine/tree/backend/src/server.js && -f $quarantine/tree/frontend/.next/BUILD_ID ]]
install -d -o siscota -g siscota -m 0755 "$quarantine/tree/frontend/.next/cache"
mv -T "$quarantine/tree" "$releases/$sha"
