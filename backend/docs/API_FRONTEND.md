# Estado real de ativação — conferência de 09/11/2026

Banco principal siscota/public autorizado. Os efeitos estruturais da 004 e campos da 005 já estavam presentes antes desta sessão; nenhum arquivo foi aplicado/reaplicado pelo agente. Referência de identidade com FK/UNIQUE validadas e senha_hash nullable. Dois usuarios internos, quatro cotistas e zero associações Better Auth.

Login/logout PostgreSQL NÃO testados: papel siscota_codex sem escrita nas tabelas Better Auth, default_transaction_read_only=on, nenhuma conexão administrativa disponível e variáveis privadas Better Auth ausentes. Nenhuma identidade criada ou vinculada; nenhuma permissão ou credencial alterada. Backup informado no GitHub, com validação dispensada pelo responsável; não examinado.

Contrato por sessão/cookie preservado: POST /api/auth/sign-in/email, POST /api/auth/sign-out, GET /api/auth/get-session e GET /api/me, com credentials: include. Caminhos implementados não significam autenticação operacional no banco atual. HS256 permanece desativado. Detalhes e comando de privilégios preparado em [BETTER_AUTH_MIGRATION_PLAN.md](BETTER_AUTH_MIGRATION_PLAN.md). Não executar 004/005 novamente. As notas antigas de migração pendente abaixo são históricas, superadas por esta conferência de estrutura.

# Autenticação oficial Better Auth — 09/11/2026

**Este contrato substitui o login HS256 e as orientações Bearer históricas abaixo.** Better Auth 1.7.19 está instalado no backend Express; autenticação por sessão/cookie implementada e validada em memória, ainda pendente de schema, permissões, configuração privada e provisionamento para funcionar no PostgreSQL. Não há JWT/JWKS/Bearer ou Admin plugin no servidor HTTP. Não confundir o código entregue com ativação no banco atual.

- Login: POST `/api/auth/sign-in/email` com `{email,password}` pelo cliente oficial Better Auth React.
- Logout: POST `/api/auth/sign-out`.
- Sessão externa: GET `/api/auth/get-session` (200/null quando não autenticado).
- Identidade funcional interna: GET `/api/me`, com id, nome, email, perfil, cotistaId, cotistaStatus.
- Enviar cookies com `credentials: 'include'`; não usar o accessToken antigo. Rotas `/api/auth/login` e `/api/auth/me` agora respondem 404.
- 401 para sessão ausente/inválida; 403 para falta de vínculo/perfil/status e origem não autorizada; 503 para indisponibilidade/configuração pendente identificada. Cadastro público: 403. Erros normais do Better Auth têm contrato próprio do cliente oficial; erros de domínio continuam `{error}`.
- CORS limitado às origens exatas de SISCOTA_TRUSTED_ORIGINS (padrão dev localhost:3000) e origem configurada da API. Escritas autenticadas de domínio exigem Origin autorizado; navegador envia automaticamente. HTTP de scripts precisa informar Origin e cookie.

Guia completo para a equipe: [FRONTEND_BETTER_AUTH.md](FRONTEND_BETTER_AUTH.md). Plano de banco/provisionamento, sem execução: [BETTER_AUTH_MIGRATION_PLAN.md](BETTER_AUTH_MIGRATION_PLAN.md). A migração proposta 004 associa explicitamente user.id externo a usuario, sem igualdade presumida de IDs ou associação por email. Perfis internos continuam admin/cotista; o cookie sozinho não concede acesso funcional. Cotista sem login permanece permitido. Cadastro administrativo e primeiro acesso por link não foram implementados.

GET `/api/escalas/:escalaId/disponibilidades?cotistaId=ID` preservado para admin, agora exigindo sessão e associação interna. `cotistaNome` é nome do cotista; `cotistas` permanece omitido até definição e confirmação do frontend. DELETE de disponibilidade continua não implementado; a regra aprovada de alteração de participação por solicitação/decisão administrativa não foi modificada nesta tarefa.

# Histórico — integração auditada antes da troca para sessão

Registro histórico superado pelo contrato Better Auth no início deste documento; não usar o fluxo HS256 descrito nesta seção.

Autenticação disponível: enviar `Authorization: Bearer <accessToken>` retornado por `POST /api/auth/login`. Login e resposta preservados. `authenticate` verifica assinatura HS256, algoritmo/tipo, issuer `siscota-backend`, audience `siscota-frontend`, subject bigint, emissão e expiração (1 hora); em seguida consulta `usuario`, `perfil` e `cotista`. `GET /api/auth/me` continua usando esse fluxo. Perfil e status vêm do banco a cada chamada. Token ausente/inválido/expirado ou usuário inativo: 401; perfil sem permissão ou cotista sem vínculo ativo: 403; segredo local indisponível: 503. Cookie de sessão externo não é aceito como JWT.

