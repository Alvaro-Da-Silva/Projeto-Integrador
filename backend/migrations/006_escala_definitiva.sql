ALTER TABLE public.escala ADD COLUMN IF NOT EXISTS publicada_em timestamp;

ALTER TABLE public.participacao ADD COLUMN IF NOT EXISTS origem varchar(20) NOT NULL DEFAULT 'automatica';
ALTER TABLE public.participacao ADD COLUMN IF NOT EXISTS atribuida_em timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  ALTER TABLE public.participacao
    ADD CONSTRAINT chk_participacao_origem CHECK (origem IN ('automatica','manual'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_participacao_plantao ON public.participacao (plantao_id);

CREATE TABLE IF NOT EXISTS public.escala_ajuste (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  escala_id bigint NOT NULL REFERENCES public.escala(id) ON DELETE CASCADE,
  acao varchar(30) NOT NULL CHECK (acao IN
    ('distribuicao_automatica','atribuicao_manual','substituicao','remocao','publicacao','despublicacao')),
  plantao_id bigint REFERENCES public.plantao(id) ON DELETE SET NULL,
  cotista_id bigint REFERENCES public.cotista(id),
  cotista_anterior_id bigint REFERENCES public.cotista(id),
  justificativa text,
  detalhes jsonb,
  usuario_id bigint REFERENCES public.usuario(id),
  realizado_em timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_escala_ajuste_escala ON public.escala_ajuste (escala_id, realizado_em DESC);
