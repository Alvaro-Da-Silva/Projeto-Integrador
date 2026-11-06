-- PREPARADA, NAO EXECUTADA. Aplicar somente apos autorizacao e backup protegido.
-- Revisada contra DDL salvo; dependencias do banco ativo ainda nao verificadas.
-- Executar com cliente configurado para interromper em erros (psql ON_ERROR_STOP).
-- Sem CASCADE: dependencias externas nao previstas devem impedir a remocao.
BEGIN READ WRITE;
DO $$
BEGIN
    IF current_database() <> 'siscota' THEN
        RAISE EXCEPTION 'Destino recusado: esperado siscota';
    END IF;
END $$;

ALTER TABLE public.cotista DROP CONSTRAINT IF EXISTS cotista_cpf_key;
ALTER TABLE public.cotista DROP COLUMN cpf RESTRICT;

-- DROP COLUMN remove NOT NULL e indices/constraints locais da coluna.
-- IDs, FKs e registros permanecem; os valores antigos da coluna sao removidos.
-- Nao ha rollback que recupere valores apos COMMIT sem backup.
COMMIT;