**Better Auth/JWKS bloqueado por ausência da configuração real.** O frontend local não declara `better-auth` em package.json/lockfile nem contém configuração de servidor/client, plugin JWT, rota `/api/auth/jwks` ou obtenção/envio de token. A tela de login disponível é um formulário de template. Não foi possível identificar versão, algoritmo, issuer, audience, claims ou URL absoluta do JWKS. O caminho relativo informado não comprova um endpoint ativo. O DDL salvo contém `user`, `account`, `session`, `verification`, `jwks`; isso não comprova emissão JWT e não representa auditoria atual do banco. Não foram consultados tokens, chaves ou registros de autenticação. A configuração de ambiente do backend foi examinada somente pelos nomes das variáveis; nenhuma configuração Better Auth foi encontrada. Nenhuma dependência foi instalada e nenhum verificador JWKS foi ativado.

Proposta de vínculo, **sujeita a aprovação estrutural**: tabela de identidades com issuer confiável + subject externo únicos e FK para `usuario.id`, com unicidade de usuario por issuer se aprovado vínculo 1:1. Se a identidade externa residir no mesmo banco, avaliar também FK para `user.id` após confirmar a implantação. Vincular somente contas explicitamente verificadas por responsável; nunca presumir igualdade dos IDs nem associar automaticamente por nome/email. A cadeia seria JWT verificado → vínculo persistente → usuario/perfil atuais → cotista.usuario_id. O esquema salvo não contém esse vínculo; nenhum vínculo real foi conferido nesta tarefa. Sem vínculo, rejeitar com 401; sem perfil/vínculo cotista ativo, 403. A claim externa `user` não concede automaticamente perfil cotista, e `admin` não concede administração local: a autorização interna continua sendo a fonte de permissão.

Plano JWT após receber a configuração: confirmar plugin, versão, algoritmo e claims; escolher biblioteca compatível; fixar JWKS/issuer/audience na configuração confiável do servidor; verificar assinatura, expiração e claims exigidos, rejeitar `none`, usar mensagens 401 genéricas e não registrar tokens. Nenhuma URL virá da requisição. Aprovar a migração e os pares de identidades separadamente. Para transição, propor modo de autenticação explícito por implantação, validação em ambiente isolado e data de corte acordada; eventual sobreposição temporária exige decisão e prazo próprios. Não foi adicionada aceitação dupla. A desativação futura do login legado exige decisão adicional e não faz parte desta alteração.

`GET /api/escalas/:escalaId/disponibilidades?cotistaId=ID` está implementado para **admin**, com authenticate seguido de requireRole('admin'). IDs decimais positivos até bigint máximo; `cotistaId` opcional, mas vazio/repetido/inválido retorna 400. Escala ausente: 404. Escala existente sem escolhas (ou filtro sem resultados): 200 com `[]`. Retorna somente escolhas da escala solicitada, ordenadas por data/id, sem modificar dados e com `Cache-Control: no-store`:

```json
[{"id":"1","diaId":"10","data":"2026-11-09","codigoPeriodo":"D","periodoId":"5","observacao":null,"registradaEm":"2026-11-09T12:00:00.000Z","cotistaNome":"Exemplo fictício"}]
```

IDs bigint são strings, conforme o driver e os endpoints existentes. Data vem de `dia.data` como YYYY-MM-DD; nome vem de `cotista.nome`; demais campos vêm de disponibilidade/periodo. `registrada_em` no DDL salvo é timestamp sem timezone: a serialização mantém o comportamento atual do driver; o sufixo Z do exemplo não comprova que a gravação original foi em UTC. **Contrato parcial:** `cotistas` foi omitido até esclarecer seu significado com o frontend; não foi inventada coleção, quantidade ou relacionamento. Disponibilidade não representa participação confirmada. Erros usam `{ "error": "mensagem" }`, conforme middleware existente.

