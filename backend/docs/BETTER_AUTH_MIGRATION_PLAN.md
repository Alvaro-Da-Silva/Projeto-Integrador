# Issue 80 — autorização e validação do vínculo — 10/11/2026

Vínculo autorizado, ainda sem execução confirmada. O papel siscota_codex não tem UPDATE sobre a coluna de vínculo. Aguardando operador PostgreSQL autorizado. Login, sessão persistida, perfil admin com cookie e logout ainda aguardam validação no PostgreSQL real.

O responsável autorizou exclusivamente a associação do administrador ID 1 ao identificador externo aprovado e dispensou novo backup nesta fase de desenvolvimento. Nenhuma migração ou concessão foi executada. O operador deve possuir a permissão necessária para a associação. O roteiro local solicita credenciais por entrada mascarada, verifica o par e as constraints, executa UPDATE parametrizado com contagem de uma linha, e verifica o vínculo após COMMIT. Somente o usuário aprovado pode ser testado.

Verificações HTTP no Express local: /api/auth/ok 200, /api/me e /api/usuarios sem sessão 401, cadastro público 403. A suíte de autenticação em memória aprovou 13 testes, incluindo bloqueio de perfil incorreto, usuário desativado, cotista sem vínculo ativo, elevação por perfil externo e Bearer legado. Esses casos simulados não confirmam sessão PostgreSQL.

No desenvolvimento, use API em http://localhost:8080 e frontend em http://localhost:3000, com cookies e credentials: include. Resolva o perfil pelo GET /api/me. O próximo marco é concluir o roteiro de login e logout no banco real, seguido da validação do cliente React. Esta seção prevalece sobre os estados históricos abaixo.

# Preparação do primeiro acesso real — 10/11/2026

