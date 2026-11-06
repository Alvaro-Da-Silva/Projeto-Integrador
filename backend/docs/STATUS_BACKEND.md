# STATUS BACKEND — 05/11/2026

Atualização: fluxo de administrador e cotista implementado, com **9 combinações método/rota**. Login em usuario/perfil; admin cria/abre/fecha escalas e libera plantões; cotista registra uma única preferência por dia em disponibilidade. Alterar a opção substitui a anterior. Dois ou mais cotistas podem candidatar-se à mesma vaga; não há distribuição automática ou confirmação de participação.

Períodos oficiais cadastrados: D (ID 5, 07–19h), N1 (ID 6, 19–07h), N2 (ID 7, 18–06h) e I (ID 8, flexibilidade no ciclo 07–07h). I não cria plantão físico de 24h. N1/N2 são noturnas, sem divisão automática de cotas entre elas.

Contas TESTE persistentes: usuario 1/admin e usuario 2/cotista, este vinculado ao cotista 5. Senhas geradas aleatoriamente e salvas somente em `.workflow-demo-credentials.json` local, ignorado pelo Git. AUTH_TOKEN_SECRET foi gerado no .env privado, sem ser exibido. As tabelas externas user/account/session/verification/jwks não foram modificadas. Novos perfis admin/cotista e usuarios foram inseridos nas tabelas de domínio já existentes; nenhum esquema foi alterado.

É necessário **reiniciar o processo Node** para carregar as novas rotas. Os testes do fluxo usaram processos/instâncias Express novos e PostgreSQL real; o servidor que já estava aberto em 8080 não foi encerrado por Codex. Os plantões antigos TESTE_D/TESTE_N não foram convertidos automaticamente: para preencher um dia com os novos códigos, o administrador deve liberá-lo pela API. A gravação de escolha não cria participação nem consome vaga.

Contrato atualizado: [API_FRONTEND.md](API_FRONTEND.md). Nova coleção: [siscota-workflow.postman_collection.json](../thunder-client/siscota-workflow.postman_collection.json), com [ambiente sem senhas/tokens preenchidos](../thunder-client/siscota-workflow.postman_environment.json). Dados de setup e smoke sem segredos: [workflow-setup.json](evidence/workflow-setup.json), [workflow-smoke.json](evidence/workflow-smoke.json).

## 1. Ambiente

Simulação executada no banco principal de desenvolvimento **siscota**, conforme autorização. Nenhum modelo físico ou regra de negócio foi alterado; dados de autenticação preservados.

| Recurso | Status | Evidência | Problema | Solução |
| --- | --- | --- | --- | --- |
| Node e dependências | FUNCIONANDO | Node v24.22.0; Express/pg/dotenv/cors instalados | Nenhum observado | Nenhuma |
| API porta 8080 | FUNCIONANDO | GETs reais 200/400/404 | Nenhum bloqueio atual | npm.cmd start para reiniciar |
| PostgreSQL | FUNCIONANDO | PostgreSQL 18.6; SELECT current_database() = siscota | Nenhum observado | Nenhuma |
| SELECT/INSERT/UPDATE/DELETE | FUNCIONANDO | Cinco tabelas com privilégios; 15 probes concluídos com ROLLBACK | Bloqueio anterior 42501 resolvido pelo usuário | Nenhuma concessão adicional necessária |
| Sequences | FUNCIONANDO | USAGE=true nas cinco sequences; IDs gerados pelo seed | Nenhum observado | Nenhuma |
| CREATE/ALTER | BLOQUEADO | CREATE no schema e acesso como dono=false | Papel não é proprietário | Não são necessários; não conceder para esta carga |
| Vínculo cotista/usuario | FUNCIONANDO | usuario_id opcional no modelo; cotista 5 vinculado ao usuario 2 | Login de cotista exige vínculo ativo | Provisionar pelo script setup:conta |
| Integração frontend | FUNCIONANDO | Contrato e exemplos reais em API_FRONTEND.md; CORS * confirmado | Conectividade LAN não testada | Validar IP/firewall se frontend estiver em outra máquina |
| Liberação e preenchimento por API | FUNCIONANDO | Login, perfis, liberação e escolhas testados no PostgreSQL real | Processo antigo precisa reiniciar para carregar código | Reiniciar npm.cmd start |
| Importação na interface Thunder Client | NÃO TESTADO | JSON Postman 2.1 preparado com resultados reais | Interface da extensão não foi operada | Importar arquivo na aba Collections |