`DELETE /api/disponibilidades/:diaId` **não implementado**, aguardando regra de negócio: remoção em escala fechada, participação pendente/confirmada/cancelada e registros antigos com múltiplos períodos. A UNIQUE física é por cotista/dia/período; PUT atual serializa por cotista e recusa mais de uma escolha antiga no dia. Não há regra de remoção existente que resolva essas situações. A rota DELETE continua ausente (404 padrão Express; não é sucesso de exclusão). Contrato pretendido após decisão: authenticate → requireRole('cotista'), identidade exclusivamente de req.user.cotistaId, dia validado, remoção restrita à própria escolha e resposta 204 sem corpo. Ainda definir ausência de escolha (404 ou 204), conflitos (409) e política de múltiplos registros; não integrar o botão até a conclusão.

Validação desta alteração: 40 testes passaram usando Express local e pool PostgreSQL simulado, sem conexão com banco real. Comando: `node --test --test-isolation=none test/adminAvailability.test.js test/workflow.test.js`. A tentativa inicial com isolamento por processos falhou por `spawn EPERM`; a opção sem processos filhos resolveu a restrição. Nenhum teste contra banco, migração, escrita de dados, alteração de credencial ou frontend foi executado.

# API disponível para o frontend — atualização do fluxo admin/cotista

## Estado atual confirmado

CPF ausente no banco; telefone, email e dataNascimento obrigatórios, com CHECKs de telefone/email não vazios. Quatro cotistas preservados. Usuário 2 sincronizado ao cotista 5 após autorização: email atual de login cotista05@example.com; senha preservada. Leituras confirmaram o estado, sem teste HTTP de login.

Primeiro acesso por link temporário para definição de senha aprovado; endpoints de cadastro/convite/definição de senha ainda não implementados. Nenhum envio realizado e nenhum frontend alterado. Notas de migração pendente abaixo descrevem etapas históricas anteriores, superadas pela conferência atual do banco.

## Preparação final — sem aplicação de migrações (05/11/2026)

Valores fictícios dos cotistas 5–8 aprovados apenas para desenvolvimento; ainda não gravados. Marcadores TESTE-TELEFONE-05 a 08 têm 17 caracteres e atendem ao limite físico 20 e aos CHECKs não vazios propostos. Não representam telefones discáveis; formato numérico futuro exigirá decisão explícita, sem exceções automáticas em produção.

Cotista 5 e usuario 2 têm nomes/emails divergentes. A regularização proposta modifica só cotista e mantém o email atual de login; sincronização futura depende de aprovação própria e revisão transacional de unicidade. Nenhuma autenticação ou endpoint foi alterado. O email proposto não apresentou conflito na consulta atual, o que não elimina necessidade de nova checagem futura.

Nome, telefone, email e dataNascimento são obrigatórios no contrato planejado; observacao opcional. POST de cadastro ainda não implementado. Migrações 002 → 001 → 003 continuam pendentes de backup recuperável, privilégio de proprietário e autorização explícita. Procedimento de backup/recuperação preparado em [STATUS_BACKEND.md](STATUS_BACKEND.md), sem executar utilitários. Nenhum UPDATE, DDL, teste ou HTTP executado nesta preparação.

## Situação real da migração (05/11/2026)

**PENDENTE, NÃO EXECUTADA.** Leitura da configuração real confirmou `siscota.public.cotista`, com 4 registros (IDs 5–8). Todos têm telefone nulo/vazio, email nulo/vazio e data_nascimento nula. Esses campos continuam opcionais no banco; CPF continua armazenado com NOT NULL e UNIQUE, embora já removido da resposta administrativa no código. Nenhum endpoint foi alterado nesta verificação.

O requisito aprovado passa a exigir telefone, email e dataNascimento no futuro cadastro. O exemplo planejado com valores nulos abaixo está superado para esses três campos e não deve orientar a implementação. Contrato definitivo de cadastro e sincronização ainda exige revisão; cadastro não foi implementado nesta etapa. A migração depende da correção autorizada dos dados reais, backup recuperável confirmado, privilégios de ALTER e confirmação explícita após análise. Não houve testes HTTP ou automatizados. Detalhes: [STATUS_BACKEND.md](STATUS_BACKEND.md).

Base local: **http://localhost:8080**. Existem **13 combinações de método/rota** implementadas. Reiniciar o processo Node após atualizar o código; um servidor iniciado antes da alteração continua com as rotas antigas.

## Consulta administrativa — Entrega 1

**IMPLEMENTADO; NÃO VALIDADO EM EXECUÇÃO.** Os nove endpoints anteriores foram preservados.

| Método | Rota | Perfil | Resposta 200 |
| --- | --- | --- | --- |
| GET | /api/usuarios | admin | Array de usuários |
| GET | /api/usuarios/:id | admin | Objeto de usuário |
| GET | /api/cotistas | admin | Array de cotistas |
| GET | /api/cotistas/:id | admin | Objeto de cotista |

