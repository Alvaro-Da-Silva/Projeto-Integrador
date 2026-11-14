CREATE TABLE IF NOT EXISTS public.perfil (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome varchar(50) NOT NULL UNIQUE,
  descricao varchar(200)
);

CREATE TABLE IF NOT EXISTS public.usuario (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome varchar(200) NOT NULL,
  email varchar(200) NOT NULL UNIQUE,
  senha_hash varchar(255),
  perfil_id bigint NOT NULL REFERENCES public.perfil(id),
  status varchar(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','desativado')),
  criado_em timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  better_auth_user_id text UNIQUE REFERENCES public."user"(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.cotista (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id bigint UNIQUE REFERENCES public.usuario(id),
  nome varchar(200) NOT NULL,
  data_nascimento date,
  telefone varchar(20),
  email varchar(200),
  status varchar(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  cadastrado_em timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  observacao text
);

CREATE TABLE IF NOT EXISTS public.escala (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome varchar(100) NOT NULL,
  mes integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano integer NOT NULL CHECK (ano >= 2000),
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','fechada','encerrada')),
  observacao text,
  criada_em timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  quantidade_cotas_padrao integer NOT NULL DEFAULT 4,
  CONSTRAINT chk_escala_datas CHECK (data_fim >= data_inicio),
  CONSTRAINT uk_escala_mes_ano UNIQUE (mes, ano)
);

CREATE TABLE IF NOT EXISTS public.dia (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  escala_id bigint NOT NULL REFERENCES public.escala(id) ON DELETE CASCADE,
  data date NOT NULL,
  CONSTRAINT uk_dia_escala UNIQUE (escala_id, data)
);

CREATE TABLE IF NOT EXISTS public.periodo (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo varchar(10) NOT NULL UNIQUE,
  nome varchar(50) NOT NULL,
  descricao varchar(200),
  hora_inicio time NOT NULL,
  hora_fim time NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo'))
);

CREATE TABLE IF NOT EXISTS public.plantao (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dia_id bigint NOT NULL REFERENCES public.dia(id),
  periodo_id bigint NOT NULL REFERENCES public.periodo(id),
  quantidade_necessaria integer NOT NULL CHECK (quantidade_necessaria > 0),
  status varchar(20) NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','completo','incompleto','encerrado')),
  observacao text,
  criado_em timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uk_plantao_dia_periodo UNIQUE (dia_id, periodo_id)
);

CREATE TABLE IF NOT EXISTS public.disponibilidade (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cotista_id bigint NOT NULL REFERENCES public.cotista(id),
  dia_id bigint NOT NULL REFERENCES public.dia(id),
  periodo_id bigint NOT NULL REFERENCES public.periodo(id),
  registrada_em timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  observacao text,
  CONSTRAINT uk_disponibilidade UNIQUE (cotista_id, dia_id, periodo_id)
);

CREATE TABLE IF NOT EXISTS public.participacao (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cotista_id bigint NOT NULL REFERENCES public.cotista(id),
  plantao_id bigint NOT NULL REFERENCES public.plantao(id),
  status varchar(20) NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','confirmada','cancelada','nao_compareceu')),
  confirmado_em timestamp,
  observacao text,
  CONSTRAINT uk_participacao UNIQUE (cotista_id, plantao_id)
);

CREATE TABLE IF NOT EXISTS public.solicitacao (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cotista_id bigint NOT NULL REFERENCES public.cotista(id),
  participacao_id bigint REFERENCES public.participacao(id),
  tipo varchar(30) NOT NULL CHECK (tipo IN ('troca','cancelamento','indisponibilidade')),
  descricao text NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovada','recusada','cancelada')),
  solicitada_em timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  respondida_em timestamp,
  observacao_resposta text
);

CREATE TABLE IF NOT EXISTS public.notificacao (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id bigint NOT NULL REFERENCES public.usuario(id),
  canal varchar(30) NOT NULL,
  tipo varchar(50) NOT NULL,
  status varchar(30) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','enviada','lida','erro')),
  criada_em timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  enviada_em timestamp,
  lida_em timestamp
);

INSERT INTO public.perfil (nome, descricao) VALUES
  ('admin', 'Administrador do SISCOTA'),
  ('cotista', 'Cotista que escolhe turnos')
ON CONFLICT (nome) DO NOTHING;

INSERT INTO public.periodo (codigo, nome, hora_inicio, hora_fim, descricao) VALUES
  ('D',  'Diurno',                   '07:00', '19:00', 'Diurno: 07h às 19h.'),
  ('N1', 'Noturno 1',                '19:00', '07:00', 'Noturno: 19h às 07h do dia seguinte.'),
  ('N2', 'Noturno 2',                '18:00', '06:00', 'Noturno: 18h às 06h do dia seguinte.'),
  ('I',  'Disponibilidade flexível', '07:00', '07:00', 'Opção flexível para qualquer cota no ciclo 07h–07h. Não confirma plantão de 24h.')
ON CONFLICT (codigo) DO NOTHING;

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

ALTER TABLE public.escala_ajuste ADD COLUMN IF NOT EXISTS motivo varchar(30);

DO $$
BEGIN
  ALTER TABLE public.escala_ajuste
    ADD CONSTRAINT chk_escala_ajuste_motivo CHECK (motivo IS NULL OR motivo IN ('desistencia'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
