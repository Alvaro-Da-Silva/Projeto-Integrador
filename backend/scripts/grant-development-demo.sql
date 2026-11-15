-- Preparado, NAO executado. Requer administrador; nao modifica o modelo fisico.
-- Destino exclusivo siscota. Nao concede acesso de escrita a tabelas de autenticacao.
BEGIN READ WRITE;
DO $$
BEGIN
    IF current_database() <> 'siscota' THEN
        RAISE EXCEPTION 'Destino recusado: esperado siscota';
    END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE
    ON public.escala, public.dia, public.periodo, public.plantao, public.cotista
    TO siscota_codex;

DO $$
DECLARE
    tabela text;
    sequencia text;
BEGIN
    FOREACH tabela IN ARRAY ARRAY['escala','dia','periodo','plantao','cotista'] LOOP
        sequencia := pg_get_serial_sequence(format('public.%I', tabela), 'id');
        IF sequencia IS NOT NULL THEN
            EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %s TO siscota_codex', sequencia);
        END IF;
    END LOOP;
END $$;
COMMIT;

-- O seed usa BEGIN READ WRITE apenas em sua propria transacao.
-- Nao e necessario alterar o default_transaction_read_only do usuario.
-- Nao e necessario conceder CREATE/ALTER para esta carga.