Usar a base local acima e Authorization: Bearer <accessToken> do login existente. Sem body, filtros ou paginação. Listas incluem todos os status, ordenadas por ID; lista vazia retorna []. Cache-Control: no-store.

Usuário: id, nome, email, perfil (nome), status, cotistaId (null sem vínculo).
Cotista: id, usuarioId, nome, dataNascimento, telefone, email, status, observacao.
Campos opcionais podem ser null. IDs bigint são strings. dataNascimento segue a serialização existente do driver/Express, ainda não conferida em execução.

Campos explicitamente selecionados e projetados; nenhum hash, senha ou token é incluído. Nome/email refletem cada registro armazenado; GET não sincroniza nem altera dados.

Erros esperados pelo código, no formato {"error":"mensagem"}:

- 400: ID inválido. IDs devem ser inteiros positivos no limite bigint.
- 401: autenticação ausente/inválida/expirada ou usuário sem acesso, conforme middleware existente.
- 403: Perfil sem permissão para esta operação.
- 404: Usuário não encontrado. ou Cotista não encontrado.
- 503 para PostgreSQL 42501/25006: Permissões de escrita do banco não configuradas para esta operação. Mensagem existente preservada inclusive nas leituras.
- Demais erros preservam o handler existente; falha inesperada retorna 500: Não foi possível concluir a operação.

**PENDENTE:** cadastro, atualização, status, vínculo e sincronização. Aprovar o contrato de entrada/saída antes da Entrega 2 e definir o tratamento do email opcional do cotista antes da sincronização. O DDL salvo não comprova equivalência com o banco ativo.

## Cadastro planejado — sem CPF

CPF removido dos requisitos por solicitação do cliente. **PENDENTE: POST /api/cotistas e POST /api/usuarios ainda não implementados.** CPF não será solicitado, aceito, armazenado ou usado como identificador.

Body proposto para POST /api/cotistas, sujeito à aprovação antes da Entrega 2:

```json
{"nome":"Cotista Exemplo FICTÍCIO","dataNascimento":"1990-01-05","telefone":"TESTE-TELEFONE-05","email":"cotista05@example.com","observacao":null}
```

Campos de consulta atuais: id, usuarioId, nome, dataNascimento, telefone, email, status, observacao. O futuro cadastro deverá rejeitar campos não permitidos, incluindo CPF; não há endpoint de cadastro para exercer essa rejeição nesta entrega.

POST /api/usuarios mantém o planejamento aprovado: somente admin; pode criar admin; perfil cotista vinculado a cotista existente; dados do cotista prevalecem no vínculo; hash seguro existente; criação/vínculo e sincronização na mesma transação. O novo requisito torna email do cotista obrigatório, substituindo a dúvida anterior sobre email opcional. Revisar o contrato definitivo antes de implementar.

**Migração preparada, não executada:** backend/migrations/001_remove_cotista_cpf.sql. Seeds e fixtures atuais exigem esquema migrado; o DDL salvo não comprova o banco ativo. Consultas deixam de retornar CPF. Nenhuma referência textual a CPF foi encontrada no frontend; não houve alterações nele. Revisar consumidores externos que ainda esperem o campo. Inventário e riscos: [STATUS_BACKEND.md](STATUS_BACKEND.md).

## Login e preenchimento de escala

O fluxo usa `usuario → perfil` e o vínculo `cotista.usuario_id`. Não usa nem altera as tabelas separadas user/account/session/jwks. Perfis provisionados: `admin` e `cotista`. O backend confere perfil e status no banco a cada requisição protegida; o frontend não envia perfil ou cotistaId para decidir permissões.

| Método | Rota | Perfil | Finalidade |
| --- | --- | --- | --- |
| POST | /api/auth/login | Público | Login com email/senha |
| GET | /api/auth/me | Autenticado | Usuário, perfil e vínculo de cotista atuais |
| POST | /api/escalas | admin | Criar escala mensal aberta |
| PATCH | /api/escalas/:escalaId/status | admin | Abrir, fechar ou encerrar escala |
| PUT | /api/escalas/:escalaId/dias/:data/plantoes/:codigoPeriodo | admin | Criar/atualizar dia e liberar plantão com quantidade |
| PATCH | /api/escalas/:escalaId/dias/:data/plantoes/:codigoPeriodo/status | admin | Abrir/encerrar plantão |
| GET | /api/disponibilidades?escalaId=:escalaId | cotista | Ler somente suas escolhas para preencher a tela |
| PUT | /api/disponibilidades/:diaId | cotista | Registrar/substituir sua única escolha no dia |
| GET | /api/escalas/:ano/:mes/calendario | Público | Calendário e opções liberadas |

