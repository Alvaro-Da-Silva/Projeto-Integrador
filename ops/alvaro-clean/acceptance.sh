set -euo pipefail
umask 077
d=$(cat ~/siscota-deploy/alvaro-final.path)
work=$(cat ~/siscota-deploy/secure-import/isolated-result.path)
[[ $work =~ ^/home/siscota/siscota-deploy/secure-import/isolated[.][A-Za-z0-9]+$ ]]
bin=/usr/lib/postgresql/18/bin
export PATH="$HOME/.local/siscota-tools/node/bin:$bin:$PATH"
"$bin/pg_ctl" -D "$work/data" -l "$work/pg.log" -o "-c listen_addresses='' -k $work/socket -p 55433" -w start >/dev/null
cleanup() {
  [[ -z ${back:-} ]] || kill "$back" 2>/dev/null || true
  [[ -z ${front:-} ]] || kill "$front" 2>/dev/null || true
  "$bin/pg_ctl" -D "$work/data" -w stop >/dev/null
}
trap cleanup EXIT
export PGHOST="$work/socket" PGPORT=55433 PGDATABASE=siscota_alvaro_final PGUSER=postgres
if [[ ${SISCOTA_TEST_REUSE:-0} == 1 ]]; then
  psql -X -qAt -v ON_ERROR_STOP=1 -c "SELECT to_regclass('public.escala_ajuste') IS NOT NULL" | grep -qx t
else
psql -X -v ON_ERROR_STOP=1 -d postgres -c 'CREATE DATABASE siscota_alvaro_final TEMPLATE siscota'
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
GRANT UPDATE (id) ON public.periodo TO siscota;
SQL
fi
secret="$work/alvaro-final.test-secret"
if [[ ! -f "$secret" ]]; then (set -C; openssl rand -hex 32 > "$secret"); fi
export BETTER_AUTH_SECRET="$(cat "$secret")"
export BETTER_AUTH_URL=http://127.0.0.1:13012 SISCOTA_TRUSTED_ORIGINS=http://127.0.0.1:13012
export FRONTEND_AUTH_URL=http://127.0.0.1:13012
export DB_HOST="$PGHOST" DB_PORT="$PGPORT" DB_NAME="$PGDATABASE" DB_USER=siscota
(cd "$d/backend"; exec env PGUSER=siscota HOST=127.0.0.1 PORT=18092 node src/server.js) > "$d/runtime-backend.log" 2>&1 &
back=$!
(cd "$d/frontend"; exec node node_modules/next/dist/bin/next start -p 13012 -H 127.0.0.1) > "$d/runtime-frontend.log" 2>&1 &
front=$!
cd "$d/backend"
node --input-type=module <<'JS'
import assert from 'node:assert/strict'
import {randomBytes,randomUUID} from 'node:crypto'
import {spawnSync} from 'node:child_process';
import {hashPassword} from 'better-auth/crypto';
import pg from 'pg'
const origin='http://127.0.0.1:13012'
const existing='http://localhost:3000'
const db=new pg.Client()
await db.connect()
const req=(path,{method='GET',cookie,token,body,host=path.startsWith('/api/auth/') || path==='/login' ? origin : 'http://127.0.0.1:18092'}={})=>fetch(host+path,{
  method,headers:{Origin:origin,...(cookie?{Cookie:cookie}:{}),...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},
  body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(5000)})
