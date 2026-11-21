-- Recuperação da 008 para a VM auditada em 21/11/2026.
-- Conferir antes que os quatro privilégios estavam ausentes no snapshot pré-migração.
-- Contas criadas permanecem preservadas. Novos cadastros voltam a responder 503.
BEGIN READ WRITE;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO $$
BEGIN
  IF current_database() <> 'siscota' OR current_user = 'siscota' THEN
    RAISE EXCEPTION 'Exige banco siscota e executor administrativo';
  END IF;
END;
$$;
REVOKE INSERT ON public."user", public.account, public.usuario, public.cotista FROM siscota;
COMMIT;