Nos endpoints protegidos: `Authorization: Bearer <accessToken>`. Body JSON: `Content-Type: application/json`. Login devolve `accessToken`, `tokenType: Bearer`, `expiresIn: 3600` e `usuario` (id, nome, email, perfil, cotistaId e cotistaStatus). Não retorna senha/hash. Senhas são armazenadas com scrypt; o token é JWT HS256 e exige AUTH_TOKEN_SECRET privado com no mínimo 32 bytes. O login tem limite de 10 tentativas por IP em 10 minutos, em memória por processo, e limite de verificações simultâneas.

Bodies de exemplo (contrato; não são novas requisições já executadas no mês da demonstração):

```json
{"email":"seu-email","senha":"sua-senha"}
```

```json
{"nome":"Escala fevereiro 2027","ano":2027,"mes":2,"quantidadeCotasPadrao":4,"observacao":null}
```

O POST de escala devolve HTTP 201 com `id`, `nome`, `ano`, `mes`, `status` e `quantidadeCotasPadrao`. O mês deve estar livre; duplicidade retorna 409. As datas inicial/final são derivadas do mês real, incluindo anos bissextos. Dias só são criados ao liberar plantões. Usar o id devolvido, sem supor o próximo ID.

Para liberar, por exemplo, `PUT /api/escalas/ID_RETORNADO/dias/2027-02-01/plantoes/D`:

```json
{"quantidadeNecessaria":2,"observacao":null}
```

Retorna HTTP 200 com `id`, `diaId`, `periodoId`, `quantidadeNecessaria`, `status`. A escala deve estar aberta e a data dentro de seu mês/intervalo. O código deve ser D, N1 ou N2 e existir como período ativo. O PUT é idempotente pelo par dia/período; repetir atualiza quantidade e reabre esse plantão. A quantidade é definida pelo administrador; não existe cálculo automático ou divisão automática entre N1/N2.

Para status de escala: `{"status":"aberta"}`, `{"status":"fechada"}` ou `{"status":"encerrada"}`. Para status de plantão: `{"status":"aberto"}` ou `{"status":"encerrado"}`. Fechar escala/plantão bloqueia novas escolhas, preservando as já registradas. Não há exclusão automática.

O GET do calendário agora inclui em cada dia `opcoesDisponibilidade` (array de códigos) e `liberadoParaPreenchimento` (boolean). O frontend deve usar esses campos para habilitar o preenchimento. São derivados da escala aberta, do intervalo e dos plantões abertos com quantidade positiva/período ativo. Os plantões antigos TESTE_D/TESTE_N continuam como demonstração histórica e não foram convertidos automaticamente em D/N1/N2.

| Opção | Horário/ciclo informado | Uso |
| --- | --- | --- |
| D | 07h–19h | Diurna |
| N1 | 19h–07h do dia seguinte | Noturna |
| N2 | 18h–06h do dia seguinte | Noturna |
| I | Ciclo 07h–07h | Disponibilidade flexível para qualquer cota; não confirma 24h de serviço |

I é oferecido quando existe algum plantão D/N1/N2 liberado no dia e o período I está ativo. I não gera plantão físico nem quatro vagas adicionais. N1/N2 são ambas opções noturnas; regras de compartilhamento/distribuição entre elas ainda não são calculadas.

O cotista chama `PUT /api/disponibilidades/DIA_ID`:

```json
{"codigoPeriodo":"I","observacao":null}
```

Retorna HTTP 200 com `id`, `cotistaId`, `diaId`, `periodoId`, `observacao` e `codigoPeriodo`. Há apenas uma opção por cotista/dia; reenviar com outro código substitui a escolha. As escritas usam transações e bloqueio do cotista para serializar alterações simultâneas. Registros legados com múltiplas escolhas retornam 409 para revisão; não são apagados silenciosamente.

Vários cotistas podem escolher a mesma vaga, inclusive acima da quantidade ofertada: isso registra candidaturas, não confirmação. Não há consumo de vaga, participação automática, prioridade por ordem de chegada ou desempate. A distribuição automática será implementada quando suas regras forem definidas.

GET `/api/disponibilidades?escalaId=ID` devolve array com id, diaId, data, codigoPeriodo, periodoId, observacao e registradaEm, apenas do cotista autenticado. Não aceita cotistaId informado pelo cliente.

