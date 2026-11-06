# STATUS BACKEND — 05/11/2026

## Estado atual confirmado após execução externa das migrações

Leitura real confirmou em siscota.public.cotista: CPF ausente; telefone/email/data_nascimento NOT NULL; CHECKs de telefone/email não vazios ativos. Quatro registros preservados (IDs 5–8), ativos, todos preenchidos; vínculo cotista 5 → usuario 2 preservado. Execução das migrações informada pelo responsável e resultado estrutural confirmado por catálogo; não houve execução desses arquivos pelo agente nesta etapa. Backup recuperável não foi verificado.

Após confirmação das permissões por coluna e ausência de conflito de email, aplicada a correção cadastral anteriormente autorizada: usuario 2 recebeu nome/email do cotista 5 em transação com bloqueios e COMMIT. Leitura posterior confirmou igualdade dos dois campos. Login do usuario 2 passa a usar cotista05@example.com; senha, perfil, status e vínculo não foram alterados. Não foram executados testes ou HTTP.

Requisito confirmado: cadastro administrativo enviará link temporário para definir senha no primeiro acesso. Fluxo ainda não implementado; prever validade, uso único e armazenamento seguro do token, sem enviar senha permanente. Nenhum email foi enviado. Frontend não pode ser alterado sem autorização. Seeds/fixtures e contrato de cadastro continuam com as pendências documentadas abaixo; as seções antigas são histórico e não representam o estado atual do banco.

## Preparação final — valores aprovados, execução não autorizada (05/11/2026)

Os quatro conjuntos fictícios da proposta abaixo estão **APROVADOS SOMENTE PARA DESENVOLVIMENTO**. Nenhum foi aplicado. Nesta etapa foram executados apenas SELECTs em transação READ ONLY, encerrada por ROLLBACK; nenhum teste, HTTP, seed, backup ou restauração foi executado.

Vínculo confirmado: cotista 5 → usuario 2. Cotista: nome TESTE Cotista 01 e email NULL. Usuário: nome TESTE Cotista Workflow, email cotista.workflow@example.invalid, perfil cotista, status ativo. Não foram consultados hashes/senhas. Nome/email divergem. O email proposto cotista05@example.com não conflitou com usuario na comparação case-insensitive realizada; repetir a verificação antes de eventual sincronização. Mudar apenas cotista pela 002 mantém o login atual e deixa divergência explícita. Proposta para aprovação posterior: aplicar prevalência dos dados do cotista ao usuário em fluxo próprio e transacional, com verificação de unicidade, autorização e comunicação da mudança do email de login. Isso alteraria outra tabela e está fora das três migrações atuais. Não alterar silenciosamente os nomes nem criar sincronização nesta preparação.

Telefone atual: varchar(20), nullable; email varchar(200), nullable; nascimento date, nullable. Os quatro marcadores TESTE-TELEFONE-05 a 08 têm 17 caracteres, são não discáveis e passam nos CHECKs propostos de conteúdo não vazio. Não existe CHECK atual de formato telefônico, nem cadastro POST implementado. Validação futura só de dígitos seria incompatível: precisará de decisão sobre dados de demonstração, sem exceção automática para produção. Os marcadores aprovados não foram modificados.

Permissões confirmadas: papel siscota_codex sem SUPERUSER/CREATEDB/BYPASSRLS; proprietário de cotista e usuario é postgres. SELECT em ambas; UPDATE em cotista, sem UPDATE em usuario; papel não é membro do proprietário. 001/003 precisam de proprietário ou papel autorizado. Nenhuma permissão modificada. Backup completo exige leitura de todas as tabelas/sequences e tratamento autorizado de eventuais políticas RLS; tais permissões globais não foram comprovadas nesta etapa.

