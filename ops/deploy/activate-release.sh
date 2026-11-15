#!/usr/bin/env bash
set -euo pipefail
base=/opt/siscota-deploy
candidate=${1:?release obrigatória}
case "$candidate" in "$base"/releases/*) ;; *) exit 2 ;; esac
[[ -d "$candidate/backend" && -d "$candidate/frontend/.next" ]]
previous=$(readlink -e "$base/current")
switch() {
  ln -s "$1" "$base/.current-$$"
  mv -Tf "$base/.current-$$" "$base/current"
}
restart_apps() { systemctl restart siscota-backend siscota-frontend; }
health() {
  local path status expected
  for attempt in {1..12}; do
    local ok=1
    for pair in '/login 200' '/api/auth/get-session 200' '/api/me 401' '/api/escalas/2026/11/calendario 200,404'; do
      read -r path expected <<< "$pair"
      status=$(curl --silent --max-time 4 -o /dev/null -w '%{http_code}' "http://localhost:3000$path") || status=000
      [[ ",$expected," == *",$status,"* ]] || ok=0
    done
    [[ $ok == 1 ]] && return 0
    sleep 1
  done
  return 1
}
switch "$candidate"
if restart_apps && health; then
  echo "Release saudável: $candidate"
else
  echo "Falha no health check; restaurando $previous" >&2
  switch "$previous"
  restart_apps
  health
  exit 1
fi
