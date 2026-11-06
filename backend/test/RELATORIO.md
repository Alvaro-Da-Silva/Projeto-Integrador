# Auditoria e testes — 04/11/2026

> Histórico da preparação com siscota_test. A solicitação atual usa siscota; consulte [STATUS_BACKEND.md](../docs/STATUS_BACKEND.md) para resultados e bloqueios atuais.

## Executar

Na pasta `backend`: `npm run test:integration` (no PowerShell com bloqueio de scripts: `npm.cmd run test:integration`). Não exige servidor previamente iniciado, Thunder Client ou novas dependências. Usa Node.js Test Runner, Express, fetch e pg já disponíveis.

O comando executa os testes existentes, os novos testes HTTP com banco simulado e, quando autorizado e configurado, o grupo com PostgreSQL real. Ausência de configuração ou autorização aparece como SKIP/BLOQUEADO, nunca como integração aprovada. Configuração presente e autorizada, mas inválida, resulta em falha real de preparação.

## Resultado efetivamente obtido

Última execução: saída zero. Node reportou **35 entradas: 34 aprovadas, 0 reprovadas, 1 bloqueada/ignorada**. As 34 aprovadas incluem 2 entradas de agrupamento; são **32 casos individuais executados** (4 existentes, 7 de proteção e 21 de HTTP/serviço). O grupo PostgreSQL foi bloqueado por TEST_DATABASE_URL ausente; seus casos internos não foram executados nem contabilizados como aprovados. As contagens referem-se à última execução, sem somar repetições.

Os testes HTTP criam Express em porta local efêmera e executam requisições reais contra esse processo, substituindo somente pool.query por respostas controladas. Isso comprova validação, roteamento, serialização, associação de plantões, distribuição e tratamento de erros; não comprova consultas/constraints no PostgreSQL. Os testes reais preparados usam a mesma conexão transacional para fixtures, serviços e HTTP, por substituição restrita ao teste; não validam o carregamento de .env em server.js.

## Estrutura e requisitos consultados

- Única rota: GET `/api/escalas/:ano/:mes/calendario`.
- `src/app.js`: Express, CORS, JSON e montagem da rota. `server.js`: porta padrão 8080 e dotenv.
- `routes/escalaRoutes.js`: validações de ano/mês, HTTP 200/400/404/500.
- `services/calendarService.js`: SELECTs parametrizados em escala, dia, periodo e plantao; agrupamento de plantões.
- `services/quotaDistributionService.js`: 4 cotas = 2 diurnas e 2 noturnas; 3 = 1 diurna e 2 noturnas; 12 horas por cota; outros valores sem regra aprovada. N1/N2 permanece pendente.
- Não há controllers, repositories, models ou rotas de usuários separados. `email_services.js` não é exposto por rota.
- README, AGENTS.md e 4 testes existentes consultados. Não foram localizados documentos de requisitos, backlog ou migrações no repositório; `siscota.session.sql` está vazio. O modelo físico foi consultado diretamente no PostgreSQL por ferramentas somente de leitura.

## Modelo real e auditoria do banco principal

Esquema public com **16 tabelas**: perfil, usuario, cotista, escala, periodo, dia, plantao, disponibilidade, participacao, solicitacao, notificacao, user, account, session, verification e jwks.

Dependências observadas: perfil → usuario → cotista; escala → dia; dia + periodo → plantao; cotista + dia + periodo → disponibilidade; cotista + plantao → participacao; cotista + participacao opcional → solicitacao; usuario → notificacao; user → account/session. verification e jwks sem FK. Colunas, defaults, checks, FKs, índices únicos e identidade foram consultados no catálogo. IDs das 11 tabelas de domínio são GENERATED ALWAYS.

No servidor conectado há siscota e outros bancos, mas **não existe siscota_test**. Nenhum perfil de teste separado foi encontrado.

Consultas agregadas, sem revelar registros pessoais:

- As 11 tabelas de domínio estão vazias, inclusive escala/dia/periodo/plantao.
- Autenticação: 1 user, 1 account, 10 sessions, 0 verifications, 1 jwks.
- Zero dias órfãos, plantões sem dia/período, accounts/sessions órfãos ou constraints não validadas.
- Zero dias fora do intervalo da escala, anos acima do limite da API ou quantidades sem distribuição aprovada. Como as tabelas de domínio estão vazias, esses resultados **não comprovam integridade com dados populados**.
- Não foram encontradas inconsistências nos indicadores consultados. Não se trata de validação exaustiva de todas as regras de negócio.

## Preparação pendente de autorização

