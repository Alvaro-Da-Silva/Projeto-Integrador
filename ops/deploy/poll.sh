#!/usr/bin/env bash
set -euo pipefail
umask 077
cd -- "$(dirname -- "$0")"
source ./release-paths.sh
source ./activate-release.sh
[[ $EUID == 0 && -f $control/enabled ]] || exit 1
assert_control
exec 9>"$state/deploy.lock"
flock -n 9 || exit 0
[[ ! -e $state/pending && ! -e $state/failed ]] || { echo 'Recuperação requer inspeção administrativa'; exit 1; }
current=$(installed_id)
if [[ $current == "$manual_id" ]]; then verify_active_manual; fi
[[ $(release_id "$(readlink -e "$state/current")") == "$current" ]]
candidate=$(python3 approved.py "$current")
[[ -n $candidate ]] || exit 0
[[ $candidate =~ ^[0-9a-f]{40}$ ]]
bash ./check-live-schema.sh
bash ./prepare-release.sh "$candidate"
[[ $(python3 approved.py "$current") == "$candidate" ]]
bash ./check-live-schema.sh
activate "$current" "$candidate"
