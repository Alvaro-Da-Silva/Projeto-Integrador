#!/usr/bin/env bash
base=/home/siscota/siscota-deploy
releases=/srv/siscota-cd/releases
state=/var/lib/siscota-cd
control=/etc/siscota-cd
manual_legacy=$base/releases/manual-4853675-6530ac7fafa2
manual_id=manual-bf7d837b0504682f67fc259f36e74c85e079cab892dcc19da159e3a12777cd2e
services=(siscota-backend.service siscota-frontend.service)

installed_path() {
  local service component pid cwd release path=''
  for service in "${services[@]}"; do
    component=${service#siscota-}
    component=${component%.service}
    pid=$(systemctl show "$service" -p MainPID --value) || return 1
    [[ $pid =~ ^[1-9][0-9]*$ ]] || return 1
    cwd=$(readlink -e "/proc/$pid/cwd") || return 1
    [[ $cwd == */"$component" ]] || return 1
    release=${cwd%/*}
    [[ -z $path || $path == "$release" ]] || return 1
    path=$release
  done
  printf '%s\n' "$path"
}

release_id() {
  local path=$1 id=${1##*/}
  if [[ $path == "$manual_legacy" ]]; then
    printf '%s\n' "$manual_id"
  elif [[ $path == "$releases/$id" ]] && assert_release "$id"; then
    printf '%s\n' "$id"
  else
    return 1
  fi
}

installed_id() {
  local path
  path=$(installed_path) || return 1
  release_id "$path"
}

verify_active_manual() {
  if [[ $(installed_path) == "$manual_legacy" ]]; then
    python3 -B /usr/local/lib/siscota-cd/verify-manual.py "$manual_legacy" "$state/manual-artifact.sha256" >&2
  fi
}

trusted_dir() {
  [[ $(realpath -e "$1") == "$1" && $(stat -c '%u' "$1") == 0 &&
     $(find "$1" -maxdepth 0 -perm /022 -printf writable) != writable ]]
}

assert_release() {
  [[ $1 == "$manual_id" || $1 =~ ^[0-9a-f]{40}$ ]] &&
  trusted_dir "$releases/$1" &&
  [[ -f "$releases/$1/backend/src/server.js" && -s "$releases/$1/frontend/.next/BUILD_ID" ]]
}

assert_control() {
  local dir service component target
  for dir in /srv /srv/siscota-cd "$releases" "$state" "$control"; do
    trusted_dir "$dir" || return 1
  done
  for service in "${services[@]}"; do
    component=${service#siscota-}
    component=${component%.service}
    [[ $(systemctl show "$service" -p WorkingDirectory --value) == "$state/current/$component" ]] || return 1
  done
  [[ -L $state/current ]] || return 1
  target=$(readlink -e "$state/current") || return 1
  [[ $target == "$releases/"* ]] && release_id "$target" >/dev/null
}

health() {
  local expected=$1 attempt login session me
  for attempt in {1..12}; do
    login=$(probe /login) || login=000
    session=$(probe /api/auth/get-session) || session=000
    me=$(probe /api/me) || me=000
    if [[ $login == 200 && $session == 200 && $me == 401 ]] &&
       [[ $(installed_id) == "$expected" ]]; then
      return 0
    fi
    sleep 2
  done
  return 1
}

probe() {
  curl -q --silent --noproxy '*' --max-time 4 --header 'Host: teste.siscota.app.br' \
    --output /dev/null --write-out '%{http_code}' "http://127.0.0.1:3000$1"
}
