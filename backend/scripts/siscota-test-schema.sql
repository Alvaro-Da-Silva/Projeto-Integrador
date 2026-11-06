-- Target test schema adjusted for migration 001_remove_cotista_cpf.sql; not evidence of live schema.
--
-- PostgreSQL database dump
--

\restrict FvVrUNmF0hk1WkAOXdTxPapkvCCPQ3mzFbsSvwfBEirZ6E6euV1iLMOdLV874g6

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account (
    id text NOT NULL,
    "accountId" text NOT NULL,
    "providerId" text NOT NULL,
    "userId" text NOT NULL,
    "accessToken" text,
    "refreshToken" text,
    "idToken" text,
    "accessTokenExpiresAt" timestamp with time zone,
    "refreshTokenExpiresAt" timestamp with time zone,
    scope text,
    password text,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


--
-- Name: cotista; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cotista (
    id bigint NOT NULL,
    usuario_id bigint,
    nome character varying(200) NOT NULL,
    data_nascimento date,
    telefone character varying(20),
    email character varying(200),
    status character varying(20) DEFAULT 'ativo'::character varying NOT NULL,
    cadastrado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    observacao text,
    CONSTRAINT chk_cotista_status CHECK (((status)::text = ANY ((ARRAY['ativo'::character varying, 'inativo'::character varying])::text[])))
);


--
-- Name: cotista_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.cotista ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.cotista_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: dia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dia (
    id bigint NOT NULL,
    escala_id bigint NOT NULL,
    data date NOT NULL
);


--
-- Name: dia_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.dia ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.dia_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: disponibilidade; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.disponibilidade (
    id bigint NOT NULL,
    cotista_id bigint NOT NULL,
    dia_id bigint NOT NULL,
    periodo_id bigint NOT NULL,
    registrada_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    observacao text
);


--
-- Name: disponibilidade_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.disponibilidade ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.disponibilidade_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: escala; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.escala (
    id bigint NOT NULL,
    nome character varying(100) NOT NULL,
    mes integer NOT NULL,
    ano integer NOT NULL,
    data_inicio date NOT NULL,
    data_fim date NOT NULL,
    status character varying(20) DEFAULT 'aberta'::character varying NOT NULL,
    observacao text,
    criada_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    quantidade_cotas_padrao integer DEFAULT 4 NOT NULL,
    CONSTRAINT chk_escala_ano CHECK ((ano >= 2000)),
    CONSTRAINT chk_escala_datas CHECK ((data_fim >= data_inicio)),
    CONSTRAINT chk_escala_mes CHECK (((mes >= 1) AND (mes <= 12))),
    CONSTRAINT chk_escala_status CHECK (((status)::text = ANY ((ARRAY['aberta'::character varying, 'fechada'::character varying, 'encerrada'::character varying])::text[])))
);


--
-- Name: escala_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.escala ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.escala_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: jwks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jwks (
    id text NOT NULL,
    "publicKey" text NOT NULL,
    "privateKey" text NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "expiresAt" timestamp with time zone,
    alg text,
    crv text
);


--
-- Name: notificacao; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notificacao (
    id bigint NOT NULL,
    usuario_id bigint NOT NULL,
    canal character varying(30) NOT NULL,
    tipo character varying(50) NOT NULL,
    status character varying(30) DEFAULT 'pendente'::character varying NOT NULL,
    criada_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    enviada_em timestamp without time zone,
    lida_em timestamp without time zone,
    CONSTRAINT chk_notificacao_status CHECK (((status)::text = ANY ((ARRAY['pendente'::character varying, 'enviada'::character varying, 'lida'::character varying, 'erro'::character varying])::text[])))
);


--
-- Name: notificacao_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.notificacao ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.notificacao_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: participacao; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.participacao (
    id bigint NOT NULL,
    cotista_id bigint NOT NULL,
    plantao_id bigint NOT NULL,
    status character varying(20) DEFAULT 'pendente'::character varying NOT NULL,
    confirmado_em timestamp without time zone,
    observacao text,
    CONSTRAINT chk_participacao_status CHECK (((status)::text = ANY ((ARRAY['pendente'::character varying, 'confirmada'::character varying, 'cancelada'::character varying, 'nao_compareceu'::character varying])::text[])))
);


--
-- Name: participacao_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.participacao ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.participacao_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: perfil; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.perfil (
    id bigint NOT NULL,
    nome character varying(50) NOT NULL,
    descricao character varying(200)
);


--
-- Name: perfil_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.perfil ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.perfil_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: periodo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.periodo (
    id bigint NOT NULL,
    codigo character varying(10) NOT NULL,
    nome character varying(50) NOT NULL,
    descricao character varying(200),
    hora_inicio time without time zone NOT NULL,
    hora_fim time without time zone NOT NULL,
    status character varying(20) DEFAULT 'ativo'::character varying NOT NULL,
    CONSTRAINT chk_periodo_status CHECK (((status)::text = ANY ((ARRAY['ativo'::character varying, 'inativo'::character varying])::text[])))
);


--
-- Name: periodo_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.periodo ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.periodo_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: plantao; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plantao (
    id bigint NOT NULL,
    dia_id bigint NOT NULL,
    periodo_id bigint NOT NULL,
    quantidade_necessaria integer NOT NULL,
    status character varying(20) DEFAULT 'aberto'::character varying NOT NULL,
    observacao text,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_plantao_quantidade CHECK ((quantidade_necessaria > 0)),
    CONSTRAINT chk_plantao_status CHECK (((status)::text = ANY ((ARRAY['aberto'::character varying, 'completo'::character varying, 'incompleto'::character varying, 'encerrado'::character varying])::text[])))
);


--
-- Name: plantao_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.plantao ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.plantao_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session (
    id text NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    token text NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "userId" text NOT NULL
);


--
-- Name: solicitacao; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.solicitacao (
    id bigint NOT NULL,
    cotista_id bigint NOT NULL,
    participacao_id bigint,
    tipo character varying(30) NOT NULL,
    descricao text NOT NULL,
    status character varying(20) DEFAULT 'pendente'::character varying NOT NULL,
    solicitada_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    respondida_em timestamp without time zone,
    observacao_resposta text,
    CONSTRAINT chk_solicitacao_status CHECK (((status)::text = ANY ((ARRAY['pendente'::character varying, 'aprovada'::character varying, 'recusada'::character varying, 'cancelada'::character varying])::text[]))),
    CONSTRAINT chk_solicitacao_tipo CHECK (((tipo)::text = ANY ((ARRAY['troca'::character varying, 'cancelamento'::character varying, 'indisponibilidade'::character varying])::text[])))
);


--
-- Name: solicitacao_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.solicitacao ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.solicitacao_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."user" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    "emailVerified" boolean NOT NULL,
    image text,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: usuario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuario (
    id bigint NOT NULL,
    nome character varying(200) NOT NULL,
    email character varying(200) NOT NULL,
    senha_hash character varying(255) NOT NULL,
    perfil_id bigint NOT NULL,
    status character varying(20) DEFAULT 'ativo'::character varying NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_usuario_status CHECK (((status)::text = ANY ((ARRAY['ativo'::character varying, 'desativado'::character varying])::text[])))
);


--
-- Name: usuario_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.usuario ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.usuario_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: verification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verification (
    id text NOT NULL,
    identifier text NOT NULL,
    value text NOT NULL,
    "expiresAt" timestamp with time zone NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: account account_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (id);




--
-- Name: cotista cotista_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotista
    ADD CONSTRAINT cotista_pkey PRIMARY KEY (id);


--
-- Name: cotista cotista_usuario_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotista
    ADD CONSTRAINT cotista_usuario_id_key UNIQUE (usuario_id);


--
-- Name: dia dia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dia
    ADD CONSTRAINT dia_pkey PRIMARY KEY (id);


--
-- Name: disponibilidade disponibilidade_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disponibilidade
    ADD CONSTRAINT disponibilidade_pkey PRIMARY KEY (id);


--
-- Name: escala escala_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escala
    ADD CONSTRAINT escala_pkey PRIMARY KEY (id);


--
-- Name: jwks jwks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jwks
    ADD CONSTRAINT jwks_pkey PRIMARY KEY (id);


--
-- Name: notificacao notificacao_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificacao
    ADD CONSTRAINT notificacao_pkey PRIMARY KEY (id);


--
-- Name: participacao participacao_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participacao
    ADD CONSTRAINT participacao_pkey PRIMARY KEY (id);


--
-- Name: perfil perfil_nome_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perfil
    ADD CONSTRAINT perfil_nome_key UNIQUE (nome);


--
-- Name: perfil perfil_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perfil
    ADD CONSTRAINT perfil_pkey PRIMARY KEY (id);


--
-- Name: periodo periodo_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.periodo
    ADD CONSTRAINT periodo_codigo_key UNIQUE (codigo);


--
-- Name: periodo periodo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.periodo
    ADD CONSTRAINT periodo_pkey PRIMARY KEY (id);


--
-- Name: plantao plantao_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plantao
    ADD CONSTRAINT plantao_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (id);


--
-- Name: session session_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_token_key UNIQUE (token);


--
-- Name: solicitacao solicitacao_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitacao
    ADD CONSTRAINT solicitacao_pkey PRIMARY KEY (id);


--
-- Name: dia uk_dia_escala; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dia
    ADD CONSTRAINT uk_dia_escala UNIQUE (escala_id, data);


--
-- Name: disponibilidade uk_disponibilidade; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disponibilidade
    ADD CONSTRAINT uk_disponibilidade UNIQUE (cotista_id, dia_id, periodo_id);


--
-- Name: escala uk_escala_mes_ano; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.escala
    ADD CONSTRAINT uk_escala_mes_ano UNIQUE (mes, ano);


--
-- Name: participacao uk_participacao; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participacao
    ADD CONSTRAINT uk_participacao UNIQUE (cotista_id, plantao_id);


--
-- Name: plantao uk_plantao_dia_periodo; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plantao
    ADD CONSTRAINT uk_plantao_dia_periodo UNIQUE (dia_id, periodo_id);


--
-- Name: user user_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_email_key UNIQUE (email);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: usuario usuario_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_email_key UNIQUE (email);


--
-- Name: usuario usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_pkey PRIMARY KEY (id);


--
-- Name: verification verification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification
    ADD CONSTRAINT verification_pkey PRIMARY KEY (id);


--
-- Name: account_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "account_userId_idx" ON public.account USING btree ("userId");


--
-- Name: session_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "session_userId_idx" ON public.session USING btree ("userId");


--
-- Name: verification_identifier_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX verification_identifier_idx ON public.verification USING btree (identifier);


--
-- Name: account account_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: cotista fk_cotista_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotista
    ADD CONSTRAINT fk_cotista_usuario FOREIGN KEY (usuario_id) REFERENCES public.usuario(id);


--
-- Name: dia fk_dia_escala; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dia
    ADD CONSTRAINT fk_dia_escala FOREIGN KEY (escala_id) REFERENCES public.escala(id) ON DELETE CASCADE;


--
-- Name: disponibilidade fk_disponibilidade_cotista; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disponibilidade
    ADD CONSTRAINT fk_disponibilidade_cotista FOREIGN KEY (cotista_id) REFERENCES public.cotista(id);


--
-- Name: disponibilidade fk_disponibilidade_dia; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disponibilidade
    ADD CONSTRAINT fk_disponibilidade_dia FOREIGN KEY (dia_id) REFERENCES public.dia(id);


--
-- Name: disponibilidade fk_disponibilidade_periodo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.disponibilidade
    ADD CONSTRAINT fk_disponibilidade_periodo FOREIGN KEY (periodo_id) REFERENCES public.periodo(id);


--
-- Name: notificacao fk_notificacao_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificacao
    ADD CONSTRAINT fk_notificacao_usuario FOREIGN KEY (usuario_id) REFERENCES public.usuario(id);


--
-- Name: participacao fk_participacao_cotista; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participacao
    ADD CONSTRAINT fk_participacao_cotista FOREIGN KEY (cotista_id) REFERENCES public.cotista(id);


--
-- Name: participacao fk_participacao_plantao; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participacao
    ADD CONSTRAINT fk_participacao_plantao FOREIGN KEY (plantao_id) REFERENCES public.plantao(id);


--
-- Name: plantao fk_plantao_dia; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plantao
    ADD CONSTRAINT fk_plantao_dia FOREIGN KEY (dia_id) REFERENCES public.dia(id);


--
-- Name: plantao fk_plantao_periodo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plantao
    ADD CONSTRAINT fk_plantao_periodo FOREIGN KEY (periodo_id) REFERENCES public.periodo(id);


--
-- Name: solicitacao fk_solicitacao_cotista; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitacao
    ADD CONSTRAINT fk_solicitacao_cotista FOREIGN KEY (cotista_id) REFERENCES public.cotista(id);


--
-- Name: solicitacao fk_solicitacao_participacao; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitacao
    ADD CONSTRAINT fk_solicitacao_participacao FOREIGN KEY (participacao_id) REFERENCES public.participacao(id);


--
-- Name: usuario fk_usuario_perfil; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT fk_usuario_perfil FOREIGN KEY (perfil_id) REFERENCES public.perfil(id);


--
-- Name: session session_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict FvVrUNmF0hk1WkAOXdTxPapkvCCPQ3mzFbsSvwfBEirZ6E6euV1iLMOdLV874g6

