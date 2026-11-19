BEGIN READ WRITE;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO $$
BEGIN
  IF current_database() <> 'siscota' OR current_user = 'siscota_codex' THEN
    RAISE EXCEPTION 'Exige destino siscota e papel administrativo autorizado';
  END IF;
END;
$$;

GRANT SELECT, INSERT ON public."user", public.account TO siscota_codex;
GRANT UPDATE (name, patent, role, banned, "banReason", "banExpires", "updatedAt") ON public."user" TO siscota_codex;
GRANT SELECT, DELETE ON public.session TO siscota_codex;

GRANT SELECT ON public.perfil TO siscota_codex;
GRANT SELECT, INSERT ON public.usuario, public.cotista TO siscota_codex;
GRANT UPDATE (nome, perfil_id, status) ON public.usuario TO siscota_codex;
GRANT UPDATE (nome, status) ON public.cotista TO siscota_codex;

COMMIT;
