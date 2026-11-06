-- Preparado, nao executado por Codex. Executar como administrador em siscota.
-- Nenhuma alteracao de tabelas/colunas ou escrita em user/account/session/jwks.
BEGIN READ WRITE;
DO $$ BEGIN
    IF current_database() <> 'siscota' THEN
        RAISE EXCEPTION 'Destino recusado: esperado siscota';
    END IF;
END $$;

GRANT SELECT, INSERT, UPDATE ON public.disponibilidade TO siscota_codex;
-- INSERT para provisionar contas pelo script administrativo, nao por cadastro publico.
GRANT SELECT, INSERT ON public.usuario, public.perfil TO siscota_codex;

DO $$
DECLARE tabela text; sequencia text;
BEGIN
    FOREACH tabela IN ARRAY ARRAY['disponibilidade','usuario','perfil'] LOOP
        sequencia := pg_get_serial_sequence(format('public.%I',tabela),'id');
        IF sequencia IS NOT NULL THEN
            EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %s TO siscota_codex',sequencia);
        END IF;
    END LOOP;
END $$;
COMMIT;