## 2. Banco de dados

Conexão: **siscota**, papel **siscota_codex**. SELECT current_database() é conferido antes de cada escrita pelo helper. INSERT, UPDATE e DELETE foram testados nas tabelas escala, dia, periodo, plantao e cotista com registros próprios e ROLLBACK. Não foram usados registros preexistentes nesses probes. As sequences escala_id_seq, dia_id_seq, periodo_id_seq, plantao_id_seq e cotista_id_seq possuem USAGE. CREATE/ALTER continuam indisponíveis e desnecessários.

O papel mantém default_transaction_read_only=on; diagnóstico e seed utilizam **BEGIN READ WRITE** somente na transação autorizada. Não houve ALTER ROLE. As permissões foram corrigidas externamente pelo usuário; Codex não executou novos GRANTs.

Dependências reais: escala → dia; dia + periodo → plantao; usuario → perfil; cotista.usuario_id é uma FK opcional no modelo, mas o preenchimento exige cotista ativo vinculado ao login. A carga inicial de novembro não precisou de contas; a atualização do fluxo criou 2 perfis e 2 usuarios. Os cotistas não foram atribuídos automaticamente a plantões. Testes de disponibilidade foram revertidos; não há escolhas de teste penduradas na base.

Carga inicial de novembro persistida por COMMIT e confirmada por SELECT (os 4 períodos oficiais e 2 contas foram adicionados depois, conforme a atualização acima):

| Tabela | Criados | IDs reais |
| --- | ---: | --- |
| escala | 1 | 2 |
| dia | 30 | 2 a 31 |
| periodo | 2 | 3 (TESTE_D), 4 (TESTE_N) |
| plantao | 60 | 2 a 61 |
| cotista | 4 | 5, 6, 7, 8 |
| usuario, participacao e demais tabelas | 0 | Não criados |

Escala: TESTE Novembro 2026 - 4 cotas, 01–30/11/2026, aberta, quantidade_cotas_padrao=4. Cada dia possui TESTE_D 08:00–20:00 com 2 vagas e TESTE_N 20:00–08:00 com 2 vagas. TESTE_N é um registro sintético agregado da demonstração, sem regra N1/N2. A API continua retornando nightPeriodAllocation=pending conforme o serviço implementado.

Cotistas: TESTE Cotista 01 a 04. O cotista 5 agora está vinculado ao usuario 2; os demais seguem sem vínculo. CPFs sintéticos 00000000001 a 00000000004, identificados como teste e sem validade documental. O esquema atual exige texto obrigatório/único, não implementa validação de dígitos verificadores. Nenhuma regra de CPF foi alterada para a carga.

**Idempotência executada:** a segunda execução de npm.cmd run seed:dev retornou JA_EXISTENTE_SEM_ALTERACOES e zero registros criados. Totais permaneceram 1/30/2/60/4. Se a carga existente estiver incompleta ou pertencer a outro marcador, o script recusa sobrescrever.

Autenticação antes/depois: user=1, account=1, session=10, verification=0, jwks=1; contagens inalteradas. Os scripts desta tarefa não executam escrita nessas tabelas.

Evidências: [permissões/probes](evidence/environment.json), [primeira carga persistida e todos os IDs](evidence/seed-persisted.json), [repetição sem duplicidade](evidence/seed.json), [persistência e total por dia](evidence/persistence.json).

## 3. Testes

Executado: **npm.cmd run test:integration**, saída zero.

| Grupo | Aprovados | Reprovados | Bloqueados |
| --- | ---: | ---: | ---: |
| A. Unitários (validações/distribuição/opções) | 9 | 0 | 0 |
| B. HTTP/serviço com PostgreSQL simulado | 48 | 0 | 0 |
| Proteções do destino de testes | 7 | 0 | 0 |
| C. HTTP/PostgreSQL siscota real | 16 | 0 | 0 |
| D. Integridade PostgreSQL real, somente leitura | 11 | 0 | 0 |
| **Casos individuais** | **91** | **0** | **0** |

