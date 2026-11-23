#!/usr/bin/env bash
set -euo pipefail
umask 077
root=$(cd -- "$(dirname -- "$0")/../.." && pwd)
[[ ${GITHUB_ACTIONS:-} == true ]] || { echo 'Fixture destinada ao runner isolado de CI'; exit 1; }
bin=/usr/lib/postgresql/18/bin
work=$(mktemp -d /tmp/siscota-ci.XXXXXXXX)
pg() { env -i PATH=/usr/bin:/bin HOME="$work" "$@"; }
cleanup() {
  pg "$bin/pg_ctl" -D "$work/data" -w stop >/dev/null 2>&1 || true
  rm -rf -- "$work"
}
trap cleanup EXIT
pg "$bin/initdb" -D "$work/data" -U postgres -A trust --no-instructions >/dev/null
pg "$bin/pg_ctl" -D "$work/data" -l "$work/pg.log" -o "-c listen_addresses='' -k $work -p 55432" -w start >/dev/null
sql() { pg "$bin/psql" -X -v ON_ERROR_STOP=1 -h "$work" -p 55432 -U postgres "$@"; }
sql -q -d postgres -c 'CREATE DATABASE siscota TEMPLATE template0'
sql -q -d postgres -c 'CREATE ROLE siscota NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE'
sed -e 's/\r$//' -e '/^CREATE SCHEMA public;$/d' "$root/backend/scripts/siscota-test-schema.sql" |
  sql -q -1 -d siscota -f -
for migration in 003_require_cotista_contact 004_link_better_auth_identity 005_better_auth_admin_cli \
                 006_escala_definitiva 007_ajuste_motivo_desistencia; do
  sql -q -d siscota -f "$root/backend/migrations/$migration.sql"
done
sql -q -1 -d siscota -f "$root/ops/deploy/runtime.sql" -f "$root/ops/deploy/smoke-schema.sql"
# Valida primeiro o baseline anterior e depois a expansão revisada para cadastro.
sql -q -d siscota -f "$root/backend/migrations/008_user_provisioning_runtime.sql"
sql -q -d siscota <<'SQL'
DO $$
BEGIN
  IF NOT has_table_privilege('siscota', 'public."user"', 'INSERT')
     OR NOT has_table_privilege('siscota', 'public.account', 'INSERT')
     OR NOT has_table_privilege('siscota', 'public.usuario', 'INSERT')
     OR NOT has_table_privilege('siscota', 'public.cotista', 'INSERT')
     OR NOT has_table_privilege('siscota', 'public.disponibilidade', 'DELETE')
     OR has_table_privilege('siscota', 'public."user"', 'DELETE')
     OR has_schema_privilege('siscota', 'public', 'CREATE') THEN
    RAISE EXCEPTION 'Contrato de permissões de cadastro divergente';
  END IF;
END $$;
SQL
