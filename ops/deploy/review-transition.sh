#!/usr/bin/env bash
set -euo pipefail
umask 077
cd -- "$(dirname -- "$0")"
source ./release-paths.sh
[[ $EUID == 0 ]] || exit 1
assert_control
exec 9>"$state/deploy.lock"
flock -n 9
[[ ! -e $state/pending && ! -e $state/failed ]]
current=$(installed_id)
if [[ $current == "$manual_id" ]]; then verify_active_manual; fi
candidate=$(python3 approved.py "$current" --show-review)
if [[ -z $candidate ]]; then
  printf '%s\n' 'A ponta coincide com a release ativa.'
  exit 0
fi
[[ ( $current == "$manual_id" || $current =~ ^[0-9a-f]{40}$ ) && $candidate =~ ^[0-9a-f]{40}$ ]]
printf 'Em execução: %s\nCandidata: %s\n' "$current" "$candidate"
printf '%s\n' 'Revise o diff e a preservação das URLs públicas, frontend, backend e autenticação em relação à release em execução. Confirme a compatibilidade com o snapshot aprovado.'
read -r -p 'Digite AUTORIZAR para registrar esta transição: ' confirmation </dev/tty
[[ $confirmation == AUTORIZAR ]]
[[ $(installed_id) == "$current" && $(python3 approved.py "$current" --show-review) == "$candidate" ]]
bash ./check-live-schema.sh
pending=$(mktemp "$control/reviewed-transition.XXXXXX")
trap 'rm -f -- "$pending"' EXIT
printf '%s %s\n' "$current" "$candidate" > "$pending"
mv -Tf "$pending" "$control/reviewed-transition"
printf '%s\n' 'Transição registrada. Este comando não promove releases.'
