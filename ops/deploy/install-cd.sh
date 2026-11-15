#!/usr/bin/env bash
set -euo pipefail
test "$(id -u)" = 0
test "$(hostname)" = siscota
src=${1:?informe o diretório revisado da release}
sha=${2:?informe o SHA da release aprovada}
[[ "$sha" =~ ^[0-9a-f]{40}$ ]]
test -r /etc/siscota-cd/github.curl
test "$(stat -c '%U:%a' /etc/siscota-cd/github.curl)" = root:600
approved=$(python3 "$src/ops/deploy/approved.py")
test "$approved" = "$sha"
systemctl is-active --quiet postgresql@18-main
systemctl is-active --quiet nginx
systemctl is-active --quiet siscota-backend
systemctl is-active --quiet siscota-frontend
base=/opt/siscota-deploy
state=/var/lib/siscota-cd
test ! -e "$base/current"
for name in siscota-backend siscota-frontend; do
  test ! -e "/etc/systemd/system/$name.service.d/20-release.conf"
done
old=/home/siscota/siscota-deploy/releases
test -d "$old/01ba3ca6dfeb3b0401b24d4554d75fd05c1dcb10/backend"
test -d "$old/250f71ecc959cc0ee3b9e88162c7e2c2495bf987/frontend/.next"
getent passwd siscota-ci >/dev/null ||
  useradd --system --no-create-home --home-dir /var/lib/siscota-ci --shell /usr/sbin/nologin siscota-ci
install -d -o siscota-ci -g siscota-ci -m 0700 /var/lib/siscota-ci
install -d -m 0755 "$base/releases/baseline" /opt/siscota-tools /usr/local/lib/siscota-cd
install -d -m 0700 "$state"
cp -aL /home/siscota/.local/siscota-tools/node /opt/siscota-tools/node
cp -a /home/siscota/.local/siscota-tools/pnpm /opt/siscota-tools/pnpm
chown -hR root:root /opt/siscota-tools
ln -s "$old/01ba3ca6dfeb3b0401b24d4554d75fd05c1dcb10/backend" "$base/releases/baseline/backend"
ln -s "$old/250f71ecc959cc0ee3b9e88162c7e2c2495bf987/frontend" "$base/releases/baseline/frontend"
ln -s "$base/releases/baseline" "$base/current"
for file in approved.py persistence.py activate-release.sh poll.sh; do
  install -m 0755 "$src/ops/deploy/$file" "/usr/local/lib/siscota-cd/$file"
done
(
  cd "$src"
  python3 /usr/local/lib/siscota-cd/persistence.py > "$state/persistence.paths"
  while IFS= read -r file; do sha256sum "$file"; done < "$state/persistence.paths" > "$state/persistence.sha256"
)
for name in backend frontend; do
  dir="/etc/systemd/system/siscota-$name.service.d"
  install -d -m 0755 "$dir"
  printf '[Service]\nWorkingDirectory=%s/current/%s\n' "$base" "$name" > "$dir/20-release.conf"
done
for file in siscota-cd.service siscota-cd.timer; do
  install -m 0644 "$src/ops/deploy/$file" "/etc/systemd/system/$file"
done
systemctl daemon-reload
systemd-analyze verify siscota-cd.{service,timer} siscota-backend.service siscota-frontend.service
systemctl start siscota-cd.service
systemctl enable --now siscota-cd.timer
