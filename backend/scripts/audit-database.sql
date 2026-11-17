SELECT
    current_database() AS banco,
    (SELECT count(*) FROM public.escala) AS escalas,
    (SELECT count(*) FROM public.dia) AS dias,
    (SELECT count(*) FROM public.periodo) AS periodos,
    (SELECT count(*) FROM public.plantao) AS plantoes,
    (SELECT count(*) FROM public.dia d LEFT JOIN public.escala e ON e.id=d.escala_id WHERE e.id IS NULL) AS dias_orfaos,
    (SELECT count(*) FROM public.plantao p LEFT JOIN public.dia d ON d.id=p.dia_id WHERE d.id IS NULL) AS plantoes_sem_dia,
    (SELECT count(*) FROM public.plantao p LEFT JOIN public.periodo r ON r.id=p.periodo_id WHERE r.id IS NULL) AS plantoes_sem_periodo,
    (SELECT count(*) FROM public.dia d JOIN public.escala e ON e.id=d.escala_id WHERE d.data<e.data_inicio OR d.data>e.data_fim) AS dias_fora_intervalo,
    (SELECT count(*) FROM public.escala WHERE ano>9999) AS anos_inacessiveis_pela_api,
    (SELECT count(*) FROM public.escala WHERE quantidade_cotas_padrao NOT IN (3,4)) AS cotas_sem_regra_aprovada;

