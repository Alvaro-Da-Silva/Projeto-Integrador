import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { betterAuth } from 'better-auth';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { hashPassword } from 'better-auth/crypto';
import { getAuthTables } from 'better-auth/db';
import { createApp } from '../src/app.js';
import { pool } from '../src/config/database.js';
import { createBetterAuthOptions } from '../src/config/auth.js';
import { authSettings,trustedOrigins } from '../src/config/authSettings.js';

test('Configuracao Better Auth exige segredo e origens explicitas', () => {
  assert.throws(() => authSettings({}));
  const env = {BETTER_AUTH_URL:'http://localhost:8080',BETTER_AUTH_SECRET:randomBytes(32).toString('hex')};
  assert.deepEqual(trustedOrigins(env),['http://localhost:3000','http://localhost:8080']);
  for (const url of ['http://localhost:8080/api/auth','https://user:password@example.invalid',
    'http://example.invalid','https://example.invalid/']) {
    assert.throws(() => authSettings({...env,NODE_ENV:'production',SISCOTA_TRUSTED_ORIGINS:'https://ui.example.invalid',BETTER_AUTH_URL:url}));
  }
  assert.throws(() => authSettings({...env,NODE_ENV:'production',BETTER_AUTH_URL:'https://api.example.invalid'}));
  const options = createBetterAuthOptions(authSettings(env),{});
  assert.equal(options.emailAndPassword.disableSignUp,true);
  assert.equal(options.emailAndPassword.minPasswordLength,12);
  assert.equal(options.emailAndPassword.maxPasswordLength,256);
  assert.equal(options.session.cookieCache.enabled,false);
  assert.equal(options.advanced.defaultCookieAttributes.httpOnly,true);
  assert.equal(options.advanced.defaultCookieAttributes.sameSite,'lax');
  assert.equal(options.plugins.length,0);
  const production = createBetterAuthOptions(authSettings({...env,NODE_ENV:'production',
    BETTER_AUTH_URL:'https://api.example.invalid',SISCOTA_TRUSTED_ORIGINS:'https://ui.example.invalid'}),{});
  assert.equal(production.advanced.useSecureCookies,true);
  assert.deepEqual(Object.keys(getAuthTables(options)),['user','session','account','verification']);
});

