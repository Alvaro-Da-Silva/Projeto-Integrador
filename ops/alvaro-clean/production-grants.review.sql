-- Proposed supplement. Run only in the separately approved migration window,
-- after reviewing 005, 006 and 007 and comparing the definitive catalog.
DO $check$
BEGIN
  IF current_database() <> 'siscota' OR current_user = 'siscota' THEN
    RAISE EXCEPTION 'Exige administração do destino definitivo aprovado';
  END IF;
END
$check$;

ALTER TABLE public."user" ADD COLUMN IF NOT EXISTS patent text;
ALTER TABLE public.jwks ADD COLUMN IF NOT EXISTS alg text;
ALTER TABLE public.jwks ADD COLUMN IF NOT EXISTS crv text;
GRANT SELECT, INSERT ON public.jwks TO siscota;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.participacao TO siscota;
GRANT SELECT, INSERT ON public.escala_ajuste TO siscota;
GRANT USAGE ON SEQUENCE public.participacao_id_seq, public.escala_ajuste_id_seq TO siscota;
GRANT UPDATE (id) ON public.periodo TO siscota;
-- Existing grants on public.session are required. This file adds no rights
-- to create or alter identities, users, profiles or cotistas.