A [#80](https://github.com/Alvaro-Da-Silva/Projeto-Integrador/issues/80) está com o Better Auth inicializado no Express local. O vínculo administrativo e o login real aguardam autorização e backup recuperável. Esta seção substitui os estados anteriores sobre configuração e privilégios.

## Diagnóstico e execução local

- O processo Node que carregava apenas o ambiente do backend encontrava `BETTER_AUTH_URL` e `BETTER_AUTH_SECRET` ausentes. `authSettings()` retornava `503` com “Better Auth não configurado”. `SISCOTA_TRUSTED_ORIGINS` também estava ausente, com padrão local, e a conexão PostgreSQL funcionava.
- A configuração Better Auth foi criada fora do projeto, em `%LOCALAPPDATA%\SISCOTA-Private\better-auth.dev.env`, com acesso exclusivo do usuário Windows. Foi gerado um segredo com 48 bytes aleatórios criptográficos após verificar a ausência de segredo no ambiente inspecionado e zero sessões não expiradas no banco. A configuração existente de PostgreSQL foi preservada.
- O Express foi iniciado apenas no loopback, porta 8080, com base `http://localhost:8080` e origens locais `http://localhost:3000` e `http://127.0.0.1:3000`. Prefira usar `localhost` no navegador para a API e para o frontend. A origem efetivamente usada nesta verificação foi `http://localhost:3000`.

Para iniciar a mesma configuração em uma porta 8080 livre, a partir do PowerShell:

```powershell
$private = Join-Path $env:LOCALAPPDATA 'SISCOTA-Private'
node --env-file="$private\better-auth.dev.env" "$private\start-express-dev.mjs"
```

## Banco e cópia de segurança

- O processo Node confirmou `siscota/public`, PostgreSQL 18.6 e papel `siscota_codex`, com `default_transaction_read_only=off` e transação normal leitura/escrita. A auditoria de catálogo e identidades executou somente consultas e `ROLLBACK`.
- Efeitos da 004 confirmados: `usuario.better_auth_user_id` é `text` nullable, com UNIQUE e FK validada para `public."user"(id)` e `ON DELETE RESTRICT`. `senha_hash` é nullable. Os cinco campos opcionais da 005 existem. O comparativo com os modelos gerados pelo Better Auth 1.7.19 encontrou zero colunas ausentes ou incompatíveis nas quatro tabelas básicas. As migrações não devem ser reaplicadas.
- `siscota_codex` tem SELECT nas quatro tabelas de autenticação, INSERT em `user` e `account`, INSERT/UPDATE/DELETE em `session` e UPDATE nas colunas `account.password` e `account.updatedAt`. Falta UPDATE na coluna do vínculo interno e escrita em `verification`. Os IDs das quatro tabelas Better Auth não usam sequences. O papel tem USAGE em `public.usuario_id_seq`.
- O `pg_dump` completo em formato customizado falhou ao ler `notificacao_id_seq`. O catálogo confirmou falta de SELECT também em `participacao_id_seq` e `solicitacao_id_seq`. A tentativa não produziu arquivo válido, checksum ou restauração. Usar um operador de backup que já tenha as permissões necessárias, sem ampliar a conta da aplicação. Gerar um novo arquivo exclusivo fora do projeto, conferir o catálogo e SHA-256 e restaurar em destino isolado. A cópia antiga não cobre a autenticação.

## Associação proposta para aprovação

O usuário interno **ID 1** tem perfil `admin`, status `ativo`, identificação de teste e vínculo nulo. Há uma única identidade Better Auth candidata, com uma credencial `credential` e `accountId = user.id`, sem vínculos existentes. O identificador externo exato é informado ao responsável fora deste documento. O formato armazenado coincide com o formato produzido pela versão instalada, e o verificador dessa versão passou com uma credencial sintética em memória. A senha da conta candidata ainda precisa ser confirmada privadamente, sem teste de login ou redefinição nesta etapa.

SQL proposto para operador autorizado, somente depois do backup validado e da aprovação do par exato. Em `psql`, definir `ba_user_id` com o identificador aprovado. A prévia abaixo termina em `ROLLBACK`. Para a execução autorizada, só confirmar a transação após validar que o retorno contém exatamente o par aprovado.

```sql
BEGIN;
UPDATE public.usuario AS u
   SET better_auth_user_id = b.id
  FROM public."user" AS b, public.perfil AS p
 WHERE u.id = 1
   AND p.id = u.perfil_id
   AND p.nome = 'admin'
   AND u.status = 'ativo'
   AND u.better_auth_user_id IS NULL
   AND b.id = :'ba_user_id'
   AND (SELECT COUNT(*) FROM public.account AS a
         WHERE a."userId" = b.id AND a."providerId" = 'credential') = 1
   AND EXISTS (
       SELECT 1 FROM public.account AS a
        WHERE a."userId" = b.id AND a."accountId" = b.id
          AND a."providerId" = 'credential' AND a.password IS NOT NULL)
   AND NOT EXISTS (
       SELECT 1 FROM public.usuario AS v WHERE v.better_auth_user_id = b.id)
RETURNING u.id, u.better_auth_user_id;
ROLLBACK;
```

## Testes e roteiro após aprovação

**Confirmado no Express local:** `GET /api/auth/ok` retornou 200 com `ok=true`, `GET /api/auth/get-session` sem sessão retornou 200 com `null`, `GET /api/me` e `GET /api/usuarios` sem sessão retornaram 401, cadastro público retornou 403, e a requisição com origem fora da lista retornou 403. Nenhuma sessão foi criada.

**Roteiro do primeiro acesso:** antes do teste HTTP, o responsável confirma a senha da identidade por entrada mascarada e verificação em memória com `verifyPassword`, usando apenas a credencial da conta aprovada e sem registrar senha ou hash. Após o vínculo autorizado, testar login inválido e válido, cookie criado, consulta de sessão, `/api/me` com o perfil interno admin, consulta administrativa, acesso sem cookie, logout e rejeição do cookie anterior. Confirmar o cadastro público bloqueado. Usar apenas o ambiente local e evitar ações de escrita em escala ou plantões. Nunca registrar o cookie, o valor do token ou dados da conta.

# Estado conferido em siscota/public — 09/11/2026

A autorização atual permite o banco principal. Backup informado no GitHub, com validação dispensada expressamente pelo responsável; não foi examinado. Os efeitos da 004 já estavam presentes: better_auth_user_id text nullable, UNIQUE/FK ON DELETE RESTRICT validadas e senha_hash nullable. Campos da 005 também já existem. Nenhum arquivo foi executado/reaplicado pelo agente; origem dessas mudanças externas não verificada. As instruções antigas de aplicar 004/005 abaixo são históricas e NÃO devem ser seguidas sobre a estrutura atual.

Auditoria real somente leitura em PostgreSQL 18.6/siscota/public, com ROLLBACK. Contagens: usuario=2, cotista=4, perfil=2, user=1, account=1, session=10, verification=0. Zero identidades internas associadas; nenhum vínculo órfão/grupo duplicado identificado. Colunas core/Admin, constraints e índices conferidos; nenhum campo ausente. Nenhum dado pessoal, senha, hash, token ou chave consultado.

Bloqueio atual: única conexão disponível usa siscota_codex, sem propriedade/administração e sem escrita nas tabelas Better Auth; default_transaction_read_only=on. Nenhuma permissão/configuração de papel alterada. Ambiente privado ainda sem BETTER_AUTH_URL/BETTER_AUTH_SECRET/SISCOTA_TRUSTED_ORIGINS; não foram geradas ou alteradas credenciais.

Preparado scripts/grant-better-auth-runtime.sql, NÃO EXECUTADO. Propõe apenas SELECT nas quatro tabelas básicas; INSERT em user/account para criação futura aprovada; INSERT/UPDATE/DELETE em session; UPDATE(password,updatedAt) em account para troca de senha; read-write por padrão somente para siscota_codex em siscota. Não concede exclusão de identidade/credencial, escrita em usuario, DDL, propriedade ou poderes globais. Não acrescenta escrita em verification enquanto seus fluxos não estiverem publicados. Não modifica outras ACLs existentes. Precisa de conexão administrativa autorizada; a aplicação não pode conceder privilégios a si mesma.

Comandos para o responsável, usando perfil libpq privado a configurar e conferir (nome abaixo é proposto, não verificado):

```powershell
psql --dbname='service=siscota_schema_owner' --no-psqlrc --set=ON_ERROR_STOP=1 --command='SELECT current_database(), current_schema(), current_user;'
if ($LASTEXITCODE -ne 0) { throw 'Interromper: destino nao confirmado' }
# Conferir manualmente banco siscota e papel administrativo autorizado.
psql --dbname='service=siscota_schema_owner' --no-psqlrc --set=ON_ERROR_STOP=1 --file='scripts/grant-better-auth-runtime.sql'
if ($LASTEXITCODE -ne 0) { throw 'Interromper: permissoes nao confirmadas' }
```

Após isso, abrir conexões novas, conferir default_transaction_read_only e privilégios, configurar ambiente privado e obter confirmação do cadastro. Sugestão fictícia para decisão: TESTE Administrador Better Auth, admin.betterauth@example.invalid, nova identidade a criar pela CLI oficial e depois vincular por ID ao usuario 1/admin existente. Não reutilizar senha, não associar por email, não alterar nome/email internos silenciosamente; verificar unicidade antes de criar. Nenhuma conta criada ou vinculada. Nenhuma necessidade de executar 005 novamente. O plugin Admin continua desabilitado no HTTP.

Nenhum teste HTTP/login/logout ou escrita foi executado nesta etapa. Testes reais dependem das permissões, ambiente privado e identidade confirmada. Evidência: [better-auth-postgres-activation-audit.json](evidence/better-auth-postgres-activation-audit.json); detalhes atuais em [STATUS_BACKEND.md](STATUS_BACKEND.md). Não declarar login funcional com base na auditoria estrutural ou nos testes em memória anteriores.

# Histórico — plano originalmente preparado, não executado pelo agente

Data: 09/11/2026. Aprovar banco, permissões, dados fictícios e janela antes de qualquer escrita. Nenhum comando de migração ou provisionamento abaixo foi executado.

## Evidência real somente leitura

Auditoria no banco siscota/public, pela configuração privada existente, com BEGIN READ ONLY e ROLLBACK. Consultados apenas catálogo de colunas/constraints e privilégios. Nenhuma linha pessoal, hash, senha, cookie, token ou chave foi consultada.

As quatro tabelas básicas user/account/session/verification estão presentes. Seus campos, tipos e nullability correspondem aos retornados por getAuthTables do Better Auth 1.7.19 sem plugins; há PKs, user.email único, session.token único e FKs account/session → user. Isso é compatibilidade estrutural básica, não prova que os dados/hashes existentes são utilizáveis ou que login foi testado. Não alterar/remover os registros fictícios antigos. jwks existente permanece intocada e sem uso pelo novo servidor.

usuario ainda não tem referência de identidade externa e senha_hash continua NOT NULL. Cotista.usuario_id permanece único e com FK. O papel atual pode ler user/account/session/verification, mas não inserir, atualizar ou excluir nelas. Em usuario há SELECT/INSERT, sem UPDATE/DELETE. Não foram concedidos privilégios nem alteradas configurações do papel. Validar também transaction_read_only e privilégios do papel autorizado para execução futura.

## Proposta 004 — identidade interna

Arquivo preparado: migrations/004_link_better_auth_identity.sql. Acrescenta usuario.better_auth_user_id text nullable com UNIQUE e FK para public."user"(id), ON DELETE RESTRICT; permite senha_hash NULL. Não modifica IDs, nomes, emails, status, vínculos de cotista ou hashes existentes. Nenhum cadastro é associado automaticamente. Coluna nova ausente/reaplicação indevida provocam erro; não há IF NOT EXISTS para ocultar divergência.

Cadastros novos devem gravar senha_hash NULL. Hash e senha pertencem somente ao Better Auth/account. Remover definitivamente a coluna histórica ou limpar seus valores exige aprovação própria. Nenhum hash fictício será usado para satisfazer NOT NULL.

Relação proposta 1:1 opcional: um user externo pode ter no máximo um usuario interno; um usuario pode ter no máximo uma identidade externa. Cotista sem login continua permitido. Sessão externa sem associação não cria nenhum registro e recebe 403 nas rotas de domínio. Middleware preserva req.user.id/perfil/cotistaId do domínio, nunca substitui pelo ID externo.

Não reaplicar nem editar 001/002/003. Esta proposta é independente das migrações de cotistas, cuja execução anterior foi informada/documentada. Não usar runner lexical automático.

## Proposta 005 — somente se aprovado bootstrap Admin/CLI

Plugin Admin foi avaliado, mas NÃO está ativo no servidor HTTP. Impersonação, exclusão física, banimento e alteração de perfil externo não estão publicados. Perfis funcionais são exclusivos do SISCOTA.

O arquivo opcional migrations/005_better_auth_admin_cli.sql prepara somente campos exigidos pelo plugin oficial 1.7.19 para provisionamento por operador: user.role/banned/banReason/banExpires e session.impersonatedBy. A configuração scripts/better-auth-admin.config.js usa o plugin apenas em instância separada para CLI; não é importada por app.js/server.js. Importar uma configuração não provisiona usuários, mas pode iniciar validação de schema; não executar essa CLI antes das autorizações.

Esses campos não existem no esquema auditado. Não ativar plugin Admin no HTTP nem executar create-admin antes de revisar/aprovar 005. O campo externo role não concede acesso ao domínio. Banimento externo por essa instância não é uma funcionalidade suportada no servidor atual: desativação funcional deverá ocorrer em usuario, com política revisada.

## Comandos preparados para revisão

Executar a partir de backend, somente após autorização correspondente. Ferramentas psql e perfis libpq privados precisam ser configurados por responsável. Nunca passar senha/URI com segredo na linha de comando. siscota_schema_owner abaixo é nome proposto de perfil privado, não perfil existente/verificado. Confirmar servidor, banco e schema antes de qualquer DDL. Backup recuperável não foi comprovado nesta tarefa.

```powershell
# ETAPA FUTURA AUTORIZADA: confirmar identidade do destino antes de DDL.
psql --dbname='service=siscota_schema_owner' --no-psqlrc --set=ON_ERROR_STOP=1 --command='SELECT current_database(), current_schema();'
if ($LASTEXITCODE -ne 0) { throw 'Interromper: destino nao confirmado' }
# Conferir manualmente destino siscota ou siscota_test, conforme autorizacao.
psql --dbname='service=siscota_schema_owner' --no-psqlrc --set=ON_ERROR_STOP=1 --file='migrations/004_link_better_auth_identity.sql'
if ($LASTEXITCODE -ne 0) { throw 'Interromper: migracao 004 falhou' }

# SOMENTE SE 005/CLI ADMIN TAMBEM FOREM APROVADOS:
psql --dbname='service=siscota_schema_owner' --no-psqlrc --set=ON_ERROR_STOP=1 --file='migrations/005_better_auth_admin_cli.sql'
if ($LASTEXITCODE -ne 0) { throw 'Interromper: migracao 005 falhou' }
```

Cada arquivo tem transação própria; não há atomicidade conjunta entre seus COMMITs. Antes de COMMIT, rollback daquela sessão reverte o arquivo; após COMMIT, reversão exige alteração compensatória aprovada. Os arquivos não removem hashes nem dados e não são scripts de rollback automático.

Autorizar separadamente privilégios mínimos do serviço para operações de sessão (SELECT/INSERT/UPDATE/DELETE em session), credenciais (operações efetivamente necessárias em account), identidade (operações necessárias em user) e verification caso o fluxo de recuperação/primeiro acesso seja aprovado. Não conceder SUPERUSER, BYPASSRLS, propriedade, DDL ou permissões globais como atalho. Revogação de sessões exige DELETE; concessão de privilégio não autoriza executar limpeza de dados antigos. Revalidar schema/defaults e permissões com o papel real da aplicação; não contornar default read-only silenciosamente.

A CLI oficial auth@1.7.19 existe no npm; não foi instalada ou executada. Depois de configurar ambiente privado e permitir download da CLI, poderá ser usada para verificar schema. O comando check schema não substitui teste de login:

```powershell
# Auditoria oficial, sem migrate. Executar apenas no ambiente revisado.
npx --yes auth@1.7.19 check schema --config ./scripts/better-auth.config.js
if ($LASTEXITCODE -ne 0) { throw 'Interromper: schema nao validado' }
```

Não executar auth migrate indiscriminadamente sobre tabelas existentes: revisar previamente o SQL esperado e preservar dados. Nenhuma migração é executada por app.js ou pelos scripts criados.

## Primeiro administrador de desenvolvimento

Após aprovar 004, opção 005, permissões e dados fictícios, o operador poderá usar o create-admin oficial com a configuração separada. O comando abaixo é interativo; não preencher senha no histórico, não usar flags que forcem sobrescrita e não pressupor que a CLI também cria usuario interno:

```powershell
# PROVISIONAMENTO FUTURO: exige autorizacao explicita, NAO EXECUTADO.
npx --yes auth@1.7.19 create-admin --config ./scripts/better-auth-admin.config.js
if ($LASTEXITCODE -ne 0) { throw 'Interromper: provisionamento nao confirmado' }
```

Revisar o fluxo interativo e os dados antes de confirmar. Se o email já existir, parar e verificar identidade; não associar automaticamente nem duplicar conta. A CLI pode marcar email como verificado conforme suas opções: revisar essa decisão antes do provisionamento.

Depois, associar o ID externo exato a um usuario interno admin ativo por transação própria aprovada, verificando unicidade e eventual registro fictício existente; se necessário criar usuario sem senha_hash, não reutilizar senha antiga. Não há SQL automático de associação nesta entrega, pois os pares de identidade ainda não foram aprovados. Até esse vínculo, a identidade externa recebe 403 no domínio. A autorização de bootstrap é de operador e não cria um endpoint de cadastro público nem escolhe o primeiro admin automaticamente.

## Cadastro administrativo futuro

Não implementado nesta etapa: depende do schema e da autorização de provisionamento. Apenas requireRole('admin') permitirá criar usuario/cotista com login; admin poderá criar admin. Cotista deve existir, estar disponível para vínculo e ter nome/email prevalecentes, sob bloqueio transacional. Não aceitar CPF. Preferir serviço interno chamando API oficial de criação de identidade, sem publicar os endpoints administrativos amplos do plugin. Se futuramente o plugin Admin entrar no HTTP, exigir autorização interna e consistência externa explicitamente.

Planejar a criação em estado interno desativado/reservado, com verificação de duplicidades e vínculo único. A transação interna não engloba automaticamente uma chamada Better Auth em outra conexão. Identidade externa criada sem vínculo não obtém privilégio funcional; falha exige registro privado de reconciliação/revogação de sessões e nova tentativa idempotente autorizada. Não apagar identidade existente como compensação automática. Só ativar usuario após confirmar identidade, vínculo e operação completa. Desenhar atomicidade compartilhada ou saga revisada antes de publicar cadastro.

Permanece o requisito de primeiro acesso por link temporário de uso único: não enviar senha permanente, não publicar reset/convite até definir email, validade e armazenamento seguro. Nenhum email enviado.

Futura mudança de perfil/desativação deve preservar pelo menos um admin ativo associado: bloquear concorrência dessas operações, recontar administradores sob a mesma trava/transação e rejeitar retirada do último. Não existe rota de mudança de status/perfil nesta entrega; não há proteção implementada para SQL manual de administrador do banco. Não expor operações externas que contornem essa regra.

## Validação e limites

Executado npm test: 81 testes passaram. Inclui Better Auth real/adapter em memória, Express em porta efêmera, login válido/inválido, sessão expirada, logout/revogação, bloqueio de cadastro público/rotas antigas/admin, CORS/CSRF, vínculo por ID externo diferente do interno, status/perfil, consulta administrativa e regressão de escalas/disponibilidades/calendário com pool simulado. Sintaxe de src e scripts novos verificada. Os testes não usam o .env privado nem PostgreSQL real.

O npm test padrão foi limitado a testes de unidade e integração simulada, excluindo testes de desenvolvimento que acessam siscota; o grupo de integração PostgreSQL real permanece excluído pelo padrão. O teste antigo de workflow autenticado em desenvolvimento foi substituído por bloqueio explícito pendente de autorização, pois dependia de provisionamento/hash/login HS256. O setup-workflow-account.js legado foi desativado antes de qualquer conexão para impedir novas contas da autenticação aposentada.

**Pendente:** validar PostgreSQL 18 com papel autorizado, schema/mapeamento e usuários fictícios em siscota_test; comprovar permissões, assinatura de cookie, renovação e revogação reais, fluxo administrativo e primeiro acesso. Não iniciar esses testes nem usar o banco principal sem autorização. Não declarar a autenticação concluída em PostgreSQL com base nos testes em memória.
