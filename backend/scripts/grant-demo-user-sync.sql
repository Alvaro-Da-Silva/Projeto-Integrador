-- PREPARADO, NAO EXECUTADO. Administrador conectado exclusivamente a siscota.
-- Permissao minima para sincronizar nome/email do usuario ficticio vinculado.
BEGIN;
DO $$
BEGIN
    IF current_database() <> 'siscota' THEN
        RAISE EXCEPTION 'Destino recusado: esperado siscota';
    END IF;
END $$;
GRANT UPDATE (nome,email) ON public.usuario TO siscota_codex;
COMMIT;
-- A concessao vale para essas colunas em todas as linhas, nao apenas usuario 2.
-- Alternativa sem concessao: administrador executar a correcao revisada.