O runner contabiliza também 7 agrupamentos: **98 entradas aprovadas, zero falhas e zero skips**. O grupo legado de fixtures em siscota_test continua excluído e não é apresentado como executado. O grupo real de gravação usa uma conexão PostgreSQL real, com o driver redirecionado para a mesma transação e SAVEPOINTs, permitindo rollback das fixtures e escritas HTTP. Isso não simula respostas SQL. O grupo simulado fornece respostas SQL controladas e é contabilizado separadamente. Logins persistentes também foram verificados com pool real em instância nova, sem esse redirecionamento.

Casos novos reais: login dos dois perfis, cotista proibido de liberar, criação de escala e duplicidade 409, liberação de uma vaga D com dois candidatos aceitos, consulta somente da própria escolha, substituição por I sem segundo registro, fechamento/reabertura de plantão e fechamento de escala. Não foram modificadas contas externas. Os testes não alegam validar uma corrida entre conexões PostgreSQL independentes; o serviço usa trava FOR UPDATE no cotista e na escala para serializar as alterações.

Verificações reais aprovadas: banco correto; 404 para período confirmado ausente; quatro casos 400; CORS; 200 novembro/2026, 30 dias, 60 plantões, IDs/quantidades/períodos conferidos com SELECTs e distribuição 2+2. As 11 consultas de integridade não encontraram dias/plantões órfãos, dias fora do intervalo, duplicidade de escala/dia/plantão, quantidade não positiva, account/session órfãos ou constraints não validadas.

Além da suíte, **12 GETs da coleção foram efetivamente executados e aprovados**, incluindo novembro/2026 com 200. Não somar essas requisições à contagem de casos da suíte. Não foi induzida indisponibilidade do PostgreSQL para provocar 500; esse tratamento permanece coberto com banco simulado.

Evidências: [log da suíte](evidence/test-run.txt), [requisições/status/corpos reais](evidence/http.json), [calendário JSON completo](evidence/calendar-november.json).

## 4. Endpoints disponíveis

| Método | Rota | Finalidade | Status |
| --- | --- | --- | --- |
| GET | /api/escalas/:ano/:mes/calendario | Escala, dias, plantões, períodos e distribuição diária padrão | FUNCIONANDO: 200/400/404 reais |
| POST | /api/auth/login | Login email/senha com usuario/perfil | FUNCIONANDO |
| GET | /api/auth/me | Perfil da sessão atual | FUNCIONANDO |
| POST | /api/escalas | Cadastro mensal pelo admin | FUNCIONANDO |
| PATCH | /api/escalas/:escalaId/status | Abrir/fechar/encerrar escala pelo admin | FUNCIONANDO |
| PUT | /api/escalas/:escalaId/dias/:data/plantoes/:codigoPeriodo | Liberar/atualizar plantão pelo admin | FUNCIONANDO |
| PATCH | /api/escalas/:escalaId/dias/:data/plantoes/:codigoPeriodo/status | Abrir/encerrar plantão pelo admin | FUNCIONANDO |
| GET | /api/disponibilidades?escalaId=:id | Consultar somente suas escolhas | FUNCIONANDO |
| PUT | /api/disponibilidades/:diaId | Registrar/substituir escolha do cotista | FUNCIONANDO |

URL da demonstração: **http://localhost:8080/api/escalas/2026/11/calendario**.

[API_FRONTEND.md](API_FRONTEND.md) documenta parâmetros, headers/body, autenticação, CORS, contrato temporal e exemplo real com recorte do primeiro dia. O JSON completo contém os 30 dias. Não há body, query ou token obrigatório. Os IDs bigint retornam como strings; nesta execução as datas retornaram em ISO UTC (primeiro dia 2026-11-01T03:00:00.000Z).

