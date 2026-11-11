# Ativação PostgreSQL — conferência de 09/11/2026

Banco principal autorizado. Os efeitos estruturais da 004 e os campos da 005 já estavam presentes antes desta sessão; nenhum arquivo foi aplicado/reaplicado pelo agente. FK/UNIQUE de identidade validadas e senha_hash nullable. Dois usuarios internos, quatro cotistas e zero associações Better Auth.

Autenticação real continua pendente: siscota_codex sem escrita nas tabelas Better Auth e default_transaction_read_only=on; nenhuma conexão administrativa disponível; variáveis privadas BETTER_AUTH_URL/BETTER_AUTH_SECRET/SISCOTA_TRUSTED_ORIGINS ausentes. Nenhuma conta criada/vinculada. Login/logout PostgreSQL NÃO testados. Backup informado no GitHub, com validação dispensada pelo responsável, não examinado.

O contrato de sessão/cookie abaixo permanece: POST /api/auth/sign-in/email, POST /api/auth/sign-out, GET /api/auth/get-session e GET /api/me, com credentials: include. Endpoints implementados não equivalem a serviço operacional no banco atual. Nenhum endpoint/frontend/credencial alterado nesta conferência; HS256 permanece desativado. Detalhes e comando de privilégios preparado em [BETTER_AUTH_MIGRATION_PLAN.md](BETTER_AUTH_MIGRATION_PLAN.md). Não executar 004/005 novamente; notas antigas de migração pendente são históricas, superadas por esta conferência estrutural.

# Integração frontend — Better Auth no Express

Atualização: 09/11/2026. Biblioteca instalada no backend: **better-auth 1.7.19**, fixada no package.json/package-lock.json. Node verificado: 24.22.0; Express instalado: 5.2.1; JavaScript ESM preservado.

## Estado da entrega

**Implementado no código:** handler oficial Node/Express, sessões por cookie, cadastro público bloqueado, CORS restrito, autorização por identidade persistente e regras internas. HS256 removido do código de autenticação; seus tokens não são aceitos. Nenhum plugin JWT, Bearer ou Admin está habilitado no servidor HTTP.

**Validado:** biblioteca oficial com adapter em memória e Express local; regras de domínio com PostgreSQL simulado. **Pendente:** aplicação do schema aprovado, permissões de gravação, configuração privada e provisionamento em PostgreSQL isolado. Não tratar esta entrega como autenticação pronta para uso no banco atual.

Nenhum arquivo de frontend foi modificado. A cópia local ainda não contém a integração Better Auth informada anteriormente.

## Endereços e variáveis

Desenvolvimento proposto, conforme as portas atuais: backend/autenticação em `http://localhost:8080`; frontend Next.js em `http://localhost:3000`. Essas URLs são exemplos de configuração, não evidência de servidor em execução.

Backend, a configurar privadamente pelo responsável:

```dotenv
BETTER_AUTH_URL=http://localhost:8080
SISCOTA_TRUSTED_ORIGINS=http://localhost:3000
```

`BETTER_AUTH_SECRET` é obrigatório, deve ser aleatório e ter pelo menos 32 caracteres. Não há segredo padrão nem geração automática; não reutilizar AUTH_TOKEN_SECRET. Não publicar valores. Os arquivos privados existentes não foram modificados. O banco usa DATABASE_URL ou PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD já suportados pelo backend.

BETTER_AUTH_URL deve ser a origem exata (sem barra final, caminho, credenciais ou query). SISCOTA_TRUSTED_ORIGINS aceita origens exatas separadas por vírgulas, sem curingas. Em desenvolvimento, somente localhost:3000 é o padrão; a origem configurada do backend também é confiável. Em produção, definir a lista explicitamente, NODE_ENV=production e HTTPS para todas as origens.

Variáveis públicas propostas para Next.js:

```dotenv
NEXT_PUBLIC_AUTH_URL=http://localhost:8080
NEXT_PUBLIC_API_URL=http://localhost:8080
```

Não colocar segredo ou URL privada do banco em NEXT_PUBLIC_*. Usar o mesmo hostname para frontend e API durante desenvolvimento; localhost e 127.0.0.1 não são intercambiáveis para cookies.

## Cliente React

Instalação futura pela equipe frontend, usando o gerenciador atual dela; não executada nesta tarefa:

```powershell
pnpm add --save-exact better-auth@1.7.19
```

Exemplo de `lib/auth-client.ts` a ser criado pela equipe:

```ts
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_AUTH_URL!,
  basePath: '/api/auth',
  fetchOptions: { credentials: 'include' },
});
```

Não montar outro servidor Better Auth no Next.js: o Express é o proprietário da autenticação.

```ts
// Login: tratar error antes de navegar para a aplicação.
const { data, error } = await authClient.signIn.email({
  email,
  password,
});

// Sessão externa: identidade Better Auth, não autorização funcional SISCOTA.
const session = await authClient.getSession();

// Logout: aguardar sucesso e limpar o estado local da aplicação.
await authClient.signOut();
```

Não chamar signUp.email: cadastro público está desabilitado. As senhas devem ter de 12 a 256 caracteres, preservando a política atual. Não registrar senha, cookie, session.token ou o objeto completo de sessão em console/telemetria. A resposta padrão Better Auth pode conter campos de sessão; não é necessário copiá-los para armazenamento local ou Authorization.

## Endpoints