Revisão textual das migrações: ordem manual 002 → 001 → 003. Nenhuma executa DELETE, CASCADE ou altera ID/vínculo/nome/status, nem outras tabelas. Cada uma tem transação própria e guarda de banco; 002 recusa campos já preenchidos/status ou vínculos divergentes, 001 falha se CPF já não existir, 003 exige CPF ausente/dados completos e aplica NOT NULL + CHECKs contra nulos/vazios/whitespace. Usar ON_ERROR_STOP; erro exige parar e ROLLBACK da transação aberta. Não existe atomicidade entre COMMITs separados. Risco adicional: 002 confere IDs/status/vínculos, mas não compara nomes ou dependentes com a auditoria: repetir essa conferência manualmente em janela controlada. A numeração não corresponde à ordem operacional: não usar runner lexical. Não houve validação SQL em execução. Nome já é NOT NULL, mas string vazia não é impedida; se nome não vazio também for requisito, aprovar CHECK específico antes de implementá-lo.

### Backup e recuperação — comandos preparados, NÃO EXECUTAR nesta etapa

A configuração do backend usa DATABASE_URL ou PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD com dotenv. Não imprimir/copiar esses valores. Os comandos abaixo pressupõem perfis libpq privados, previamente configurados por responsável autorizado: siscota_backup apontando para o mesmo servidor e banco siscota, e siscota_restore_admin para o mesmo servidor com banco postgres. Esses perfis NÃO foram criados ou verificados. Não colocar senha em comando, URI, relatório ou histórico; usar autenticação privada suportada pelo libpq. Verificar host/porta e SELECT current_database() no destino antes de executar operações futuras. Ferramentas não foram localizadas no diretório padrão consultado nesta preparação; informar o caminho real de pg_dump/pg_restore/psql/createdb. Não houve execução desses utilitários.

Recomenda-se diretório fora do repositório, com acesso restrito ao responsável; o dump contém dados pessoais e credenciais armazenadas. Usar ferramentas compatíveis com PostgreSQL 18, preferencialmente da mesma versão principal. Roteiro PowerShell proposto (cada comando deve parar em código de saída diferente de zero):

```powershell
# SOMENTE APOS AUTORIZACAO PARA BACKUP/RESTAURACAO
$backupDir = Join-Path $env:LOCALAPPDATA 'SISCOTA\backups'
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$dump = Join-Path $backupDir "siscota_$stamp.dump"
pg_dump --dbname='service=siscota_backup' --format=custom --file=$dump
if ($LASTEXITCODE -ne 0) { throw 'Backup falhou; arquivo nao confirmado' }
Get-FileHash -Algorithm SHA256 -LiteralPath $dump
pg_restore --list $dump
if ($LASTEXITCODE -ne 0) { throw 'Catalogo do dump invalido' }

# Nome novo; createdb falha se ja existir. NUNCA usar siscota como destino.
$restoreDb = "siscota_restore_check_$stamp"
createdb --maintenance-db='service=siscota_restore_admin' --template=template0 $restoreDb
if ($LASTEXITCODE -ne 0) { throw 'Banco isolado nao criado; interromper' }
psql --dbname="service=siscota_restore_admin dbname=$restoreDb" --no-psqlrc --set=ON_ERROR_STOP=1 --command='SELECT current_database();'
if ($LASTEXITCODE -ne 0) { throw 'Destino nao confirmado' }
# Conferir manualmente que a resposta e exatamente $restoreDb antes do proximo comando.
pg_restore --dbname="service=siscota_restore_admin dbname=$restoreDb" --exit-on-error --single-transaction --no-owner --no-privileges $dump
if ($LASTEXITCODE -ne 0) { throw 'Restauracao falhou; backup nao validado' }
```

Não usar --clean ou --create no pg_restore, não reutilizar nome de banco e não executar DROP para resolver colisões. Criar banco isolado exige CREATEDB; restauração exige permissões de criação/DDL nele e extensões disponíveis. --no-owner/--no-privileges testa estrutura/dados, não a recuperação de donos/ACLs; planejar papéis e privilégios separadamente. pg_dump de um banco não inclui credenciais/definições globais dos papéis.

Checksum e --list verificam transferência/catálogo, mas NÃO comprovam recuperabilidade. Confirmar restauração completa, contagens de todas as tabelas, IDs/vínculos dos quatro cotistas, constraints/índices e eventuais avisos, comparando com evidência prévia capturada na mesma janela sem escritas concorrentes. Registrar versão, horário, checksum, local privado, destino isolado e resultado; não publicar conteúdos sensíveis. Até essa evidência existir, **BACKUP NÃO CONFIRMADO**.