Códigos: 400 (dados/campos inválidos), 401 (login/token inválido ou usuário inativo), 403 (perfil incorreto ou cotista não vinculado/ativo), 404 (recurso inexistente), 409 (duplicidade, escala fechada ou dia/período não liberado), 429 (limite de login), 503 (chave de autenticação ou permissões SQL não configuradas), 500 (erro interno sem detalhes sensíveis).

Testes do fluxo com PostgreSQL real foram feitos em Express local com conexão real e transação revertida: login, perfil, criação de escala, duplicidade, liberação, dois candidatos para uma vaga, troca D/I, consulta própria, fechamento/reabertura e bloqueio de escala. O driver é redirecionado à mesma conexão real para permitir rollback; não são respostas SQL simuladas. Logins persistentes também foram verificados em processo novo com pool real, sem esse redirecionamento: [evidência sem tokens/senhas](evidence/workflow-smoke.json).

Preparação operacional:

```powershell
npm.cmd run setup:periodos
npm.cmd run setup:conta
```

O segundo comando exige SETUP_PERFIL (admin/cotista), SETUP_NOME, SETUP_EMAIL e SETUP_SENHA no ambiente privado. Para cotista, também SETUP_COTISTA_ID de um cotista ativo ainda sem usuário. Não enviar senha como argumento. Não há cadastro público que permita escolher perfil admin. O script recusa email existente e não redefine senha. A senha de cadastro exige 12–256 caracteres.

Há duas contas TESTE já provisionadas. As credenciais estão somente no arquivo local ignorado `backend/.workflow-demo-credentials.json`; não copiar para documentação, coleção ou Git. Usuário admin ID 1; usuário cotista ID 2, vinculado ao cotista ID 5. As tabelas de autenticação externa existentes não foram alteradas.

Para o frontend: login → guardar o accessToken de forma apropriada → usar usuario.perfil para apresentar a tela → enviar o Bearer em cada gravação/consulta própria. As permissões são aplicadas pelo backend. O token vence em uma hora e não possui refresh/logout nesta etapa; realizar novo login quando necessário.

Thunder Client: importar [coleção do fluxo](../thunder-client/siscota-workflow.postman_collection.json) e [ambiente do fluxo](../thunder-client/siscota-workflow.postman_environment.json), ativar esse ambiente, preencher as duas senhas localmente e copiar o accessToken de cada login para adminToken/cotistaToken. O POST de escala devolve escalaId; o calendário devolve diaId. Preencher esses dois valores uma vez no ambiente. O exemplo usa fevereiro/2027, que precisa estar livre antes do cadastro. As requisições de escrita gravam dados; não executar a coleção inteira indiscriminadamente. Cada URL já está no campo raw compatível com o importador instalado.

## Calendário mensal

**Finalidade:** consultar a escala do mês, seus dias, plantões, períodos cadastrados e distribuição diária padrão.

**Método:** GET  
**URL:** `http://localhost:8080/api/escalas/:ano/:mes/calendario`  
**Situação:** FUNCIONANDO. Respostas 200, 400 e 404 verificadas por HTTP real contra o PostgreSQL siscota.

| Item | Contrato atual |
| --- | --- |
| ano | Segmento obrigatório; convertido com Number(); inteiro de 2000 a 9999 |
| mes | Segmento obrigatório; convertido com Number(); inteiro de 1 a 12 |
| Query | Nenhuma query é utilizada |
| Body | Não há body |
| Headers obrigatórios | Nenhum; Accept: application/json é opcional |
| Autenticação | A rota não possui middleware de autenticação; token não é exigido |

Exemplo de requisição realmente executada:

```powershell
curl.exe -i http://localhost:8080/api/escalas/2026/11/calendario
```

Resposta **real**, HTTP **200**, escala ID `2`, 30 dias, 60 plantões e distribuição de 2 cotas diurnas e 2 noturnas. Abaixo está um recorte com o primeiro dia; o [JSON completo obtido](evidence/calendar-november.json) contém os 30 dias.

