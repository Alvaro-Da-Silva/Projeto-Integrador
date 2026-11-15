-- PREPARADO, NAO EXECUTADO. Exige conexao administrativa autorizada em siscota.
-- Somente privilegios das operacoes habilitadas e criacao futura de identidades
-- explicitamente aprovadas. Nao cria contas, nao altera dados nem senhas.
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

-- Escopo apenas papel/banco; nao alterar o padrao global do servidor.
-- Exige abrir conexoes novas e conferir SHOW default_transaction_read_only.
ALTER ROLE siscota_codex IN DATABASE siscota SET default_transaction_read_only = off;
COMMIT;

-- Nao concede UPDATE em usuario, DELETE em user/account, DDL, propriedade,
-- SUPERUSER, BYPASSRLS ou privilegios globais. Nao altera outras ACLs existentes.
-- Verificacao/convite/reset nao publicados: sem novas escritas em verification.
-- Se esses fluxos forem aprovados, revisar os privilegios especificos antes.
