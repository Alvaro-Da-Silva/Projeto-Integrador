#!/usr/bin/env bash
set -euo pipefail
umask 077
[[ $EUID == 0 && $# == 1 ]] || { echo 'Execução administrativa autorizada exigida'; exit 1; }
bin=/usr/lib/postgresql/18/bin
connection=(--host=/var/run/postgresql --port=5432 --dbname=siscota --no-password)
as_postgres() {
  timeout 60s runuser -u postgres -- env -i PATH=/usr/bin:/bin \
    PGOPTIONS='-c default_transaction_read_only=on' "$@"
}
case "$1" in
  --ddl)
    as_postgres "$bin/pg_dump" --schema-only -n public "${connection[@]}" |
      sed '/^\restrict /d; /^\unrestrict /d; /^-- Dumped /d'
    ;;
  --privileges)
    as_postgres "$bin/psql" -X -v ON_ERROR_STOP=1 -A -F '|' "${connection[@]}" <<'SQL'
SELECT current_setting('transaction_read_only') AS read_only;
SELECT rolname, rolsuper, rolcreaterole, rolcreatedb, rolbypassrls
FROM pg_roles WHERE rolname = 'siscota' OR pg_has_role('siscota', oid, 'USAGE')
ORDER BY rolname;
SELECT n.nspname, has_schema_privilege('siscota', n.oid, 'CREATE') AS can_create
FROM pg_namespace n WHERE n.nspname = 'public';
SELECT c.relname, p.privilege, has_table_privilege('siscota', c.oid, p.privilege) AS allowed
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE')) p(privilege)
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
ORDER BY c.relname, p.privilege;
SELECT c.relname, a.attname, has_column_privilege('siscota', c.oid, a.attnum, 'UPDATE') AS can_update
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_attribute a ON a.attrelid = c.oid
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND a.attnum > 0 AND NOT a.attisdropped
ORDER BY c.relname, a.attnum;
SELECT c.relname, has_sequence_privilege('siscota', c.oid, 'USAGE') AS can_use
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'S'
ORDER BY c.relname;
SQL
    ;;
  *) exit 2 ;;
esac
