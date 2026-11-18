#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
source ./activate-release.sh
state=$(mktemp -d)
trap 'rm -rf -- "$state"' EXIT
releases=$state/releases
manual=manual-release
candidate=be51
mkdir -p "$releases/$manual" "$releases/$candidate"
ln -s "$releases/$manual" "$state/current"
assert_control() { return 0; }
assert_release() { [[ -d $releases/$1 ]]; }
installed_id() { basename "$(readlink -e "$state/current")"; }
release_id() { basename "$1"; }
systemctl() {
  [[ $1 == restart ]]
  # O teste nÃ£o chama o systemctl do sistema.
  printf '%s\n' "$(installed_id)" >> "$state/restarts"
}
health() { [[ $1 == "$manual" ]]; }
services=(backend frontend)
if activate "$manual" "$candidate"; then exit 1; fi
[[ $(installed_id) == "$manual" && ! -e $state/pending && -f $state/failed ]]
[[ $(cat "$state/restarts") == "$candidate"$'\n'"$manual" ]]
printf 'Rollback simulado: candidata rejeitada, release manual restaurada e nova tentativa bloqueada.\n'