```json
{
  "escala": {
    "id": "2",
    "nome": "TESTE Novembro 2026 - 4 cotas",
    "mes": 11,
    "ano": 2026,
    "dataInicio": "2026-11-01T03:00:00.000Z",
    "dataFim": "2026-11-30T03:00:00.000Z",
    "status": "aberta",
    "observacao": "TESTE SISCOTA NOVEMBRO 2026 V1",
    "criadaEm": "2026-11-04T19:27:34.894Z",
    "quantidadeCotasPadrao": 4
  },
  "dias": [
    {
      "id": "2",
      "escalaId": "2",
      "data": "2026-11-01T03:00:00.000Z",
      "plantoes": [
        {
          "id": "2",
          "diaId": "2",
          "periodoId": "3",
          "quantidadeNecessaria": 2,
          "status": "aberto",
          "observacao": "TESTE SISCOTA NOVEMBRO 2026 V1",
          "criadoEm": "2026-11-04T19:27:34.894Z"
        },
        {
          "id": "3",
          "diaId": "2",
          "periodoId": "4",
          "quantidadeNecessaria": 2,
          "status": "aberto",
          "observacao": "TESTE SISCOTA NOVEMBRO 2026 V1",
          "criadoEm": "2026-11-04T19:27:34.894Z"
        }
      ],
      "opcoesDisponibilidade": [],
      "liberadoParaPreenchimento": false
    }
  ],
  "periodos": [
    {
      "id": "5",
      "codigo": "D",
      "nome": "Diurno",
      "descricao": "Diurno: 07h às 19h.",
      "horaInicio": "07:00:00",
      "horaFim": "19:00:00",
      "status": "ativo"
    },
    {
      "id": "8",
      "codigo": "I",
      "nome": "Disponibilidade flexível",
      "descricao": "Opção flexível para qualquer cota no ciclo 07h–07h. Não confirma plantão de 24h.",
      "horaInicio": "07:00:00",
      "horaFim": "07:00:00",
      "status": "ativo"
    },
    {
      "id": "6",
      "codigo": "N1",
      "nome": "Noturno 1",
      "descricao": "Noturno: 19h às 07h do dia seguinte.",
      "horaInicio": "19:00:00",
      "horaFim": "07:00:00",
      "status": "ativo"
    },
    {
      "id": "7",
      "codigo": "N2",
      "nome": "Noturno 2",
      "descricao": "Noturno: 18h às 06h do dia seguinte.",
      "horaInicio": "18:00:00",
      "horaFim": "06:00:00",
      "status": "ativo"
    },
    {
      "id": "3",
      "codigo": "TESTE_D",
      "nome": "TESTE Diurno",
      "descricao": "TESTE SISCOTA NOVEMBRO 2026 V1",
      "horaInicio": "08:00:00",
      "horaFim": "20:00:00",
      "status": "ativo"
    },
    {
      "id": "4",
      "codigo": "TESTE_N",
      "nome": "TESTE Noturno agregado",
      "descricao": "TESTE SISCOTA NOVEMBRO 2026 V1",
      "horaInicio": "20:00:00",
      "horaFim": "08:00:00",
      "status": "ativo"
    }
  ],
  "distribuicaoDiariaPadrao": {
    "totalQuotas": 4,
    "hoursPerQuota": 12,
    "nightPeriodAllocation": "pending",
    "supported": true,
    "diurnalQuotas": 2,
    "nightQuotas": 2
  }
}
```

Outra requisição realmente executada: `GET http://localhost:8080/api/escalas/2000/1/calendario`.
Resposta **real**, HTTP **404**, período confirmado ausente por SELECT:

```json
{
  "error": "Escala não encontrada para o período informado."
}
```

Requisição realmente executada: `GET http://localhost:8080/api/escalas/1999/11/calendario`.
Resposta **real**, HTTP **400**:

```json
{
  "error": "Ano inválido. Informe um ano entre 2000 e 9999."
}
```

Requisição realmente executada: `GET http://localhost:8080/api/escalas/2026/13/calendario`.
Resposta **real**, HTTP **400**:

```json
{
  "error": "Mês inválido. Informe um mês entre 1 e 12."
}
```

### Sucesso e erros

| HTTP | Comportamento | Evidência |
| --- | --- | --- |
| 200 | Retorna calendário quando escala existe | Obtido com novembro/2026; 30 dias e 60 plantões comparados ao PostgreSQL |
| 400 | Ano/mês inválido; valida ano primeiro | Obtido em HTTP real |
| 404 JSON | Período válido sem escala | Obtido em HTTP real e confirmado por SELECT |
| 404 HTML | Segmentos obrigatórios ausentes; rota não corresponde | Obtido em HTTP real; não interpretar todo 404 como JSON |
| 500 JSON | `{"error":"Não foi possível consultar o calendário."}` | Implementado e testado com falha simulada; não provocado no PostgreSQL real |

