-- PROPOSTA PREPARADA: NAO EXECUTADA. Exige autorizacao explicita e proprietario.
-- Aplicacao manual, sem runner lexical e sem reaplicar 001/002/003.
-- Preparar backup recuperavel antes de DDL no banco principal.
BEGIN READ WRITE;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $$
BEGIN
  IF current_database() NOT IN ('siscota','siscota_test') THEN
    RAISE EXCEPTION 'Banco diferente dos destinos revisados';
  END IF;
  IF to_regclass('public.usuario') IS NULL OR to_regclass('public."user"') IS NULL THEN
    RAISE EXCEPTION 'Tabelas de identidade ausentes';
  END IF;
END;
$$;

LOCK TABLE public.usuario IN ACCESS EXCLUSIVE MODE;
ALTER TABLE public.usuario ADD COLUMN better_auth_user_id text;
ALTER TABLE public.usuario ADD CONSTRAINT usuario_better_auth_user_id_key UNIQUE (better_auth_user_id);
ALTER TABLE public.usuario ADD CONSTRAINT usuario_better_auth_user_id_fkey
  FOREIGN KEY (better_auth_user_id) REFERENCES public."user"(id) ON DELETE RESTRICT;
-- Preserva hashes historicos; novos usuarios nao precisam de senha duplicada.
-- Remover a coluna ou apagar valores antigos exige aprovacao separada.
ALTER TABLE public.usuario ALTER COLUMN senha_hash DROP NOT NULL;
COMMENT ON COLUMN public.usuario.better_auth_user_id IS 'Identidade Better Auth; associacao explicita, nunca por email';
COMMENT ON COLUMN public.usuario.senha_hash IS 'Legado sem uso na autenticacao; novos registros devem usar NULL';

COMMIT;
-- Nao associa contas, nao cria usuarios/perfis, nao altera cotista ou suas migracoes.
