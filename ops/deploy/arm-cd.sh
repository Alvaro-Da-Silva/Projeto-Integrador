#!/usr/bin/env bash
set -euo pipefail
umask 077
cd -- "$(dirname -- "$0")"
source ./release-paths.sh
[[ $EUID == 0 && $# == 1 ]]
assert_control
[[ ! -e $state/pending && ! -e $state/failed ]]
[[ $(systemctl is-enabled siscota-cd.timer || true) == disabled ]]
if systemctl is-active --quiet siscota-cd.timer; then exit 1; fi
getent passwd siscota-build >/dev/null
[[ -x $PWD/tools/bin/node && -x $PWD/tools/bin/pnpm ]]
[[ -d /var/lib/siscota-build/cache/npm && -d /var/lib/siscota-build/cache/pnpm ]]
current=$(installed_id)
[[ $(release_id "$(readlink -e "$state/current")") == "$current" ]]
bash ./check-live-schema.sh
case "$1" in
  --first-cycle)
    [[ $current == "$manual_id" && ! -e $control/enabled ]]
    candidate=$(python3 approved.py "$current")
    [[ $candidate =~ ^[0-9a-f]{40}$ ]]
    install -m 0600 /dev/null "$control/enabled"
    trap 'rc=$?; if ((rc)); then rm -f -- "$control/enabled"; fi' EXIT
    systemctl start siscota-cd.service
    [[ $(installed_id) == "$candidate" && ! -e $state/pending && ! -e $state/failed ]]
    ;;
  --timer)
    [[ $current =~ ^[0-9a-f]{40}$ && -f $control/enabled && -f $state/previous-transition ]]
    read -r previous promoted < "$state/previous-transition"
    [[ $promoted == "$current" ]]
    assert_release "$previous"
    health "$current"
    python3 approved.py --check-private
    systemctl enable --now siscota-cd.timer
    ;;
  *) exit 2 ;;
esac
