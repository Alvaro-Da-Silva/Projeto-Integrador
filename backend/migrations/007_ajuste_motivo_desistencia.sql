ALTER TABLE public.escala_ajuste ADD COLUMN IF NOT EXISTS motivo varchar(30);

DO $$
BEGIN
  ALTER TABLE public.escala_ajuste
    ADD CONSTRAINT chk_escala_ajuste_motivo CHECK (motivo IS NULL OR motivo IN ('desistencia'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
