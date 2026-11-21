-- Cadastro administrativo implementado em c844425. Executar com administrador.
-- Concede somente as escritas usadas pelo POST /api/usuarios ao runtime da VM.
BEGIN READ WRITE;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $$
BEGIN
  IF current_database() <> 'siscota' OR current_user = 'siscota'
     OR NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'siscota'
                    AND NOT rolsuper AND NOT rolcreaterole AND NOT rolcreatedb
                    AND NOT rolbypassrls) THEN
    RAISE EXCEPTION 'Exige banco siscota, runtime restrito e executor administrativo';
  END IF;
  IF (SELECT count(*) FROM pg_attribute
      WHERE attrelid IN ('public.usuario'::regclass, 'public.cotista'::regclass)
        AND attname = 'id' AND attidentity = 'a' AND NOT attisdropped) <> 2 THEN
    RAISE EXCEPTION 'IDs devem usar GENERATED ALWAYS AS IDENTITY conforme esquema revisado';
  END IF;
END;
$$;

GRANT INSERT ON public."user", public.account, public.usuario, public.cotista TO siscota;

DO $$
BEGIN
  IF NOT has_table_privilege('siscota', 'public."user"', 'INSERT')
     OR NOT has_table_privilege('siscota', 'public.account', 'INSERT')
     OR NOT has_table_privilege('siscota', 'public.usuario', 'INSERT')
     OR NOT has_table_privilege('siscota', 'public.cotista', 'INSERT') THEN
    RAISE EXCEPTION 'Permissões de cadastro incompletas';
  END IF;
END;
$$;
COMMIT;