Antes de cada COMMIT de migração, ROLLBACK reverte aquela transação. Depois de COMMIT, desfazer exige alteração compensatória autorizada; para recuperar valores removidos do CPF, é necessário backup restaurado isoladamente e plano de recuperação. Nunca restaurar diretamente sobre siscota como tentativa de correção. Backups anteriores contêm CPF e precisam de retenção/acesso definidos.

Próximas autorizações: localizar/configurar ferramentas e perfis privados pelo responsável; autorizar backup e criação/restauração no banco isolado; confirmar evidências e privilégios; aprovar tratamento posterior da divergência cadastral; então autorizar explicitamente execução das migrações. A aprovação dos valores fictícios não autoriza UPDATE nem DDL. Nenhuma migração aplicada. Arquivos modificados nesta preparação: somente docs/STATUS_BACKEND.md e docs/API_FRONTEND.md.

## Preparação segura — auditoria e proposta (05/11/2026)

**NENHUMA ESCRITA NO BANCO.** Consultas reais em transação READ ONLY, encerrada por ROLLBACK. Banco siscota, schema public, papel siscota_codex, proprietário de cotista: postgres. SELECT e UPDATE disponíveis; papel não é membro do proprietário. ALTER deverá ser executado por proprietário/papel autorizado, sem contornar permissões.

Os IDs 5, 6, 7 e 8 existem e estão ativos. ID 5 vinculado ao usuario 2; demais sem vínculo. Contagem de dependentes para cada um dos quatro IDs: disponibilidade=0, participacao=0, solicitacao=0. As FKs ativas confirmam essas três tabelas e o vínculo cotista.usuario_id → usuario.id; nenhuma outra FK incidente foi encontrada. Nenhum CPF ou dado pessoal existente foi exibido.

PK cotista_pkey, UNIQUE cotista_usuario_id_key e cotista_cpf_key, CHECK de status e NOT NULL de id/nome/cpf/status/cadastrado_em continuam existentes. Índices: PK, usuario_id único e cpf único. Oito triggers internas de FK; nenhuma trigger de usuário em cotista. Nenhuma view dependente apareceu em pg_depend. Essa análise de dependências declaradas não exclui SQL dinâmico ou consumidores externos.

### Proposta fictícia — aguarda aprovação, não aplicada

| ID | Telefone não discável | Email reservado | Nascimento fictício |
| --- | --- | --- | --- |
| 5 | TESTE-TELEFONE-05 | cotista05@example.com | 1990-01-05 |
| 6 | TESTE-TELEFONE-06 | cotista06@example.com | 1990-01-06 |
| 7 | TESTE-TELEFONE-07 | cotista07@example.com | 1990-01-07 |
| 8 | TESTE-TELEFONE-08 | cotista08@example.com | 1990-01-08 |

São marcadores de demonstração compatíveis com varchar(20), não números reais utilizáveis; precisam de aprovação expressa. Não substituem documento pessoal. Nome, status, IDs e vínculos não serão alterados. Não sincronizar usuario nesta migração: escopo restrito a cotista; eventual divergência de email do usuário vinculado fica pendente do fluxo futuro aprovado.

### Arquivos preparados e sequência futura

1. Reconfirmar banco/schema, IDs, vínculos, dados ausentes e dependências em janela sem escritas concorrentes.
2. Administrador produzir backup completo protegido, verificar conclusão e restaurar em ambiente separado; conferir contagens/IDs/vínculos. Registrar data, localização privada e evidência de restauração. Não há backup recuperável confirmado. O script prepare-test-database.js copia apenas esquema: não substitui backup de dados. Não foi encontrado procedimento completo de recuperação já documentado nos arquivos consultados.
3. Confirmar papel autorizado e aprovação desta proposta. Nenhuma concessão ou troca de proprietário foi realizada.
4. Executar manualmente 002_regularize_demo_cotistas.sql: somente campos ausentes dos quatro IDs, guardas de banco/status/vínculo e recusa de sobrescrita/reaplicação.
5. Executar 001_remove_cotista_cpf.sql, agora com guarda de banco e BEGIN READ WRITE. CPF ausente provoca erro, evitando reaplicação silenciosa; sem CASCADE.
6. Executar 003_require_cotista_contact.sql: trava a tabela, exige CPF já removido e todos os cadastros completos, aplica três NOT NULL e CHECKs contra telefone/email vazios ou compostos de espaços (inclusive outros whitespace). Nome já tem NOT NULL; observação permanece opcional.
7. Confirmar por leitura CPF ausente, constraints, quatro IDs/vínculos/status/nomes e contagens dependentes preservados. Comparar com captura prévia protegida; não publicar dados pessoais. Conferir nenhuma outra tabela modificada.

