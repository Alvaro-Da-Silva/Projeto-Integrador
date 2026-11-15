#!/usr/bin/env bash
set -euo pipefail
umask 077
root=$(cd -- "$(dirname -- "$0")/../.." && pwd)
work=$(mktemp -d)
bin=${PG_BIN:-/usr/lib/postgresql/18/bin}
export PGHOST="$work" PGPORT=55432 PGUSER=postgres PGDATABASE=siscota
unset DATABASE_URL PGPASSWORD PGSERVICE
"$bin/initdb" -D "$work/data" -U postgres -A trust --no-instructions >/dev/null
"$bin/pg_ctl" -D "$work/data" -l "$work/pg.log" -o "-c listen_addresses='' -k $work -p 55432" -w start >/dev/null
cleanup() {
  "$bin/pg_ctl" -D "$work/data" -w stop >/dev/null
  rm -rf -- "$work"
}
trap cleanup EXIT
sql() { "$bin/psql" -X -v ON_ERROR_STOP=1 "$@"; }
sql -q -d postgres -c 'CREATE DATABASE siscota TEMPLATE template0'
sql -q -d postgres -c 'CREATE ROLE siscota LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE'
{
  sed -e 's/\r$//' -e '/^CREATE SCHEMA public;$/d' "$root/backend/scripts/siscota-test-schema.sql"
  sed -e 's/\r$//' -e '/^BEGIN READ WRITE;$/d' -e '/^COMMIT;$/d' \
    "$root/backend/migrations/003_require_cotista_contact.sql" "$root/backend/migrations/004_link_better_auth_identity.sql"
  cat "$root/ops/deploy/runtime.sql"
} | sql -q -1 -f - >/dev/null
if [[ $# == 1 ]]; then
  "$bin/pg_dump" --schema-only --no-privileges --no-owner -n public |
    sed '/^\\restrict /d; /^\\unrestrict /d; /^--/d; /^$/d' > "$1"
fi
cd "$root/backend"
PGUSER=siscota node ../ops/deploy/smoke-db.mjs