[Coleção Thunder Client](../thunder-client/siscota-free.postman_collection.json): Postman 2.1, 12 GETs, URLs absolutas, sem environments ou scripts personalizados. A importação Postman 2.1 é documentada pelo [fabricante](https://docs.thunderclient.com/features/import); os limites são os do [plano instalado](https://www.thunderclient.com/pricing). Importação não foi operada na interface nesta sessão.

## 5. Pendências

- Validar acesso pela rede da máquina do frontend e confirmar consumo visual do contrato temporal.
- Não existe CRUD público de usuários/cotistas/períodos/participação nem distribuição automática. Criação de escala, liberação e disponibilidade foram implementadas conforme as respostas do usuário.
- Não foi localizado backlog/requisito detalhado; README descreve o objetivo geral. Não há base documental para escolher nova regra N1/N2 ou algoritmo de atribuição.
- Lacunas existentes, sem alteração: banco aceita ano >9999 e API limita a 9999; dia não tem CHECK de intervalo da escala; o serviço não compara total físico dos plantões com padrão de cotas. A verificação adicional por SELECT confirmou os 30 dias desta carga com 2 plantões e 4 vagas cada.
- Outras quantidades de cotas continuam sem distribuição aprovada. Isso é comportamento implementado, não uma inconsistência introduzida.
- email_services.js usa CommonJS em pacote ESM, não participa da rota e não foi testado por envio real.
- server.js foi ajustado para carregar dotenv antes de importar a aplicação e construir o Pool.

## 6. Bloqueios técnicos

**Não há bloqueio restante para a carga de novembro/2026, consultas HTTP ou a suíte executada.** CREATE/ALTER ausentes não são necessários para essas operações.

Histórico resolvido, sem confundir com falhas atuais:

| Operação | Erro exato | Causa | Solução executada / comando |
| --- | --- | --- | --- |
| INSERT na etapa anterior | 42501: permissão negada para tabela escala | ACLs e USAGE das sequences ausentes | Usuário liberou permissões; confirmadas por catálogo e 15 probes com rollback. Não executar novos grants sem necessidade |
| DML com transação padrão anterior | 25006: não é possível executar INSERT em uma transação de leitura-apenas | default_transaction_read_only=on | Scripts usam BEGIN READ WRITE local, sem ALTER ROLE |
| Primeira tentativa de seed desta etapa | ReferenceError: periodoId is not defined | Referência incorreta na montagem do relatório de IDs do plantão | Codex corrigiu para periodoId: periodId, sem mudar SQL/regra. ROLLBACK da tentativa inteira; npm.cmd run seed:dev repetido com sucesso |

A tentativa revertida pode consumir IDs das sequences, pois nextval não é transacional; por isso os IDs reais não começam todos em 1. Não é duplicidade nem perda de registro persistido. Não houve exclusão de dados existentes.

Se novas concessões forem removidas, o comando de correção preparado é o conteúdo de scripts/grant-development-demo.sql, a ser aplicado por administrador conectado a siscota. Depois: npm.cmd run diagnose:dev; npm.cmd run seed:dev. Nenhuma correção administrativa é necessária no estado verificado agora.

## 7. Próxima tarefa recomendada

Entregar o endpoint documentado ao frontend para consumir o calendário real de novembro/2026. Antes de nova funcionalidade, obter o backlog/requisitos; não propor como aprovada uma implementação hipotética.

Comandos na pasta backend:

```powershell
npm.cmd run diagnose:dev
npm.cmd run seed:dev
npm.cmd start
npm.cmd run test:integration
node scripts/capture-development-http.js
```

Para alterações manuais autorizadas: conectar explicitamente a siscota, confirmar SELECT current_database(), usar BEGIN READ WRITE e WHERE com os IDs reais acima; preservar FKs, autenticação e datas de novembro. Repetir testes e captura HTTP. O seed não desfaz alterações manuais nem serve de reset.

Na etapa anterior da simulação: scripts/seed-development.js (correção de variável), docs/API_FRONTEND.md, docs/STATUS_BACKEND.md e evidências/coleção regeneradas. Evidências novas: seed-persisted.json, persistence.json, calendar-november.json. Nenhum endpoint, esquema físico ou regra de negócio modificado.

Na atualização do fluxo admin/cotista: modificados src/app.js, src/server.js, src/services/calendarService.js, package.json, .gitignore e documentação existente. Criados config/transaction.js; services/authService.js, workflowValidation.js, availabilityOptions.js, escalaWriteService.js, availabilityService.js; middleware/auth.js e workflowErrors.js; routes/authRoutes.js, escalaWriteRoutes.js, availabilityRoutes.js; scripts de setup de períodos/contas e grants; test/workflow.test.js e test/development/workflow-postgres.test.js; coleção/ambiente do fluxo. Novas regras são as explicitamente confirmadas pelo usuário; não houve alteração física do esquema. Credenciais locais ignoradas pelo Git.
