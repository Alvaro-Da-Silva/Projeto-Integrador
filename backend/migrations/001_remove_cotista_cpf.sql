BEGIN READ WRITE;
DO $$
BEGIN
    IF current_database() <> 'siscota' THEN
        RAISE EXCEPTION 'Destino recusado: esperado siscota';
    END IF;
END $$;

ALTER TABLE public.cotista DROP CONSTRAINT IF EXISTS cotista_cpf_key;
ALTER TABLE public.cotista DROP COLUMN cpf RESTRICT;

COMMIT;