Regularização e constraints ficam separadas para permitir aprovações e diagnóstico independentes. Ordem operacional proposta **002 → 001 → 003**: os números identificam arquivos; não há runner automático autorizado. Não executar por ordenação lexical. Cada arquivo possui sua própria transação/COMMIT; não há atomicidade conjunta entre os três. Usar cliente com ON_ERROR_STOP; após erro, interromper e ROLLBACK. Janela controlada evita estado intermediário exposto. Uma execução futura deve registrar aplicação para evitar repetição; guardas não substituem um histórico operacional.

Antes do COMMIT de cada arquivo, ROLLBACK desfaz suas alterações, inclusive DDL. Após COMMIT, ROLLBACK não desfaz a etapa anterior. Restaurar CPF removido exige backup (preferencialmente restaurado isoladamente e recuperação planejada pelo administrador); não recriar com valores inventados. Reverter dados/constraints após COMMIT exige nova alteração aprovada e estado anterior protegido; restauração integral no banco ativo pode perder escritas posteriores e exige plano/janela próprios.

### Compatibilidade e bloqueios

GETs administrativos mantêm arquitetura, campos explícitos sem CPF e identificação por ID; rotas/controllers/services/repositories de usuário e cotista foram revisados estaticamente. POST /api/cotistas e POST /api/usuarios **não existem ainda**: não há validação de cadastro executável. O contrato planejado passa a exigir nome, telefone, email e dataNascimento; observação opcional. Nenhuma Entrega 2 implementada.

Seeds seed-development.js/seed-demo.js, diagnose-development.js e fixtures atuais ainda omitem os novos campos obrigatórios: falharão após 003 se tentarem criar cotista. Precisam de adequação futura aprovada; não foram executados ou modificados nesta preparação. O DDL scripts/siscota-test-schema.sql ainda deixa os três campos opcionais: atualizar como esquema alvo somente com revisão explícita, sem confundi-lo com o banco ativo. Nenhum endpoint ou frontend alterado. Nenhum teste automatizado/HTTP executado.

Arquivos desta preparação: modificado migrations/001_remove_cotista_cpf.sql; criados migrations/002_regularize_demo_cotistas.sql e migrations/003_require_cotista_contact.sql; atualizados docs/STATUS_BACKEND.md e docs/API_FRONTEND.md. Migrações apenas revisadas como texto, sem validação SQL pelo servidor.

## Verificação real da migração — bloqueada (05/11/2026)

Conexão conferida pela configuração do backend: banco `siscota`, schema `public`, tabela `cotista`. Somente consultas de leitura, encerradas com ROLLBACK. Nenhuma alteração estrutural ou de dados foi aplicada.

- Total consultado: 4 cotistas. IDs 5, 6, 7 e 8 apresentam telefone nulo/vazio, email nulo/vazio e data_nascimento nula. Não foram inventados dados nem excluídos registros. ID 5 vinculado ao usuario 2; IDs 6, 7 e 8 sem vínculo.
- CPF ainda existe e é NOT NULL; UNIQUE/índice `cotista_cpf_key` e constraint `cotista_cpf_not_null`. Dependências diretas consultadas no catálogo: essas duas constraints, sem outras identificadas nessa consulta.
- Telefone, email e data_nascimento ainda aceitam NULL. Não é possível aplicar os três NOT NULL com os dados atuais. NOT NULL sozinho também não impede strings vazias.
- FKs preservadas: cotista.usuario_id → usuario.id; disponibilidade, participacao e solicitacao referenciam cotista.id. PK e UNIQUE de usuario_id existentes.
- Papel conectado não é membro do proprietário da tabela; execução futura de ALTER exige confirmar privilégio de proprietário ou conexão administrativa autorizada. Backup recente e recuperável não confirmado.
- Só existe a migração 001 preparada, que remove CPF e ainda não contempla os três NOT NULL solicitados. O DDL de teste é esquema alvo, diferente do banco ativo. Não há comprovação de aplicação anterior: CPF ainda presente e três campos opcionais.

