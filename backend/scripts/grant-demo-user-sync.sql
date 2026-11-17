BEGIN;
DO $$
BEGIN
    IF current_database() <> 'siscota' THEN
        RAISE EXCEPTION 'Destino recusado: esperado siscota';
    END IF;
END $$;
GRANT UPDATE (nome,email) ON public.usuario TO siscota_codex;
COMMIT;
