BEGIN READ WRITE;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO $$
BEGIN
  IF current_database() <> 'siscota' OR current_user = 'siscota_codex' THEN
    RAISE EXCEPTION 'Exige destino siscota e papel administrativo autorizado';
  END IF;
END;
$$;

GRANT SELECT ON public."user",public.account,public.session,public.verification TO siscota_codex;
GRANT INSERT ON public."user",public.account TO siscota_codex;
GRANT INSERT,UPDATE,DELETE ON public.session TO siscota_codex;
GRANT UPDATE (password,"updatedAt") ON public.account TO siscota_codex;

ALTER ROLE siscota_codex IN DATABASE siscota SET default_transaction_read_only = off;
COMMIT;

