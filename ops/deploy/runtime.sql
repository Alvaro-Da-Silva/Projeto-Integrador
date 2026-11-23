-- Privilégios simulados no cluster efêmero do CI.
ALTER TABLE public."user" ADD COLUMN IF NOT EXISTS patent text;
ALTER TABLE public.jwks ADD COLUMN IF NOT EXISTS alg text;
ALTER TABLE public.jwks ADD COLUMN IF NOT EXISTS crv text;
GRANT USAGE ON SCHEMA public TO siscota;
GRANT SELECT ON public.usuario, public.cotista, public.perfil, public.periodo,
  public.escala, public.dia, public.plantao, public.disponibilidade TO siscota;
GRANT INSERT, UPDATE ON public.escala, public.dia, public.plantao, public.disponibilidade TO siscota;
GRANT DELETE ON public.disponibilidade TO siscota;
GRANT UPDATE (id) ON public.cotista, public.periodo TO siscota;
GRANT USAGE ON SEQUENCE public.escala_id_seq, public.dia_id_seq, public.plantao_id_seq,
  public.disponibilidade_id_seq, public.participacao_id_seq, public.escala_ajuste_id_seq TO siscota;
GRANT SELECT ON public."user", public.account, public.session, public.verification TO siscota;
GRANT INSERT, UPDATE, DELETE ON public.session TO siscota;
GRANT SELECT, INSERT ON public.jwks, public.escala_ajuste TO siscota;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.participacao TO siscota;
