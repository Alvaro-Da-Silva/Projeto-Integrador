import test from 'node:test';
import assert from 'node:assert/strict';
import { connectDevelopment } from '../../scripts/development-db.js';

test('HTTP real com PostgreSQL siscota (sem mocks)',async t=> {
  let client;
  try { client=await connectDevelopment(); }
  catch(error) { t.skip(`BLOQUEADO: conexao PostgreSQL ${error.code || 'CONFIGURATION'}`); return; }
  t.after(()=>client.end());
  const base=process.env.DEV_API_BASE_URL || 'http://localhost:8080';
  const get=async path=> {
    try { return await fetch(base+path,{signal:AbortSignal.timeout(5000)}); }
    catch(error) { throw new Error(`HTTP indisponivel: ${error.cause?.code || error.name}`); }
  };
  try { await get('/api/escalas/1999/1/calendario'); }
  catch(error) { t.skip(`BLOQUEADO: ${error.message}`); return; }
  await t.test('Conexao confirmada como siscota',async()=> {
    assert.equal((await client.query('SELECT current_database() AS database')).rows[0].database,'siscota');
  });
  await t.test('404 para periodo confirmado ausente por SELECT',async()=> {
    const free=(await client.query(`SELECT y AS ano,m AS mes FROM generate_series(2000,9999) y
      CROSS JOIN generate_series(1,12) m WHERE NOT EXISTS
      (SELECT FROM public.escala e WHERE e.ano=y AND e.mes=m) ORDER BY y,m LIMIT 1`)).rows[0];
    assert(free,'Sem periodo livre no banco');
    const r=await get(`/api/escalas/${free.ano}/${free.mes}/calendario`);
    assert.equal(r.status,404);
    assert.deepEqual(await r.json(),{error:'Escala não encontrada para o período informado.'});
  });
  for(const [ano,mes] of [['1999','11'],['2026','13'],['abc','11'],['2026','0']]) {
    await t.test(`HTTP 400 ${ano}/${mes}`,async()=> {
      const r=await get(`/api/escalas/${ano}/${mes}/calendario`);
      assert.equal(r.status,400);
      assert.match((await r.json()).error,/inválido/);
    });
  }
  await t.test('CORS permite origem do frontend',async()=> {
    const r=await fetch(base+'/api/escalas/1999/11/calendario',{
      headers:{Origin:'http://localhost:3000'},signal:AbortSignal.timeout(5000)});
    assert.equal(r.headers.get('access-control-allow-origin'),'*');
  });
  await t.test('HTTP 200 novembro/2026 com 30 dias e distribuicao 2+2',async st=> {
    const scale=await client.query('SELECT id,quantidade_cotas_padrao FROM public.escala WHERE ano=2026 AND mes=11');
    if(!scale.rowCount) { st.skip('BLOQUEADO: seed sem INSERT em escala (42501); periodo sem dados'); return; }
    const r=await get('/api/escalas/2026/11/calendario');
    assert.equal(r.status,200);
    const body=await r.json();
    assert.equal(body.escala.id,scale.rows[0].id);
    assert.equal(body.escala.quantidadeCotasPadrao,4);
    assert.equal(body.dias.length,30);
    assert.equal(body.dias.flatMap(d=>d.plantoes).length,60);
    const days=await client.query('SELECT id FROM public.dia WHERE escala_id=$1 ORDER BY data,id',[scale.rows[0].id]);
    assert.deepEqual(body.dias.map(d=>d.id),days.rows.map(d=>d.id));
    const shifts=await client.query(`SELECT p.id,p.dia_id,p.periodo_id,p.quantidade_necessaria FROM public.plantao p
      JOIN public.dia d ON d.id=p.dia_id WHERE d.escala_id=$1`,[scale.rows[0].id]);
    const actual=body.dias.flatMap(d=>d.plantoes);
    assert.equal(actual.length,shifts.rowCount);
    for(const shift of shifts.rows) assert(actual.some(p=>p.id===shift.id && p.diaId===shift.dia_id
      && p.periodoId===shift.periodo_id && p.quantidadeNecessaria===shift.quantidade_necessaria));
    const periods=await client.query('SELECT id FROM public.periodo ORDER BY codigo,id');
    assert.deepEqual(body.periodos.map(p=>p.id),periods.rows.map(p=>p.id));
    assert.deepEqual(body.distribuicaoDiariaPadrao,{totalQuotas:4,hoursPerQuota:12,
      nightPeriodAllocation:'pending',supported:true,diurnalQuotas:2,nightQuotas:2});
  });
});

test('Integridade PostgreSQL real: auditoria somente leitura',async t=> {
  let client;
  try { client=await connectDevelopment(); }
  catch(error) { t.skip(`BLOQUEADO: conexao PostgreSQL ${error.code || 'CONFIGURATION'}`); return; }
  t.after(async()=> { try { await client.query('ROLLBACK'); } finally { await client.end(); } });
  await client.query('BEGIN READ ONLY ISOLATION LEVEL REPEATABLE READ');
  const zero=async sql=>assert.equal(Number((await client.query(sql)).rows[0].count),0);
  const checks=[
    ['Dia sem escala',`SELECT count(*) FROM public.dia d LEFT JOIN public.escala e ON e.id=d.escala_id WHERE e.id IS NULL`],
    ['Plantao sem dia',`SELECT count(*) FROM public.plantao p LEFT JOIN public.dia d ON d.id=p.dia_id WHERE d.id IS NULL`],
    ['Plantao sem periodo',`SELECT count(*) FROM public.plantao p LEFT JOIN public.periodo r ON r.id=p.periodo_id WHERE r.id IS NULL`],
    ['Dia fora do intervalo',`SELECT count(*) FROM public.dia d JOIN public.escala e ON e.id=d.escala_id WHERE d.data<e.data_inicio OR d.data>e.data_fim`],
    ['Escala duplicada por periodo',`SELECT count(*) FROM (SELECT ano,mes FROM public.escala GROUP BY ano,mes HAVING count(*)>1) q`],
    ['Dia duplicado',`SELECT count(*) FROM (SELECT escala_id,data FROM public.dia GROUP BY escala_id,data HAVING count(*)>1) q`],
    ['Plantao duplicado',`SELECT count(*) FROM (SELECT dia_id,periodo_id FROM public.plantao GROUP BY dia_id,periodo_id HAVING count(*)>1) q`],
    ['Quantidade de plantao nao positiva',`SELECT count(*) FROM public.plantao WHERE quantidade_necessaria<=0`],
    ['Account sem user',`SELECT count(*) FROM public.account a LEFT JOIN public."user" u ON u.id=a."userId" WHERE u.id IS NULL`],
    ['Session sem user',`SELECT count(*) FROM public.session s LEFT JOIN public."user" u ON u.id=s."userId" WHERE u.id IS NULL`],
    ['Constraints validadas',`SELECT count(*) FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public' AND NOT c.convalidated`]
  ];
  for(const [name,sql] of checks) await t.test(name,()=>zero(sql));
});