test('Better Auth oficial em memoria + Express + autorizacao de dominio (sem PostgreSQL)',async t => {
  // Credenciais exclusivamente em memoria; nenhuma conta ou schema persistente.
  const password = randomBytes(24).toString('base64url');
  const passwordHash = await hashPassword(password);
  const now = new Date();
  const data = {user:[],account:[],session:[],verification:[]};
  const users = [
    {id:'101',authId:'external-admin',nome:'Admin de teste',email:'admin@example.invalid',perfil:'admin',status:'ativo',cotistaId:null},
    {id:'102',authId:'external-cotista',nome:'Cotista de teste',email:'cotista@example.invalid',perfil:'cotista',status:'ativo',cotistaId:'55',cotistaStatus:'ativo'},
    {id:'103',authId:'external-unlinked',nome:'Sem vinculo',email:'unlinked@example.invalid',perfil:'admin',status:'ativo'}
  ];
  for (const user of users) {
    data.user.push({id:user.authId,name:user.nome,email:user.email,emailVerified:true,createdAt:now,updatedAt:now});
    data.account.push({id:`account-${user.id}`,accountId:user.authId,userId:user.authId,
      providerId:'credential',password:passwordHash,createdAt:now,updatedAt:now});
  }
  t.mock.method(pool,'connect',async () => {throw new Error('Conexao PostgreSQL proibida neste teste');});
  const queries = [];
  t.mock.method(pool,'query',async (sql,values) => {
    queries.push({sql,values});
    assert(sql.includes('u.better_auth_user_id=$1'));
    assert(!sql.includes('senha_hash'));
    const rows = users.filter(user => user.authId === values[0] && user.id !== '103');
    return {rows,rowCount:rows.length};
  });
  let auth;
  const uiOrigin = 'http://localhost:3000';
  const server = createApp({authProvider:() => auth,origins:[uiOrigin]}).listen(0,'127.0.0.1');
  await once(server,'listening');
  t.after(() => new Promise(resolve => {server.close(resolve);server.closeAllConnections();}));
  const baseURL = `http://127.0.0.1:${server.address().port}`;
  const settings = {baseURL,secret:randomBytes(32).toString('hex'),origins:[uiOrigin],production:false};
  auth = betterAuth(createBetterAuthOptions(settings,memoryAdapter(data)));
  const request = async (method,path,{cookie,body,origin=uiOrigin,authorization}={}) => {
    const response = await fetch(`${baseURL}${path}`,{method,
      headers:{...(origin ? {Origin:origin} : {}),...(cookie ? {Cookie:cookie} : {}),
        ...(body === undefined ? {} : {'Content-Type':'application/json'}),
        ...(authorization ? {Authorization:authorization} : {})},
      body:body === undefined ? undefined : JSON.stringify(body),signal:AbortSignal.timeout(10000)});
    const text = await response.text();
    return {status:response.status,body:text ? JSON.parse(text) : null,headers:response.headers};
  };
  const login = async email => {
    const response = await request('POST','/api/auth/sign-in/email',{body:{email,password}});
    assert.equal(response.status,200);
    const cookies = response.headers.getSetCookie();
    const sessionCookie = cookies.find(cookie => cookie.includes('session_token='));
    assert(sessionCookie);
    assert.match(sessionCookie,/HttpOnly/i);
    assert.match(sessionCookie,/SameSite=Lax/i);
    return sessionCookie.split(';')[0];
  };
  let adminCookie,cotistaCookie;
  await t.test('Handler oficial recebe body bruto antes de express.json e cria sessao em memoria',async () => {
    adminCookie = await login(users[0].email);
    cotistaCookie = await login(users[1].email);
    assert(data.session.length >= 2);
  });
  await t.test('Senha invalida retorna 401 sem revelar senha/hash',async () => {
    const response = await request('POST','/api/auth/sign-in/email',{body:{email:users[0].email,password:'incorreta'}});
    assert.equal(response.status,401);
    assert(!JSON.stringify(response.body).includes(passwordHash));
  });
  await t.test('Sessao do Better Auth e identidade interna sao contratos distintos',async () => {
    const session = await request('GET','/api/auth/get-session',{cookie:adminCookie});
    assert.equal(session.status,200);
    assert.equal(session.body.user.id,'external-admin');
    const me = await request('GET','/api/me',{cookie:adminCookie});
    assert.equal(me.status,200);
    assert.equal(me.body.id,'101');
    assert.equal(me.body.perfil,'admin');
    assert(!Object.hasOwn(me.body,'authId'));
    assert(!Object.hasOwn(me.body,'senhaHash'));
    assert.deepEqual(queries.at(-1).values,['external-admin']);
  });
  await t.test('Sem cookie, cookie adulterado e Bearer legado retornam 401',async () => {
    assert.equal((await request('GET','/api/me')).status,401);
    assert.equal((await request('GET','/api/me',{cookie:'better-auth.session_token=invalid'})).status,401);
    assert.equal((await request('GET','/api/me',{authorization:'Bearer eyJhbGciOiJIUzI1NiJ9.e30.signature'})).status,401);
  });
  await t.test('Admin autorizado chega ao controller; cotista recebe 403',async () => {
    assert.equal((await request('POST','/api/escalas',{cookie:adminCookie,body:{}})).status,400);
    assert.equal((await request('POST','/api/escalas',{cookie:cotistaCookie,body:{}})).status,403);
    assert.equal((await request('GET','/api/disponibilidades?escalaId=0',{cookie:cotistaCookie})).status,400);
  });
  await t.test('Perfil externo nao eleva privilegios; status e vinculo interno sao autoritativos',async () => {
    data.user.find(user => user.id === 'external-cotista').role = 'admin';
    assert.equal((await request('POST','/api/escalas',{cookie:cotistaCookie,body:{}})).status,403);
    users[1].status='desativado';
    assert.equal((await request('GET','/api/me',{cookie:cotistaCookie})).status,403);
    users[1].status='ativo';users[1].cotistaStatus='inativo';
    assert.equal((await request('GET','/api/disponibilidades?escalaId=1',{cookie:cotistaCookie})).status,403);
    users[1].cotistaStatus='ativo';
    const cookie = await login(users[2].email);
    assert.equal((await request('GET','/api/me',{cookie})).status,403);
  });
  await t.test('Cadastro publico e superficie administrativa bloqueados',async () => {
    const count = data.user.length;
    assert.equal((await request('POST','/api/auth/sign-up/email',{body:{name:'Exemplo',email:'other@example.invalid',password}})).status,403);
    assert.equal(data.user.length,count);
    for (const path of ['/api/auth/login','/api/auth/me','/api/auth/admin/create-user',
      '/api/auth/admin/impersonate-user','/api/auth/delete-user','/api/auth/update-user','/api/auth/token','/api/auth/jwks']) {
      assert.equal((await request('POST',path,{cookie:adminCookie,body:{}})).status,404);
    }
  });
  await t.test('CORS restrito e escritas de dominio exigem origem mesmo com cookie valido',async () => {
    const allowed = await request('GET','/api/me',{cookie:adminCookie});
    assert.equal(allowed.headers.get('access-control-allow-origin'),uiOrigin);
    assert.equal(allowed.headers.get('access-control-allow-credentials'),'true');
    assert.equal((await request('GET','/api/me',{cookie:adminCookie,origin:'https://evil.example.invalid'})).status,403);
    assert.equal((await request('POST','/api/escalas',{cookie:adminCookie,body:{},origin:null})).status,403);
    assert.equal((await request('POST','/api/auth/sign-out',{cookie:adminCookie,body:{},origin:'https://evil.example.invalid'})).status,403);
  });
  await t.test('Schema de vinculo pendente retorna 503 sanitizado',async () => {
    const mock = t.mock.method(pool,'query',async () => {throw Object.assign(new Error('detalhe privado'),{code:'42703'});});
    const response = await request('GET','/api/me',{cookie:adminCookie});
    assert.equal(response.status,503);
    assert(!JSON.stringify(response.body).includes('detalhe privado'));
    mock.mock.restore();
  });
  await t.test('Sessao expirada nao autoriza',async () => {
    const cookie = await login(users[1].email);
    for (const session of data.session.filter(session => session.userId === 'external-cotista')) {
      session.expiresAt = new Date(Date.now()-60000);
    }
    assert.equal((await request('GET','/api/me',{cookie})).status,401);
  });
  await t.test('Logout oficial revoga sessao e cookie anterior nao autoriza',async () => {
    assert.equal((await request('POST','/api/auth/sign-out',{cookie:adminCookie,body:{}})).status,200);
    assert.equal((await request('GET','/api/me',{cookie:adminCookie})).status,401);
  });
});
