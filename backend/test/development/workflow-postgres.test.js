import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomInt } from 'node:crypto';
import { connectDevelopment,developmentWrite } from '../../scripts/development-db.js';
import { createApp } from '../../src/app.js';
import { pool } from '../../src/config/database.js';
import { hashPassword } from '../../src/services/authService.js';

test('Fluxo autenticado com PostgreSQL real (transacao revertida)',async t=> {
  let client;
  try {client=await connectDevelopment();}
  catch(error) {t.skip(`BLOQUEADO: conexao ${error.code || 'CONFIGURATION'}`);return;}
  const tables=['perfil','usuario','cotista','escala','dia','periodo','plantao','disponibilidade'];
  const missing=[];
  try {
    for(const table of tables) {
      const r=await client.query("SELECT has_table_privilege($1,'INSERT') AS allowed",['public.'+table]);
      if(!r.rows[0].allowed) missing.push(table);
    }
  } catch(error) {await client.end();throw error;}
  if(missing.length) {await client.end();t.skip(`BLOQUEADO: INSERT ausente em ${missing.join(', ')}`);return;}
  const oldSecret=process.env.AUTH_TOKEN_SECRET;
  process.env.AUTH_TOKEN_SECRET='segredo-exclusivo-do-teste-real-em-transacao';
  t.after(async()=> {
    try {await client.query('ROLLBACK');} finally {await client.end();}
    if(oldSecret===undefined) delete process.env.AUTH_TOKEN_SECRET; else process.env.AUTH_TOKEN_SECRET=oldSecret;
  });
  await client.query('BEGIN READ WRITE');
  await client.query("SET LOCAL statement_timeout='10s'");
  const id=String(7000000000000000n+BigInt(Date.now())*100n+BigInt(randomInt(100)));
  const next=n=>String(BigInt(id)+BigInt(n));
  const write=(...args)=>developmentWrite(client,...args);
  const hash=await hashPassword('SomenteTesteReal123!');
  const label=`TESTE FLUXO ${id}`;
  // IDs positivos explicitos: JWT/rotas aceitam IDs de dominio positivos.
  // Perfis efetivos reutilizados, caso provisionados. Caso contrario, criar
  // admin/cotista na mesma transacao, sem modificar perfis existentes.
  await write("INSERT INTO perfil (id,nome) OVERRIDING SYSTEM VALUE VALUES ($1,'admin'),($2,'cotista') ON CONFLICT (nome) DO NOTHING",[next(100),next(101)]);
  const roles=await client.query("SELECT id,nome FROM perfil WHERE nome IN ('admin','cotista')");
  const roleId=name=>roles.rows.find(p=>p.nome===name).id;
  const users=[['admin',next(2)],['cotista',next(3)],['cotista',next(4)]];
  for(const [role,userId] of users) await write(`INSERT INTO usuario (id,nome,email,senha_hash,perfil_id)
    OVERRIDING SYSTEM VALUE VALUES ($1,$2,$3,$4,$5)`,[userId,label,`${userId}@example.invalid`,hash,roleId(role)]);
  for(const [n,userId] of [[5,next(3)],[6,next(4)]]) await write(`INSERT INTO cotista (id,usuario_id,nome,cpf)
    OVERRIDING SYSTEM VALUE VALUES ($1,$2,$3,$4)`,[next(n),userId,label,String(randomInt(10000000000,99999999999))]);
  const free=(await client.query(`SELECT y AS ano,m AS mes FROM generate_series(2000,9999) y
    CROSS JOIN generate_series(1,12) m WHERE NOT EXISTS(SELECT FROM escala e WHERE e.ano=y AND e.mes=m)
    ORDER BY y,m LIMIT 1`)).rows[0];
  const start=`${free.ano}-${String(free.mes).padStart(2,'0')}-01`;
  await write(`INSERT INTO escala (id,nome,ano,mes,data_inicio,data_fim,quantidade_cotas_padrao)
    OVERRIDING SYSTEM VALUE VALUES ($1,$2,$3,$4,$5,$5,4)`,[next(7),label,free.ano,free.mes,start]);
  // Reutilizar os periodos canonicos cadastrados, sem editar seus horarios.
  const periods=await client.query("SELECT id,codigo FROM periodo WHERE codigo IN ('D','N1','N2','I') AND status='ativo'");
  assert.equal(periods.rowCount,4,'Executar npm.cmd run setup:periodos antes do teste real');
  await write('INSERT INTO dia (id,escala_id,data) OVERRIDING SYSTEM VALUE VALUES ($1,$2,$3)',[next(8),next(7),start]);
  const dayId=next(8);
  // Mapeamento apenas do driver para a MESMA conexao real, sem respostas
  // simuladas. SAVEPOINTs mantem cada transacao HTTP dentro do ROLLBACK final.
  let counter=0;
  t.mock.method(pool,'query',(...args)=>client.query(...args));
  t.mock.method(pool,'connect',async()=> {
    const savepoint=`workflow_${++counter}`;
    return {query:async(sql,values)=> {
      if(sql==='BEGIN READ WRITE') return client.query(`SAVEPOINT ${savepoint}`);
      if(sql==='COMMIT') return client.query(`RELEASE SAVEPOINT ${savepoint}`);
      if(sql==='ROLLBACK') {
        await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
        return client.query(`RELEASE SAVEPOINT ${savepoint}`);
      }
      return client.query(sql,values);
    },release:()=>{}};
  });
  const server=createApp().listen(0,'127.0.0.1');await once(server,'listening');
  t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
  const request=async(method,path,body,token)=> {
    const r=await fetch(`http://127.0.0.1:${server.address().port}${path}`,{
      method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},
      body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
    return {status:r.status,body:await r.json()};
  };
  const tokens=[];
  await t.test('Login real para admin e dois cotistas sem modificar autenticacao externa',async()=> {
    for(const [,userId] of users) {
      const r=await request('POST','/api/auth/login',{email:`${userId}@example.invalid`,senha:'SomenteTesteReal123!'});
      assert.equal(r.status,200);tokens.push(r.body.accessToken);
    }
  });
  await t.test('Cotista nao pode liberar plantao',async()=> {
    assert.equal((await request('PUT',`/api/escalas/${next(7)}/dias/${start}/plantoes/D`,{quantidadeNecessaria:2},tokens[1])).status,403);
  });
  await t.test('Admin cadastra escala por HTTP e duplicidade retorna 409',async()=> {
    const another=(await client.query(`SELECT y AS ano,m AS mes FROM generate_series(2000,9999) y
      CROSS JOIN generate_series(1,12) m WHERE NOT EXISTS(SELECT FROM escala e WHERE e.ano=y AND e.mes=m)
      ORDER BY y,m LIMIT 1`)).rows[0];
    const body={nome:label,ano:another.ano,mes:another.mes,quantidadeCotasPadrao:4};
    assert.equal((await request('POST','/api/escalas',body,tokens[0])).status,201);
    assert.equal((await request('POST','/api/escalas',body,tokens[0])).status,409);
  });
  await t.test('Administrador libera D e cotistas registram preferencias concorrentes',async()=> {
    const r=await request('PUT',`/api/escalas/${next(7)}/dias/${start}/plantoes/D`,{quantidadeNecessaria:1},tokens[0]);
    assert.equal(r.status,200);
    for(const token of tokens.slice(1)) assert.equal((await request('PUT',`/api/disponibilidades/${dayId}`,{codigoPeriodo:'D'},token)).status,200);
    assert.equal((await client.query('SELECT count(*)::int AS total FROM disponibilidade WHERE dia_id=$1',[dayId])).rows[0].total,2);
    assert.equal((await client.query('SELECT quantidade_necessaria FROM plantao WHERE dia_id=$1',[dayId])).rows[0].quantidade_necessaria,1);
  });
  await t.test('Cotista consulta apenas sua escolha para preencher a tela',async()=> {
    const r=await request('GET',`/api/disponibilidades?escalaId=${next(7)}`,undefined,tokens[1]);
    assert.equal(r.status,200);assert.equal(r.body.length,1);assert.equal(r.body[0].codigoPeriodo,'D');
  });
  await t.test('Encerrar plantao bloqueia escolha; reabrir permite nova escolha',async()=> {
    const path=`/api/escalas/${next(7)}/dias/${start}/plantoes/D/status`;
    assert.equal((await request('PATCH',path,{status:'encerrado'},tokens[0])).status,200);
    assert.equal((await request('PUT',`/api/disponibilidades/${dayId}`,{codigoPeriodo:'I'},tokens[1])).status,409);
    assert.equal((await request('PATCH',path,{status:'aberto'},tokens[0])).status,200);
    assert.equal((await request('PUT',`/api/disponibilidades/${dayId}`,{codigoPeriodo:'I'},tokens[1])).status,200);
  });
  await t.test('Troca para I mantem apenas uma opcao no dia',async()=> {
    assert.equal((await request('PUT',`/api/disponibilidades/${dayId}`,{codigoPeriodo:'I'},tokens[1])).status,200);
    assert.equal((await client.query('SELECT count(*)::int AS total FROM disponibilidade WHERE dia_id=$1 AND cotista_id=$2',[dayId,next(5)])).rows[0].total,1);
  });
  await t.test('Encerrar escala impede novo preenchimento',async()=> {
    assert.equal((await request('PATCH',`/api/escalas/${next(7)}/status`,{status:'fechada'},tokens[0])).status,200);
    assert.equal((await request('PUT',`/api/disponibilidades/${dayId}`,{codigoPeriodo:'D'},tokens[1])).status,409);
  });
});
