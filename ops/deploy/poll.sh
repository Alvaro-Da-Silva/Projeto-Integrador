#!/usr/bin/env bash
set -euo pipefail
umask 077
cd -- "$(dirname -- "$0")"
source ./release-paths.sh
source ./activate-release.sh
[[ $EUID == 0 ]]
case "$#:${1:-}" in
  0:) [[ -f $control/enabled ]] ;;
  1:--preflight)
    [[ $(systemctl is-enabled siscota-cd.timer || true) == disabled && ! -e $control/enabled ]]
    if systemctl is-active --quiet siscota-cd.timer; then exit 1; fi
    ;;
  *) exit 2 ;;
esac
assert_control
exec 9>"$state/deploy.lock"
if ! flock -n 9; then
  [[ $# == 0 ]]
  exit
fi
[[ ! -e $state/pending && ! -e $state/failed ]] || { echo 'Recuperação requer inspeção administrativa'; exit 1; }
current=$(installed_id)
if [[ $current == "$manual_id" ]]; then verify_active_manual; fi
[[ $(release_id "$(readlink -e "$state/current")") == "$current" ]]
candidate=$(python3 approved.py "$current")
if [[ -z $candidate ]]; then
  [[ $# == 0 ]]
  exit
fi
[[ $candidate =~ ^[0-9a-f]{40}$ ]]
bash ./check-live-schema.sh
bash ./prepare-release.sh "$candidate" "$@"
[[ $(python3 approved.py "$current") == "$candidate" ]]
bash ./check-live-schema.sh
if [[ ${1:-} == --preflight ]]; then
  printf 'Build isolado e verificações concluídos para %s; promoção pendente.\n' "$candidate"
  exit 0
fi
activate "$current" "$candidate"