| Método | Caminho | Uso |
|---|---|---|
| POST | /api/auth/sign-in/email | Login oficial: email e password |
| POST | /api/auth/sign-out | Logout/revogação da sessão atual |
| GET | /api/auth/get-session | Sessão externa; sem sessão retorna 200 com null |
| GET | /api/me | Identidade e autorização interna do SISCOTA |
| GET | /api/auth/list-sessions | Sessões do próprio usuário |
| POST | /api/auth/revoke-session | Revogar sessão própria pelo contrato oficial |
| POST | /api/auth/revoke-sessions | Revogar as próprias sessões |
| POST | /api/auth/revoke-other-sessions | Revogar outras sessões próprias |
| POST | /api/auth/change-password | Troca autenticada, conforme contrato oficial |
| GET | /api/auth/ok | Diagnóstico do handler; não comprova login nem vínculo |

`POST /api/auth/sign-up/email` responde 403. Rotas não publicadas, incluindo `/api/auth/login`, `/api/auth/me`, `/api/auth/admin/*`, `/api/auth/token`, `/api/auth/jwks`, alteração de nome/email e exclusão de conta respondem 404. A allowlist evita expor novas funcionalidades da biblioteca implicitamente.

`GET /api/me` mantém os campos consumidos pelo domínio: id, nome, email, perfil, cotistaId, cotistaStatus. IDs internos bigint permanecem strings. Nunca retorna senha, hash, cookie, token de sessão ou ID externo adicional. Sem sessão: 401. Sessão válida sem vínculo interno, usuário desativado ou perfil não reconhecido: 403. Configuração/schema/permissões indisponíveis: 503 quando identificados.

As rotas de domínio existentes mantêm caminhos, controllers/services e payloads. Mudou a autenticação exigida; os contratos de disponibilidade, escalas e consulta administrativa não foram reescritos.

```ts
// Centralizar esta opção no cliente HTTP da equipe.
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/me`, {
  credentials: 'include',
});
```

Nas escritas, enviar JSON normalmente e credentials: include. O navegador envia Origin automaticamente. Clientes de linha de comando precisam enviar a origem autorizada, além do cookie. Operações de domínio autenticadas POST/PUT/PATCH/DELETE sem Origin autorizado retornam 403 para impedir CSRF. O backend não usa cotistaId ou role enviados pelo navegador para decidir identidade/permissão.

## Sessão, erros e permissões

- 401: limpar estado de autenticação e solicitar login; não repetir indefinidamente.
- 403: mostrar falta de permissão/vínculo/status. Fazer login novamente não corrige autorização interna.
- 400: revisar payload; login usa password, não o antigo campo senha.
- 429: respeitar limitação de tentativas; não implementar loop de login.
- 503: informar indisponibilidade/configuração pendente, sem exibir detalhes técnicos.

Respostas de domínio usam `{ "error": "mensagem" }`. Respostas normais do Better Auth podem usar seu contrato `{code,message}`; o frontend deve usar o error do cliente oficial e tolerar mensagens genéricas do gateway. Não depender do formato antigo `{accessToken,tokenType,expiresIn,usuario}`.

Sessão configurada para 7 dias e renovação após 1 dia de uso, valores padrão oficiais explicitados no código. Cookie HttpOnly e SameSite=Lax; Secure em HTTPS e obrigatoriamente em produção. Não há cache de sessão em cookie. A autorização de domínio consulta sessão no servidor e perfil/status no banco a cada requisição; sua consulta não renova sessão (disableRefresh). O cliente usa getSession para acompanhar e renovar a sessão pelo fluxo oficial.

Admin exige usuario ativo, perfil interno admin e vínculo persistente. Cotista exige usuario ativo/perfil cotista e, para operações de cotista, cotista ativo associado. Admin/user externo não concede perfil interno. Um cotista pode continuar sem usuario ou login.

Desativar usuario interno bloqueia funcionalidades na próxima consulta de domínio, mesmo que o cookie externo ainda exista. Revogação/logout também torna a sessão inválida. O endpoint externo get-session descreve autenticação e não substitui `/api/me` para autorização SISCOTA.

## CORS e implantação

Credentials são permitidas somente para origens exatas configuradas. Preflight autoriza GET/HEAD/POST/PUT/PATCH/DELETE/OPTIONS e Content-Type/Authorization; aceitar o nome do header Authorization em CORS não habilita autenticação Bearer.

Não há domínio de cookie compartilhado nem trust proxy habilitados implicitamente. Para produção com frontend e backend em sites diferentes, SameSite=Lax pode impedir cookies; planejar proxy no mesmo site ou configuração específica revisada para SameSite=None/Secure e restrições de cookies de terceiros. Não desabilitar CSRF/origin checks para contornar isso.

Não criar handler de auth concorrente no frontend. Se houver proxy reverso, encaminhar /api/auth/* ao Express e preservar os cookies. URLs de retorno devem pertencer às origens confiáveis.

JWT/JWKS só será avaliado se uma API independente precisar verificar tokens sem consultar a sessão Better Auth. Não é necessário para a arquitetura atual no mesmo Express. Nenhum plugin JWT/Bearer foi instalado/configurado à parte.

## Próxima etapa

Consultar [BETTER_AUTH_MIGRATION_PLAN.md](BETTER_AUTH_MIGRATION_PLAN.md). Banco, provisionamento e testes reais ainda exigem autorização. Cadastro administrativo e envio do link temporário de primeiro acesso não estão implementados; nenhum email foi enviado. Não habilitar cadastro público como solução de bootstrap.

Referências oficiais consultadas para 1.7.19: [Express](https://better-auth.com/docs/integrations/express), [PostgreSQL](https://better-auth.com/docs/adapters/postgresql), [email/senha](https://better-auth.com/docs/authentication/email-password), [sessões](https://better-auth.com/docs/concepts/session-management), [cliente React](https://better-auth.com/docs/integrations/next), [Admin](https://better-auth.com/docs/plugins/admin). Opções e esquema também conferidos nos exports/tipos da biblioteca instalada.