O contrato abaixo foi lido no código e conferido na resposta real de novembro/2026:

- `escala`: id, nome, mes, ano, dataInicio, dataFim, status, observacao, criadaEm, quantidadeCotasPadrao.
- `dias`: array de id, escalaId, data e `plantoes` (array). Ordenado por data e id. Pode ser vazio.
- Cada plantão: id, diaId, periodoId, quantidadeNecessaria, status, observacao, criadoEm.
- `periodos`: array de id, codigo, nome, descricao, horaInicio, horaFim, status. Contém todos os períodos cadastrados, não somente os usados no mês; ordenado por codigo e id.
- `distribuicaoDiariaPadrao`: totalQuotas, hoursPerQuota, nightPeriodAllocation, supported, diurnalQuotas, nightQuotas; `reason` quando a quantidade não possui regra aprovada.

IDs bigint são retornados como strings pela configuração padrão atual de pg. Quantidades e ano/mês são inteiros. Observações/descrições opcionais podem ser null. Nesta execução, dataInicio e dia.data retornaram `2026-11-01T03:00:00.000Z`, e os horários de período retornaram `08:00:00`/`20:00:00`. Datas e timestamps passam pela serialização pg/Express; a tarefa não impôs um novo formato/fuso. Evitar interpretar o dia da escala usando conversão automática para um fuso diferente sem validar o resultado.

### Regras implementadas

- Cada cota representa 12 horas.
- 4 cotas: 2 diurnas e 2 noturnas.
- 3 cotas: 1 diurna e 2 noturnas.
- Outras quantidades: supported=false, diurnalQuotas=null, nightQuotas=null e motivo de regra não aprovada.
- nightPeriodAllocation permanece `pending`. Não há distribuição automática N1/N2.
- Não há atribuição automática de cotistas. O calendário não retorna cotistas, participações ou disponibilidade.
- A distribuição retornada descreve o padrão da escala; o serviço não verifica se a soma dos plantões corresponde a esse padrão.
- Zeros à esquerda e notação exponencial podem passar por Number(); isso não é validação textual estrita.

## Acesso pela máquina do frontend

Na mesma máquina, usar `http://localhost:8080`. Em outra máquina, substituir localhost pelo IP/hostname da máquina do backend: `http://<IP-DO-BACKEND>:8080`. Localhost no navegador do frontend aponta para a própria máquina do usuário. Liberar a porta no firewall apenas se necessário; conectividade LAN não foi testada nesta sessão.

O servidor atual chama app.listen(PORT) sem host restritivo. A configuração é PORT no ambiente/.env, padrão 8080. Verificar o endereço efetivamente acessível na rede antes de integrar.

O backend usa `cors()` sem opções. Foi obtido `Access-Control-Allow-Origin: *` em requisição com Origin: http://localhost:3000. Não há configuração de cookies com credentials. A existência de tabelas de autenticação no PostgreSQL não implica que esta rota esteja protegida.

Exemplo de consumo:

```javascript
const response = await fetch(`${baseUrl}/api/escalas/2026/11/calendario`);
const contentType = response.headers.get('content-type') || '';
const data = contentType.includes('application/json')
  ? await response.json()
  : await response.text();
if (!response.ok) {
  throw new Error(typeof data === 'object' ? data.error : `HTTP ${response.status}`);
}
```

## Limitações e execução

O cadastro/liberação de escala e as escolhas do cotista estão implementados nas rotas acima. Consultas administrativas de usuários/cotistas foram implementadas sem validação em execução. Escritas desses cadastros, CRUD de períodos/participações e distribuição automática permanecem pendentes. Não integrar por caminhos hipotéticos.

Na pasta backend:

```powershell
npm.cmd start
npm.cmd run test:integration
```

Coleção enxuta: [siscota-free.postman_collection.json](../thunder-client/siscota-free.postman_collection.json), com 12 GETs, URLs absolutas e sem environments/scripts. Importar em Collections → Import. Não usa recursos pagos de scripts, sincronização ou relatórios; não foi validada pela interface da extensão instalada. A documentação oficial confirma [importação Postman 2.1](https://docs.thunderclient.com/features/import); limites de importação são definidos pelo [plano instalado](https://www.thunderclient.com/pricing).

Respostas e resultados reais de cada requisição: [evidence/http.json](evidence/http.json). Os 12 GETs da coleção corresponderam ao status esperado, inclusive o 200 de novembro/2026. Os cotistas TESTE existem no banco, mas não são retornados pelo endpoint e não foram atribuídos automaticamente a plantões.