async function result(path,status,options) {
  const r=await req(path,options)
  assert.equal(r.status,status,path)
  return r
}
function provision(body, expected=0) {
  const result=spawnSync(process.execPath,['scripts/link-approved-identity.mjs','--isolated'],{
    input:JSON.stringify(body),encoding:'utf8',timeout:15000,
  })
  assert.equal(result.status,expected,'Vinculação supervisionada')
}
async function domain(profile, complete=true) {
  const email='test-'+randomUUID()+'@example.invalid'
  const u=await db.query('INSERT INTO usuario (nome,email,perfil_id) SELECT $1,$2,id FROM perfil WHERE nome=$3 RETURNING id',
    ['Fixture',email,profile])
  if(profile==='cotista' && complete) {
    await db.query('INSERT INTO cotista (usuario_id,nome,email,telefone,data_nascimento) VALUES ($1,$2,$3,$4,$5)',
      [u.rows[0].id,'Fixture',email,'00000000000','2000-01-01'])
  }
  return {email,uid:u.rows[0].id}
}
async function fixture(profile, reuse=false) {
  const {email,uid}=await domain(profile)
  const password=randomBytes(24).toString('base64url')
  if (reuse) {
    const id=randomUUID()
    await db.query('INSERT INTO public."user" (id,name,email,"emailVerified",role) VALUES ($1,$2,$3,false,$4)',
      [id,'Fixture',email,'user'])
    await db.query('INSERT INTO public.account (id,"accountId","userId","providerId",password,"updatedAt") VALUES ($1,$2,$2,$3,$4,now())',
      [randomUUID(),id,'credential',await hashPassword(password)])
    provision({usuarioId:uid,identityId:id})
  } else {
    provision({usuarioId:uid,password})
  }
  const login=await result('/api/auth/sign-in/email',200,{method:'POST',body:{email,password}})
  const cookie=login.headers.getSetCookie().find(x=>x.includes('session_token='))
  assert(cookie && /HttpOnly/i.test(cookie),'Cookie sem HttpOnly')
  const httpCookie=cookie.split(';')[0]
  const jwt=await (await result('/api/auth/token',200,{cookie:httpCookie})).json()
  assert(typeof jwt.token==='string' && jwt.token.split('.').length===3,'Token não emitido')
  return {cookie:httpCookie,token:jwt.token,uid}
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
  const grantCheck = (await db.query(`SELECT
    has_table_privilege('siscota','public.usuario','INSERT') AS create_user,
    has_table_privilege('siscota','public.usuario','UPDATE') AS update_user,
    has_table_privilege('siscota','public.cotista','INSERT') AS create_cotista,
    has_table_privilege('siscota','public.perfil','UPDATE') AS update_profile,
    has_column_privilege('siscota','public.periodo','id','UPDATE') AS period_lock
  `)).rows[0]
  assert.deepEqual(grantCheck,{create_user:false,update_user:false,create_cotista:false,update_profile:false,period_lock:true})
  await result('/login',200)
  await result('/api/auth/get-session',200)
  await result('/api/me',401)
  await result('/api/auth/jwks',200)
  const rejected=await domain('cotista',false)
  provision({usuarioId:rejected.uid,password:randomBytes(24).toString('base64url')},1)
  const noOrphan=await db.query('SELECT 1 FROM public."user" WHERE email=$1',[rejected.email])
  assert.equal(noOrphan.rowCount,0,'Vinculação incompleta criou identidade')
  const signup=await req('/api/auth/sign-up/email',{method:'POST',body:{name:'Fixture',email:rejected.email,password:randomBytes(24).toString('base64url')}})
  assert([400,403].includes(signup.status),'Cadastro público permitido')
  await result('/api/me',401,{token:'malformed.jwt.invalid'})
  const admin=await fixture('admin')
  const cotista=await fixture('cotista',true)
  const me=await (await result('/api/me',200,admin)).json()
  assert.equal(me.perfil,'admin')
  await result('/api/auth/admin/list-users',200,{cookie:admin.cookie})
  await result('/api/auth/admin/list-users',403,{cookie:cotista.cookie})
  await result('/api/auth/admin/create-user',403,{cookie:admin.cookie,method:'POST',body:{}})
  await result('/api/auth/admin/set-role',403,{cookie:admin.cookie,method:'POST',body:{}})
  const cotistaId=(await db.query('SELECT better_auth_user_id AS id FROM public.usuario WHERE id=$1',[cotista.uid])).rows[0].id
  await db.query('UPDATE public."user" SET role=$1 WHERE id=$2',['admin',cotistaId])
  const elevation=await (await result('/api/auth/token',200,{cookie:cotista.cookie})).json()
  const recovered=await (await result('/api/me',200,{token:elevation.token})).json()
  assert.equal(recovered.perfil,'cotista','Claim admin elevou cotista')
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
  await result('/api/me',401,admin)
  console.log('PASS: login, JWT/JWKS, Admin Next, 403, calendário, distribuição, publicação/despublicação, histórico e logout de sessão.')
  const opened=(await db.query("SELECT e.id,d.id AS dia FROM escala e JOIN dia d ON d.escala_id=e.id JOIN plantao p ON p.dia_id=d.id JOIN periodo r ON r.id=p.periodo_id WHERE e.status='aberta' AND p.status='aberto' AND r.codigo='D' ORDER BY e.id,d.id LIMIT 1")).rows[0]
  assert(opened,'Plantão aberto ausente na base de ensaio')
  await result('/api/disponibilidades/'+opened.dia,200,{...cotista,method:'PUT',body:{codigoPeriodo:'D'}})
  await result('/api/disponibilidades?escalaId='+opened.id,200,cotista)
  const admin2=await fixture('admin')
  await result('/api/escalas/'+opened.id+'/disponibilidades',200,admin2)
  const shift=(await db.query("SELECT p.id FROM plantao p JOIN dia d ON d.id=p.dia_id JOIN periodo r ON r.id=p.periodo_id WHERE d.escala_id=$1 AND r.codigo='D' ORDER BY p.id LIMIT 1",[id])).rows[0]
  const c=(await db.query("SELECT id FROM cotista WHERE usuario_id=$1",[cotista.uid])).rows[0]
  const add=await result(path+'/participacoes',201,{...admin2,method:'POST',body:{plantaoId:shift.id,cotistaId:c.id,justificativa:'Validação isolada'}})
  const assignment=await add.json()
  await result(path+'/participacoes/'+assignment.id,204,{...admin2,method:'DELETE',body:{justificativa:'Validação isolada',desistencia:true}})
  const drop=(await db.query("SELECT count(*)::int AS n FROM escala_ajuste WHERE escala_id=$1 AND motivo='desistencia'",[id])).rows[0]
  assert(drop.n>=1,'Histórico da desistência ausente')
  await result('/api/auth/admin/%63reate-user',400,{cookie:admin2.cookie,method:'POST',body:{}})
  const activeId=JSON.parse(Buffer.from(admin2.token.split('.')[1],'base64url')).sid
  await db.query('UPDATE public.session SET "expiresAt"=now()-interval \'1 second\' WHERE id=$1',[activeId])
  await result('/api/me',401,admin2)
  console.log('PASS: JWT inválido, JWT pós-logout e sessão expirada rejeitados; criação/vinculação supervisionadas; bloqueios administrativo e público.')
  console.log('PASS: disponibilidade, atribuição manual e desistência com histórico.')

} catch (e) {
  console.error('Falha de integração: '+(e.code==='ERR_ASSERTION'?e.message:e.code||e.name))
  process.exitCode=1
} finally {await db.end()}
JS
