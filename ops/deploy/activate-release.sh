#!/usr/bin/env bash
# Carregado pelo coordenador sob o mesmo lock usado pela recuperação.
switch_to() {
  local sha=$1 next
  assert_release "$sha" || return 1
  next=$(mktemp -d "$state/switch.XXXXXX") || return 1
  ln -s "$releases/$sha" "$next/current" &&
    mv -Tf "$next/current" "$state/current" && rmdir "$next" || return 1
  systemctl restart "${services[@]}" && health "$sha"
}

restore_pending() {
  local previous candidate
  read -r previous candidate < "$state/pending" || return 1
  assert_release "$previous" && assert_release "$candidate" || return 1
  # Mantém o CD bloqueado depois de uma tentativa malsucedida.
  switch_to "$previous" || return 1
  mv -T "$state/pending" "$state/failed"
}

activate() {
  local previous=$1 candidate=$2
  assert_control && assert_release "$previous" && assert_release "$candidate" || return 1
  [[ $(installed_id) == "$previous" && $(release_id "$(readlink -e "$state/current")") == "$previous" ]] || return 1
  printf '%s %s\n' "$previous" "$candidate" > "$state/pending.next" &&
    mv -T "$state/pending.next" "$state/pending" || return 1
  if switch_to "$candidate"; then
    mv -T "$state/pending" "$state/previous-transition"
  else
    restore_pending || printf '%s\n' 'Recuperação incompleta. Verifique o registro pending.' >&2
    return 1
  fi
}
