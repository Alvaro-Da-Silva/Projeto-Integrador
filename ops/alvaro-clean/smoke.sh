set -euo pipefail
umask 077
d=$(cat ~/siscota-deploy/alvaro-clean.path)
work=$(cat ~/siscota-deploy/secure-import/isolated-result.path)
bin=/usr/lib/postgresql/18/bin
export PATH="$HOME/.local/siscota-tools/node/bin:$bin:$PATH"
"$bin/pg_ctl" -D "$work/data" -l "$work/pg.log" -o "-c listen_addresses='' -k $work/socket -p 55433" -w start >/dev/null
cleanup() {
  [[ -z ${back:-} ]] || kill "$back" 2>/dev/null || true
  [[ -z ${front:-} ]] || kill "$front" 2>/dev/null || true
  "$bin/pg_ctl" -D "$work/data" -w stop >/dev/null
}
trap cleanup EXIT
export PGHOST="$work/socket" PGPORT=55433 PGDATABASE=siscota_alvaro_clean PGUSER=postgres
psql -X -v ON_ERROR_STOP=1 -d postgres -c 'CREATE DATABASE siscota_alvaro_clean TEMPLATE siscota'
psql -X -v ON_ERROR_STOP=1 -1 -f "$d/backend/migrations/006_escala_definitiva.sql" -f "$d/backend/migrations/007_ajuste_motivo_desistencia.sql"
psql -X -v ON_ERROR_STOP=1 -1 <<'SQL'
ALTER TABLE public."user" ADD COLUMN role text, ADD COLUMN banned boolean DEFAULT false,
  ADD COLUMN "banReason" text, ADD COLUMN "banExpires" timestamptz, ADD COLUMN patent text;
ALTER TABLE public.session ADD COLUMN "impersonatedBy" text;
ALTER TABLE public.jwks ADD COLUMN IF NOT EXISTS alg text, ADD COLUMN IF NOT EXISTS crv text;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.participacao TO siscota;
GRANT SELECT,INSERT ON public.escala_ajuste TO siscota;
GRANT USAGE ON SEQUENCE public.participacao_id_seq,public.escala_ajuste_id_seq TO siscota;
GRANT SELECT,INSERT ON public.jwks TO siscota;
GRANT INSERT,UPDATE ON public.usuario TO siscota;
GRANT INSERT ON public.cotista TO siscota;
GRANT USAGE ON SEQUENCE public.usuario_id_seq,public.cotista_id_seq TO siscota;
GRANT INSERT ON public."user",public.account TO siscota;
SQL
export BETTER_AUTH_SECRET="$(cat "$HOME/siscota-deploy/config/alvaro-clean/test-secret")"
export BETTER_AUTH_URL=http://127.0.0.1:13010 SISCOTA_TRUSTED_ORIGINS=http://127.0.0.1:13010
export FRONTEND_AUTH_URL=http://127.0.0.1:13010
export DB_HOST="$PGHOST" DB_PORT="$PGPORT" DB_NAME="$PGDATABASE" DB_USER=siscota
(cd "$d/backend"; exec env PGUSER=siscota HOST=127.0.0.1 PORT=18091 node src/server.js) > "$d/runtime-backend.log" 2>&1 &
back=$!
(cd "$d/frontend"; exec node node_modules/next/dist/bin/next start -p 13010 -H 127.0.0.1) > "$d/runtime-frontend.log" 2>&1 &
front=$!
cd "$d/backend"
node --input-type=module <<'JS'
import assert from 'node:assert/strict'
import {randomBytes,randomUUID} from 'node:crypto'
import {hashPassword} from 'better-auth/crypto'
import pg from 'pg'
const origin='http://127.0.0.1:13010'
const existing='http://localhost:3000'
const db=new pg.Client()
await db.connect()
const req=(path,{method='GET',cookie,token,body,host=path.startsWith('/api/auth/') || path==='/login' ? origin : 'http://127.0.0.1:18091'}={})=>fetch(host+path,{
  method,headers:{Origin:origin,...(cookie?{Cookie:cookie}:{}),...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},
  body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(5000)})