**MIGRAÇÃO PENDENTE / NÃO EXECUTADA.** Sem COMMIT de alteração e sem etapa de verificação pós-migração; os 4 registros consultados não foram modificados. Antes de prosseguir: fornecer/corrigir dados reais por procedimento autorizado, confirmar backup recuperável e recente, ajustar/revisar o SQL completo e autorizar explicitamente após a análise. Repetir verificações imediatamente antes de qualquer alteração. Nenhum teste automatizado ou HTTP executado.

Atualização: fluxo de administrador e cotista implementado, com **13 combinações método/rota**. Login em usuario/perfil; admin cria/abre/fecha escalas e libera plantões; cotista registra uma única preferência por dia em disponibilidade. Alterar a opção substitui a anterior. Dois ou mais cotistas podem candidatar-se à mesma vaga; não há distribuição automática ou confirmação de participação.

Períodos oficiais cadastrados: D (ID 5, 07–19h), N1 (ID 6, 19–07h), N2 (ID 7, 18–06h) e I (ID 8, flexibilidade no ciclo 07–07h). I não cria plantão físico de 24h. N1/N2 são noturnas, sem divisão automática de cotas entre elas.

Contas TESTE persistentes: usuario 1/admin e usuario 2/cotista, este vinculado ao cotista 5. Senhas geradas aleatoriamente e salvas somente em `.workflow-demo-credentials.json` local, ignorado pelo Git. AUTH_TOKEN_SECRET foi gerado no .env privado, sem ser exibido. As tabelas externas user/account/session/verification/jwks não foram modificadas. Novos perfis admin/cotista e usuarios foram inseridos nas tabelas de domínio já existentes; nenhum esquema foi alterado.

É necessário **reiniciar o processo Node** para carregar as novas rotas. Os testes do fluxo usaram processos/instâncias Express novos e PostgreSQL real; o servidor que já estava aberto em 8080 não foi encerrado por Codex. Os plantões antigos TESTE_D/TESTE_N não foram convertidos automaticamente: para preencher um dia com os novos códigos, o administrador deve liberá-lo pela API. A gravação de escolha não cria participação nem consome vaga.

Contrato atualizado: [API_FRONTEND.md](API_FRONTEND.md). Nova coleção: [siscota-workflow.postman_collection.json](../thunder-client/siscota-workflow.postman_collection.json), com [ambiente sem senhas/tokens preenchidos](../thunder-client/siscota-workflow.postman_environment.json). Dados de setup e smoke sem segredos: [workflow-setup.json](evidence/workflow-setup.json), [workflow-smoke.json](evidence/workflow-smoke.json).

## Remoção de CPF — decisão do cliente (05/11/2026)

**CPF removido dos requisitos do SISCOTA por solicitação do cliente.** A regra anterior de 11 dígitos foi revogada. O ID interno continua sendo o identificador; nenhum documento substituto foi introduzido.

**IMPLEMENTADO no código:** CPF removido da seleção/projeção de cotistas, seeds, probes, plano de demonstração e fixtures. Removido o caso de unicidade de CPF. O DDL de teste foi ajustado ao esquema alvo e identificado como tal; não representa o banco ativo. Controller e usuarioService não dependiam de CPF e não precisaram mudar. Autenticação, vínculos, nome/email e os nove endpoints originais não foram alterados.

**NÃO VALIDADO EM EXECUÇÃO:** sem testes, HTTP, SQL ou migração. Checagens limitadas a fontes e sintaxe. O banco não foi atualizado.