`scripts/prepare-test-database.js` exige `--authorize-create` e TEST_SCHEMA_SOURCE_URL apontando para `/siscota`. Não é chamado pela suíte. Exporta somente o esquema public com pg_dump; cria `siscota_test` vazio via TEMPLATE template0; restaura o esquema real em transação com psql e ON_ERROR_STOP. Não copia usuários, sessões, tokens ou outros registros do principal. Recusa sobrescrever banco existente e não executa DROP automático em caso de falha. Exige ferramentas PostgreSQL compatíveis com o servidor e permissão CREATEDB. pg_dump/psql não foram localizados no PATH nesta sessão; execução não tentada.

Após autorização e disponibilidade das ferramentas, configurar TEST_SCHEMA_SOURCE_URL de forma privada e executar `node scripts/prepare-test-database.js --authorize-create`. O script também pode ler essa variável de .env.test. Não usar a saída textual de db_context como DDL: ela omite detalhes de identidade; pg_dump preserva o esquema real.

Para os testes com inserção, copiar `.env.test.example` para `.env.test`, informar TEST_DATABASE_URL com destino `/siscota_test` e, **somente após autorização**, definir TEST_DB_WRITES=authorized. O arquivo está ignorado pelo Git. A suíte não carrega o .env principal; variáveis TEST_* já definidas no terminal têm precedência. O mesmo comando `npm run test:integration` passa então a executar o grupo real.

Fixtures preparadas para todas as 16 tabelas, na ordem das FKs, com valores sintéticos identificados como teste; não representam cadastros existentes. Valores de canal/tipo de notificação, dados criptográficos e campos de autenticação servem apenas para integridade estrutural, pois não há validações desses valores no backend analisado. Não são credenciais ou chaves utilizáveis. O requisito de CPF foi revogado posteriormente; fixtures atuais dependem da migração 001, ainda não executada.

## Cobertura preparada para PostgreSQL real (não executada)

- Fixtures válidas, HTTP 200 com vínculos e 404 para período confirmado ausente.
- Distribuição 4/3 cotas e 5 cotas sem regra aprovada, lidas pelo serviço real.
- Limites mês 0/13, ano 1999, datas invertidas, quantidade zero/negativa e status/tipo inválidos.
- Unicidade de dias/plantões, perfil, email, código de período, mês/ano, disponibilidade e participação.
- FKs e NOT NULL obtidas do catálogo real, aplicadas às entidades com fixture. Colunas de identidade não sofrem UPDATE NULL, operação proibida por GENERATED ALWAYS antes da verificação NOT NULL.
- SAVEPOINT por tentativa inválida, verificação de SQLSTATE, ROLLBACK final e confirmação de remoção das fixtures nas 16 tabelas.

Proteções: validação do nome na URL, SELECT current_database() após conectar e imediatamente antes de cada INSERT/UPDATE. Somente siscota_test é aceito. IDs explícitos com OVERRIDING SYSTEM VALUE evitam avançar sequences; não desabilitam constraints. Não há DELETE, TRUNCATE, alteração de constraints ou schema na suíte. Erros de preparação também revertem a transação e fecham a conexão. Executar uma instância da suíte por banco de testes para evitar disputa por mês/ano livre.

## Problemas e limites identificados

1. Pool criado durante importação antes de dotenv.config() em server.js: risco de ignorar configuração definida apenas no .env. Não corrigido nem mascarado como integração aprovada.
2. PostgreSQL permite escala.ano >= 2000, mas API limita a 9999. É uma divergência de limites, sem registros afetados encontrados.
3. quantidade_cotas_padrao não tem CHECK de distribuição aprovada. Valores diferentes de 3/4 são suportados pelo serviço como distribuição pendente, não automaticamente considerados corrupção.
4. dia.data não tem constraint que imponha o intervalo da escala. Falta de regra documental impede afirmar se isso é defeito de negócio; nenhum registro fora do intervalo foi encontrado.
5. Number() aceita zeros à esquerda e notação exponencial. Testes preservam o comportamento existente.
6. email_services.js usa require/module.exports em pacote ESM, sem rota correspondente. Não testado por envio real de e-mail.
7. uk_escala_mes_ano existe no banco real, portanto a hipótese anterior de duplicidade de escala no período é protegida por constraint.

## Arquivos desta tarefa

Modificados: `package.json` (comandos), `.gitignore` (ignorar .env.test). Alterações anteriores de dev/script e arquivos do usuário foram preservadas.

Criados: `.env.test.example`, `scripts/prepare-test-database.js`, `scripts/audit-database.sql`, `test/support/testDatabase.js`, `test/support/fixtures.js`, `test/integration/backend.test.js`, `test/RELATORIO.md`.

Verificações: npm.cmd run test:integration; node --check scripts/prepare-test-database.js; git diff --check; consultas PostgreSQL somente de leitura. Nenhuma dependência adicionada; nenhum código de produção alterado; nenhum banco criado ou registro inserido, atualizado ou excluído.
