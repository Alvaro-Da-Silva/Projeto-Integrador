INSERT INTO public.perfil (nome) VALUES ('admin'), ('cotista');
INSERT INTO public.periodo (codigo,nome,hora_inicio,hora_fim) VALUES
 ('D','Diurno','07:00','19:00'),('N1','Noturno 1','19:00','07:00'),
 ('N2','Noturno 2','18:00','06:00'),('I','Disponibilidade flexível','07:00','07:00');
GRANT USAGE ON SCHEMA public TO siscota;
GRANT SELECT ON public.usuario,public.cotista,public.perfil,public.periodo,public.escala,public.dia,public.plantao,public.disponibilidade TO siscota;
GRANT INSERT,UPDATE ON public.escala,public.dia,public.plantao,public.disponibilidade TO siscota;
GRANT UPDATE (id) ON public.cotista TO siscota;
GRANT USAGE ON SEQUENCE public.escala_id_seq,public.dia_id_seq,public.plantao_id_seq,public.disponibilidade_id_seq TO siscota;
GRANT SELECT ON public."user",public.account,public.session,public.verification TO siscota;
GRANT INSERT,UPDATE,DELETE ON public.session TO siscota;