**PENDENTE:** autorizar e aplicar migrations/001_remove_cotista_cpf.sql após revisão das dependências no banco ativo e backup protegido. A coluna atual é NOT NULL no DDL salvo: seeds/fixtures sem CPF falharão antes da migração. GETs sem CPF são compatíveis com o modelo antigo ou novo conforme o DDL analisado. Migração não usa CASCADE; dependências externas inesperadas bloqueiam a remoção. DROP COLUMN remove os valores da coluna, sem excluir cotistas; após COMMIT, recuperação dos valores exige backup. Backups e histórico anteriores podem continuar contendo o campo e exigem política própria de retenção.

Inventário das referências encontradas na auditoria inicial:

| Classificação | Arquivos e ocorrências |
| --- | --- |
| Uso ativo | src/repositories/cotistaRepository.js (SELECT); src/services/cotistaService.js (resposta) — removidos |
| Dependência do banco | scripts/siscota-test-schema.sql: coluna NOT NULL e UNIQUE cotista_cpf_key — esquema alvo ajustado; banco ativo não consultado |
| Scripts de desenvolvimento | scripts/seed-development.js (geração/INSERT), seed-demo.js (INSERT), diagnose-development.js (probe), demo-plan.json (quatro valores) — removidos |
| Teste/fixture | test/support/fixtures.js, test/development/workflow-postgres.test.js (INSERTs), test/integration/backend.test.js (duplicidade) — adaptados, sem execução |
| Documentação | docs/API_FRONTEND.md e STATUS_BACKEND.md (contrato/carga); test/SIMULACAO.md (plano/colisão); test/RELATORIO.md (fixture/constraint) — atualizados |
| Histórico | docs/evidence/environment.json: SQL antigo, coluna e constraints cotista_cpf_key/cotista_cpf_not_null — evidência histórica preservada, não é configuração nem contrato atual |
| Frontend | Nenhuma referência textual a CPF encontrada nas fontes pesquisadas; nenhum arquivo alterado |

Referências restantes intencionais: esta decisão e notas históricas; migração de remoção; identificação da migração no DDL alvo; evidência antiga environment.json. Nenhum uso ativo do campo deve permanecer no código executável pesquisado. Não foi inspecionado histórico Git, arquivos privados ou dependências geradas.

Alterados: src/repositories/cotistaRepository.js; src/services/cotistaService.js; scripts/seed-development.js, seed-demo.js, diagnose-development.js, demo-plan.json, siscota-test-schema.sql; test/support/fixtures.js, test/development/workflow-postgres.test.js, test/integration/backend.test.js, test/SIMULACAO.md, test/RELATORIO.md; docs/API_FRONTEND.md e STATUS_BACKEND.md. Criado migrations/001_remove_cotista_cpf.sql.

Impactos pendentes: bancos de desenvolvimento/teste existentes precisam da migração autorizada; evidências históricas não devem ser confundidas com o novo contrato. Nenhuma tela/componente com referência textual a CPF foi localizado. O frontend deve usar os campos atuais do contrato. O hash de confirmação do demo-plan.json mudou; a autorização anterior vinculada ao hash não serve para o plano novo. Seeds não foram reaplicados.

Entrega 2 continua não implementada. Antes de cadastrar: aprovar contrato sem CPF, regras de vínculo e tratamento do email opcional. POST /api/usuarios seguirá admin, criação de admin permitida, hashPassword existente e criação/vínculo na mesma transação; para perfil cotista, vínculo a cotista existente com nome/email do cotista prevalecendo. A colisão entre email opcional do cotista e email obrigatório do usuário exige decisão antes da implementação. Sincronização de nome/email permanece requisito aprovado para futuras escritas.

## Entrega 1 — consulta administrativa (05/11/2026)

**IMPLEMENTADO:** quatro GETs administrativos para listar/detalhar usuários e cotistas. authenticate seguido de requireRole('admin'). Routes → Controllers → Services → Repositories → PostgreSQL. Nove endpoints anteriores preservados.

**NÃO VALIDADO EM EXECUÇÃO:** sem testes, HTTP ou SQL nesta entrega. Revisão de sintaxe, imports/exports, dependências e DDL salvo; banco ativo e permissões não conferidos. Resultados históricos abaixo não comprovam execução do código atual.

