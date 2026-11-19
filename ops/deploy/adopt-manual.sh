#!/usr/bin/env bash
set -euo pipefail
umask 077
[[ $EUID == 0 && $# == 1 && $1 =~ ^[0-9a-f]{64}$ ]] || exit 2
cd -- "$(dirname -- "$0")"
printf '%s  SHA256SUMS\n' "$1" | sha256sum -c --quiet
sha256sum -c --quiet SHA256SUMS
source ./release-paths.sh
manifest=$base/staging/cicd-preview-20261116/integracao-20261116/manual-4853675/ARTIFACT.sha256
lib=/usr/local/lib/siscota-cd
[[ $(systemctl is-enabled siscota-cd.timer || true) == disabled ]]
! systemctl is-active --quiet siscota-cd.timer
[[ ! -e $control/enabled && ! -e $state/pending && ! -e $state/failed ]]
[[ $(installed_path) == "$manual_legacy" ]]
[[ ! -e $state/current && ! -L $state/current && ! -e $releases/$manual_id ]]
trusted_dir "$state"
trusted_dir "$control"
trusted_dir "$lib"
trusted_dir /srv
for component in backend frontend; do
  [[ ! -e /etc/systemd/system/siscota-$component.service.d/99-siscota-cd.conf ]]
  [[ $(systemctl show "siscota-$component.service" -p WorkingDirectory --value) == "$manual_legacy/$component" ]]
done
exec 9>"$state/deploy.lock"
flock -n 9
python3 -B verify-manual.py "$manual_legacy" "$manifest"
install -d -o root -g root -m 0755 /srv/siscota-cd "$releases"
trusted_dir /srv/siscota-cd && trusted_dir "$releases"
scratch=$(mktemp -d "$releases/.adopt.XXXXXX")
backup=$(mktemp -d "$state/adoption-backup.XXXXXX")
app_modules=(release-paths.sh siscota-version activate-release.sh recover-release.sh poll.sh
             review-transition.sh prepare-release.sh approval_gate.py approved.py arm-cd.sh verify-manual.py)
changed=0
cleanup() {
  local code=$?
  if ((code != 0 && changed)); then
    for component in backend frontend; do
      rm -f -- "/etc/systemd/system/siscota-$component.service.d/99-siscota-cd.conf"
    done
    rm -f -- "$state/current"
    for f in "${app_modules[@]}"; do
      if [[ -f $backup/$f ]]; then
        install -m 0755 "$backup/$f" "$lib/$f"
      else
        rm -f -- "$lib/$f"
      fi
    done
    systemctl daemon-reload
  fi
  rm -rf -- "$scratch"
  return "$code"
}
trap cleanup EXIT
tar --exclude='./frontend/.next/cache' -C "$manual_legacy" -cf - . | tar -C "$scratch" -xf -
python3 -B verify-manual.py "$scratch" "$manifest"
chown -hR root:root "$scratch"
chmod -R a+rX,go-w,a-s "$scratch"
chmod 0755 "$scratch"
install -d -o siscota -g siscota -m 0755 "$scratch/frontend/.next/cache"
mv -T "$scratch" "$releases/$manual_id"
assert_release "$manual_id"
install -m 0600 "$manifest" "$state/manual-artifact.sha256"
for f in "${app_modules[@]}"; do
  if [[ -f $lib/$f ]]; then cp -a -- "$lib/$f" "$backup/$f"; fi
done
before=$(installed_path)
pids=$(systemctl show "${services[@]}" -p MainPID)
changed=1
for f in "${app_modules[@]}"; do install -m 0755 "$f" "$lib/$f"; done
ln -s "$releases/$manual_id" "$state/current"
for component in backend frontend; do
  printf '[Service]\nWorkingDirectory=%s/current/%s\n' "$state" "$component" \
     > "/etc/systemd/system/siscota-$component.service.d/99-siscota-cd.conf"
  chmod 0644 "/etc/systemd/system/siscota-$component.service.d/99-siscota-cd.conf"
done
systemd-analyze verify "${services[@]}"
systemctl daemon-reload
assert_control
[[ $(installed_path) == "$before" && $(systemctl show "${services[@]}" -p MainPID) == "$pids" ]]
printf 'Release manual registrada: %s\nBackup dos scripts: %s\n' "$manual_id" "$backup"