async function result(path,status,options) {
  const r=await req(path,options)
  assert.equal(r.status,status,path)
  return r
}
async function fixture(profile) {
  const id=randomUUID(), email='test-'+id+'@example.invalid', password=randomBytes(24).toString('base64url')
  await db.query('INSERT INTO public."user" (id,name,email,"emailVerified",role) VALUES ($1,$2,$3,true,$4)',[id,'Fixture',email,profile==='admin'?'admin':'user'])
  await db.query('INSERT INTO account (id,"accountId","userId","providerId",password,"updatedAt") VALUES ($1,$2,$2,$3,$4,now())',[randomUUID(),id,'credential',await hashPassword(password)])
  const u=await db.query('INSERT INTO usuario (nome,email,perfil_id,better_auth_user_id) SELECT $1,$2,id,$3 FROM perfil WHERE nome=$4 RETURNING id',['Fixture',email,id,profile])
  if(profile==='cotista') await db.query("INSERT INTO cotista (usuario_id,nome,email,telefone,data_nascimento) VALUES ($1,$2,$3,$4,$5)",[u.rows[0].id,'Fixture',email,'00000000000','2000-01-01'])
  const login=await result('/api/auth/sign-in/email',200,{method:'POST',body:{email,password}})
  const cookie=login.headers.getSetCookie().find(x=>x.includes('session_token='))
  assert(cookie && /HttpOnly/i.test(cookie),'Cookie sem HttpOnly')
  const session=cookie.split(';')[0]
  const jwt=await (await result('/api/auth/token',200,{cookie:session})).json()
  assert(typeof jwt.token==='string' && jwt.token.split('.').length===3,'Token não emitido')
  return {cookie:session,token:jwt.token,uid:u.rows[0].id}
}
try {
  for(let i=0;i<12;i++){
    try { if((await req('/login')).status===200) break } catch {}
    await new Promise(r=>setTimeout(r,500))
  }
  for(let i=0;i<20;i++){
    try { if((await req('/api/me')).status===401) break } catch {}
    await new Promise(r=>setTimeout(r,500))
  }
  await result('/login',200)
  await result('/api/auth/get-session',200)
  await result('/api/me',401)
  await result('/api/auth/jwks',200)
  const admin=await fixture('admin')
  const cotista=await fixture('cotista')
  const me=await (await result('/api/me',200,admin)).json()
  assert.equal(me.perfil,'admin')
  await result('/api/auth/admin/list-users',200,{cookie:admin.cookie})
  await result('/api/auth/admin/list-users',403,{cookie:cotista.cookie})
  const other=await (await result('/api/me',200,cotista)).json()
  assert.equal(other.perfil,'cotista')
  const scales=await db.query("SELECT id,ano,mes FROM escala WHERE status='fechada' ORDER BY id LIMIT 1")
  assert.equal(scales.rowCount,1)
  const {id,ano,mes}=scales.rows[0]
  const path='/api/escalas/'+id
  await result(`/api/escalas/${ano}/${mes}/calendario`,200)
  const old=await fetch(existing+`/api/escalas/${ano}/${mes}/calendario`)
  console.log('Calendário deste mês: candidata 200; ativa '+old.status)
  await result(path+'/definitiva',200,admin)
  await result(path+'/ajustes',403,cotista)
  const summary=await (await result(path+'/distribuicao',200,{...admin,method:'POST',body:{simular:true}})).json()
  assert.equal(summary.simulacao,true)
  await result(path+'/distribuicao',200,{...admin,method:'POST',body:{simular:false}})
  for(const publicada of [true,false]) await result(path+'/publicacao',200,{...admin,method:'PATCH',body:{publicada}})
  const history=await (await result(path+'/ajustes',200,admin)).json()
  assert(['distribuicao_automatica','publicacao','despublicacao'].every(acao=>history.some(x=>x.acao===acao)),'Histórico incompleto')
  await result('/api/auth/sign-out',200,{cookie:admin.cookie,method:'POST',body:{}})
  const closed=await (await result('/api/auth/get-session',200,{cookie:admin.cookie})).json()
  assert.equal(closed,null)
  console.log('PASS original: login, JWT/JWKS, Admin Next, 403, calendário, distribuição, publicação/despublicação, histórico e logout de sessão.')
  const afterLogout=await req('/api/me',admin)
  console.log('JWT previamente emitido após logout: HTTP '+afterLogout.status)
  const fresh=await req('/api/auth/sign-up/email',{method:'POST',body:{name:'Fixture',email:'test-'+randomUUID()+'@example.invalid',password:randomBytes(24).toString('hex')}})
  console.log('Cadastro público na origem: HTTP '+fresh.status)
  if(fresh.ok){
    const x=fresh.headers.getSetCookie().find(c=>c.includes('session_token='))
    assert(x,'Cadastro não emitiu cookie de teste')
    const token=await (await result('/api/auth/token',200,{cookie:x.split(';')[0]})).json()
    const me=await req('/api/me',{token:token.token})
    console.log('Novo cotista sem telefone e nascimento: HTTP '+me.status)
  }
} catch (e) {
  console.error('Falha de integração: '+(e.code==='ERR_ASSERTION'?e.message:e.code||e.name))
  process.exitCode=1
} finally {await db.end()}
JS