Usuário: id, nome, email, perfil, status, cotistaId. Cotista: id, usuarioId, nome, dataNascimento, telefone, email, status, observacao. Projeções explícitas, sem senha_hash. ID inválido: 400; detalhe ausente: 404; demais erros preservados. Contrato: [API_FRONTEND.md](API_FRONTEND.md).

Criados oito arquivos sob src/: routes/usuarioRoutes.js e cotistaRoutes.js; controllers/usuarioController.js e cotistaController.js; services/usuarioService.js e cotistaService.js; repositories/usuarioRepository.js e cotistaRepository.js. Modificados src/app.js e os dois documentos API_FRONTEND.md e STATUS_BACKEND.md.

**PENDENTE:** autorização e aprovação do contrato antes da Entrega 2. Nenhum POST, PATCH, status ou vínculo foi implementado. Sincronização aprovada será aplicada nas futuras escritas transacionais. O setup existente pode ter nomes/emails distintos entre registros vinculados; GET não os corrige. Definir tratamento de email opcional do cotista antes da sincronização. Nenhuma incompatibilidade impeditiva identificada no DDL salvo; compatibilidade com o banco ativo não validada.

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

Cotistas históricos: TESTE Cotista 01 a 04; cotista 5 vinculado ao usuario 2. A carga anterior usava CPF sintético, requisito agora revogado. O banco não foi alterado nesta entrega.

**Idempotência executada:** a segunda execução de npm.cmd run seed:dev retornou JA_EXISTENTE_SEM_ALTERACOES e zero registros criados. Totais permaneceram 1/30/2/60/4. Se a carga existente estiver incompleta ou pertencer a outro marcador, o script recusa sobrescrever.

Autenticação antes/depois: user=1, account=1, session=10, verification=0, jwks=1; contagens inalteradas. Os scripts desta tarefa não executam escrita nessas tabelas.

Evidências: [permissões/probes](evidence/environment.json), [primeira carga persistida e todos os IDs](evidence/seed-persisted.json), [repetição sem duplicidade](evidence/seed.json), [persistência e total por dia](evidence/persistence.json).

## 3. Testes

Execução histórica anterior às refatorações e à Entrega 1: **npm.cmd run test:integration**, saída zero. Não reexecutada nesta entrega.

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
| GET | /api/usuarios | Consulta administrativa (admin) | IMPLEMENTADO — NÃO VALIDADO EM EXECUÇÃO |
| GET | /api/usuarios/:id | Consulta administrativa (admin) | IMPLEMENTADO — NÃO VALIDADO EM EXECUÇÃO |
| GET | /api/cotistas | Consulta administrativa (admin) | IMPLEMENTADO — NÃO VALIDADO EM EXECUÇÃO |
| GET | /api/cotistas/:id | Consulta administrativa (admin) | IMPLEMENTADO — NÃO VALIDADO EM EXECUÇÃO |

URL da demonstração: **http://localhost:8080/api/escalas/2026/11/calendario**.

[API_FRONTEND.md](API_FRONTEND.md) documenta parâmetros, headers/body, autenticação, CORS, contrato temporal e exemplo real com recorte do primeiro dia. O JSON completo contém os 30 dias. Não há body, query ou token obrigatório. Os IDs bigint retornam como strings; nesta execução as datas retornaram em ISO UTC (primeiro dia 2026-11-01T03:00:00.000Z).

[Coleção Thunder Client](../thunder-client/siscota-free.postman_collection.json): Postman 2.1, 12 GETs, URLs absolutas, sem environments ou scripts personalizados. A importação Postman 2.1 é documentada pelo [fabricante](https://docs.thunderclient.com/features/import); os limites são os do [plano instalado](https://www.thunderclient.com/pricing). Importação não foi operada na interface nesta sessão.

## 5. Pendências

- Validar acesso pela rede da máquina do frontend e confirmar consumo visual do contrato temporal.
- Consultas administrativas de usuários/cotistas implementadas, sem validação em execução. Escritas desses cadastros, CRUD de períodos/participação e distribuição automática permanecem pendentes. Criação de escala, liberação e disponibilidade foram implementadas conforme as respostas do usuário.
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
