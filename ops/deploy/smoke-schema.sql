SET ROLE siscota;
SELECT u.better_auth_user_id, a.role, a.banned, a."banReason", a."banExpires", a.patent
  FROM public.usuario u LEFT JOIN public."user" a ON a.id = u.better_auth_user_id LIMIT 0;
SELECT "impersonatedBy" FROM public.session LIMIT 0;
SELECT alg, crv FROM public.jwks LIMIT 0;
SELECT publicada_em FROM public.escala LIMIT 0;
SELECT origem, atribuida_em FROM public.participacao LIMIT 0;
SELECT motivo FROM public.escala_ajuste LIMIT 0;
DO $$
BEGIN
  IF has_table_privilege(current_user, 'public."user"', 'INSERT')
     OR has_any_column_privilege(current_user, 'public."user"', 'UPDATE')
     OR has_table_privilege(current_user, 'public.account', 'INSERT')
     OR has_schema_privilege(current_user, 'public', 'CREATE')
     OR NOT has_table_privilege(current_user, 'public.jwks', 'INSERT')
     OR NOT has_table_privilege(current_user, 'public.escala_ajuste', 'INSERT')
     OR NOT has_table_privilege(current_user, 'public.session', 'DELETE') THEN
    RAISE EXCEPTION 'Privilégios da fixture divergentes do contrato revisado';
  END IF;
END $$;
