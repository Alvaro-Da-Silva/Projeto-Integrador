import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { createRequire } from 'node:module'
const require = createRequire(new URL('../../backend/package.json', import.meta.url))
const { hashPassword } = require('better-auth/crypto')
const pg = require('pg')
import { pool } from '../../backend/src/config/database.js'
import { createApp } from '../../backend/src/app.js'
import { getAuth } from '../../backend/src/config/auth.js'

process.on('uncaughtException', error => { console.error(error.code || error.name, error.code === 'ERR_ASSERTION' ? error.message : 'Falha no teste'); process.exit(1) })
const admin = new pg.Client({ user: 'postgres' })
await admin.connect()
const email = 'smoke-' + randomUUID() + '@example.invalid'
const id = randomUUID()
const password = randomBytes(24).toString('base64url')
const hash = await hashPassword(password)
await admin.query('BEGIN')
await admin.query('INSERT INTO public."user" (id,name,email,"emailVerified") VALUES ($1,$2,$3,true)', [id, 'Fixture de teste', email])
await admin.query('INSERT INTO public.account (id,"accountId","providerId","userId",password,"updatedAt") VALUES ($1,$2,$3,$2,$4,now())', [randomUUID(), id, 'credential', hash])
await admin.query("INSERT INTO public.usuario (nome,email,perfil_id,better_auth_user_id) SELECT $1,$2,id,$3 FROM public.perfil WHERE nome='admin'", ['Fixture de teste', email, id])
await admin.query('COMMIT')
await admin.end()

const server = createApp({ authProvider: getAuth, origins: ['http://127.0.0.1:18080'] }).listen(18080, '127.0.0.1')
await once(server, 'listening')
const origin = 'http://127.0.0.1:' + server.address().port
process.env.BETTER_AUTH_URL = origin
process.env.BETTER_AUTH_SECRET = randomBytes(32).toString('hex')
const request = (path, { method='GET', cookie, body }={}) => fetch(origin+path, {
  method, headers:{ Origin:origin, ...(cookie?{Cookie:cookie}:{}), ...(body?{'Content-Type':'application/json'}:{}) },
  body:body?JSON.stringify(body):undefined, signal:AbortSignal.timeout(5000)
})
try {
  assert.equal((await request('/api/me')).status,401,'GET /api/me sem sessão')
  assert.equal((await request('/api/auth/get-session')).status,200,'GET get-session sem sessão')
  assert.equal((await request('/api/escalas/2026/11/calendario')).status,404,'mês sem escala')
  const login = await request('/api/auth/sign-in/email',{method:'POST',body:{email,password}})
  assert.equal(login.status,200,'login')
  const raw = login.headers.getSetCookie().find(c=>c.includes('session_token='))
  assert.match(raw,/HttpOnly/i)
  const cookie = raw.split(';')[0]
  const session = await request('/api/auth/get-session',{cookie})
  assert.equal(session.status,200,'sessão')
  assert.equal((await session.json()).user.id,id,'identidade da sessão')
  const me = await request('/api/me',{cookie})
  assert.equal(me.status,200,'GET /api/me autenticado')
  assert.equal((await me.json()).perfil,'admin','perfil de domínio')
  const calendar = '/api/escalas/2028/2/calendario'
  if ((await request(calendar)).status === 404) {
    assert.equal((await request('/api/escalas',{method:'POST',cookie,body:{nome:'Fixture de teste',ano:2028,mes:2,quantidadeCotasPadrao:4}})).status,201,'criação de escala')
  }
  assert.equal((await request(calendar)).status,200,'calendário com escala')
  assert.equal((await request('/api/auth/sign-out',{method:'POST',cookie,body:{}})).status,200,'logout')
  assert.equal((await request('/api/me',{cookie})).status,401,'cookie revogado')
  const revoked = await request('/api/auth/get-session',{cookie})
  assert.equal(revoked.status,200)
  assert.equal(await revoked.json(),null)
  console.log('PASS PostgreSQL real isolado: calendário, login, cookie HttpOnly, sessão, perfil, logout e revogação')
} finally {
  server.close()
  await pool.end()
}