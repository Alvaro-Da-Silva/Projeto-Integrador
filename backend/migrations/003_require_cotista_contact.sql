-- PREPARADA, NAO EXECUTADA. Apos regularizacao aprovada e remocao do CPF.
-- Sem CASCADE; altera somente public.cotista. Usar ON_ERROR_STOP.
BEGIN READ WRITE;
DO $$
BEGIN
    IF current_database() <> 'siscota' THEN
        RAISE EXCEPTION 'Destino recusado: esperado siscota';
    END IF;
END $$;
LOCK TABLE public.cotista IN ACCESS EXCLUSIVE MODE;
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_attribute
        WHERE attrelid='public.cotista'::regclass AND attname='cpf' AND NOT attisdropped) THEN
        RAISE EXCEPTION 'Remocao de CPF ainda pendente';
    END IF;
    IF EXISTS (SELECT FROM public.cotista WHERE nome IS NULL
        OR telefone IS NULL OR telefone !~ '[^[:space:]]'
        OR email IS NULL OR email !~ '[^[:space:]]'
        OR data_nascimento IS NULL) THEN
        RAISE EXCEPTION 'Cadastros incompletos: nenhuma constraint aplicada';
    END IF;
END $$;
ALTER TABLE public.cotista
    ALTER COLUMN telefone SET NOT NULL,
    ALTER COLUMN email SET NOT NULL,
    ALTER COLUMN data_nascimento SET NOT NULL,
    ADD CONSTRAINT chk_cotista_telefone_nao_vazio CHECK (telefone ~ '[^[:space:]]'),
    ADD CONSTRAINT chk_cotista_email_nao_vazio CHECK (email ~ '[^[:space:]]');
-- Nomes fixos das constraints impedem reaplicacao silenciosa.
COMMIT;
