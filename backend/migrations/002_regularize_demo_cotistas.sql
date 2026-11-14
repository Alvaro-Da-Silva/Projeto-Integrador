BEGIN READ WRITE;
DO $$
BEGIN
    IF current_database() <> 'siscota' THEN
        RAISE EXCEPTION 'Destino recusado: esperado siscota';
    END IF;
    PERFORM id FROM public.cotista WHERE id IN (5,6,7,8) FOR UPDATE;
    IF (SELECT count(*) FROM public.cotista WHERE id IN (5,6,7,8)) <> 4 THEN
        RAISE EXCEPTION 'Esperados quatro cotistas ficticios';
    END IF;
    IF EXISTS (SELECT FROM public.cotista WHERE id IN (5,6,7,8)
        AND (status <> 'ativo' OR (id=5 AND usuario_id IS DISTINCT FROM 2)
            OR (id<>5 AND usuario_id IS NOT NULL))) THEN
        RAISE EXCEPTION 'Status ou vinculos mudaram: revisar antes de prosseguir';
    END IF;
    IF EXISTS (SELECT FROM public.cotista WHERE id IN (5,6,7,8)
        AND (NULLIF(btrim(telefone),'') IS NOT NULL
          OR NULLIF(btrim(email),'') IS NOT NULL OR data_nascimento IS NOT NULL)) THEN
        RAISE EXCEPTION 'Dados ja preenchidos: nao sobrescrever nem reaplicar';
    END IF;
END $$;

UPDATE public.cotista AS c
SET telefone=p.telefone,email=p.email,data_nascimento=p.nascimento
FROM (VALUES
    (5::bigint,'TESTE-TELEFONE-05','cotista05@example.com',DATE '1990-01-05'),
    (6::bigint,'TESTE-TELEFONE-06','cotista06@example.com',DATE '1990-01-06'),
    (7::bigint,'TESTE-TELEFONE-07','cotista07@example.com',DATE '1990-01-07'),
    (8::bigint,'TESTE-TELEFONE-08','cotista08@example.com',DATE '1990-01-08')
) AS p(id,telefone,email,nascimento)
WHERE c.id=p.id;
COMMIT;
