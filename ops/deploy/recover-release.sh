#!/usr/bin/env bash
set -euo pipefail
umask 077
cd -- "$(dirname -- "$0")"
source ./release-paths.sh
source ./activate-release.sh
[[ $EUID == 0 ]] || exit 1
assert_control
exec 9>"$state/deploy.lock"
flock -n 9
if [[ ! -f $state/pending ]]; then
  [[ ! -e $state/failed && -f $state/previous-transition ]]
  read -r previous candidate < "$state/previous-transition"
  [[ $(installed_id) == "$candidate" ]]
  mv -T "$state/previous-transition" "$state/pending"
fi
restore_pending
