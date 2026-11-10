-- PROPOSTA OPCIONAL: NAO EXECUTADA. Somente para provisionador oficial Admin/CLI.
-- O servidor HTTP NAO habilita Admin. Aprovar separadamente de 004.
-- Campos obtidos de getAuthTables({plugins:[admin()]}) do Better Auth 1.7.19.
BEGIN READ WRITE;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO $$
BEGIN
  IF current_database() NOT IN ('siscota','siscota_test') THEN
    RAISE EXCEPTION 'Banco diferente dos destinos revisados';
  END IF;
END;
$$;
ALTER TABLE public."user" ADD COLUMN role text;
ALTER TABLE public."user" ADD COLUMN banned boolean DEFAULT false;
ALTER TABLE public."user" ADD COLUMN "banReason" text;
ALTER TABLE public."user" ADD COLUMN "banExpires" timestamptz;
ALTER TABLE public.session ADD COLUMN "impersonatedBy" text;
COMMIT;
-- Nao cria nem associa contas, nao concede admin, nao altera senhas ou vinculos.
