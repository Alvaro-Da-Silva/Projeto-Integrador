import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../../src/app.js';
import { pool } from '../../src/config/database.js';
import { getMonthlyCalendar } from '../../src/services/calendarService.js';
import { getDailyQuotaDistribution } from '../../src/services/quotaDistributionService.js';
import { assertTestDatabaseUrl, connectTestDatabase, writeTestData } from '../support/testDatabase.js';
import { seedFixtures } from '../support/fixtures.js';

async function httpServer(t) {
  const server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  return async path => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      signal: AbortSignal.timeout(5000)
    });
    return { status: response.status, type: response.headers.get('content-type'),
      body: await response.text() };
  };
}

test('Protecao do banco de testes', async t => {
  for (const value of [undefined, 'invalid', 'postgresql://localhost/siscota',
    'postgresql://localhost/siscota_test?dbname=siscota', 'https://localhost/siscota_test']) {
    await t.test(`Recusa configuracao ${value ? 'insegura' : 'ausente'}`, () => {
      assert.throws(() => assertTestDatabaseUrl(value));
    });
  }
  await t.test('Aceita somente nome explicito de teste', () => {
    assert.equal(assertTestDatabaseUrl('postgresql://localhost/siscota_test').pathname, '/siscota_test');
  });
  await t.test('Recusa escrita quando identidade real diverge', async () => {
    const calls = [];
    const client = { query: async sql => { calls.push(sql); return { rows: [{ database: 'siscota' }] }; } };
    await assert.rejects(writeTestData(client, 'INSERT INTO public.escala DEFAULT VALUES'));
    assert.equal(calls.length, 1);
  });
});

test('HTTP e servico com PostgreSQL simulado (sem conexao real)', async t => {
  const get = await httpServer(t);
  const query = t.mock.method(pool, 'query', async () => { throw new Error('Banco nao deve ser consultado'); });
  const invalid = [
    ['1999','1','Ano'], ['10000','1','Ano'], ['2026.5','1','Ano'], ['abc','1','Ano'],
    ['Infinity','1','Ano'], ['2026','0','Mês'], ['2026','13','Mês'],
    ['2026','1.5','Mês'], ['2026','abc','Mês'], ['abc','abc','Ano']
  ];
  for (const [year, month, field] of invalid) {
    await t.test(`400 para ${year}/${month}`, async () => {
      const calls = query.mock.callCount();
      const r = await get(`/api/escalas/${year}/${month}/calendario`);
      assert.equal(r.status, 400);
      assert.match(JSON.parse(r.body).error, new RegExp(`^${field} inválido`));
      assert.equal(query.mock.callCount(), calls);
    });
  }
  for (const path of ['/api/escalas/2026/calendario', '/api/escalas//1/calendario', '/api/escalas/calendario']) {
    await t.test(`404 para rota incompleta ${path}`, async () => {
      const calls = query.mock.callCount();
      assert.equal((await get(path)).status, 404);
      assert.equal(query.mock.callCount(), calls);
    });
  }
  for (const [year, month, normalized] of [['2000','1',2000], ['9999','12',9999], ['2e3','01',2000]]) {
    await t.test(`Periodo aceito ${year}/${month}, sem escala`, async () => {
      query.mock.mockImplementation(async (sql, values) => {
        assert.match(sql, /WHERE ano = \$1 AND mes = \$2/);
        assert.deepEqual(values, [normalized, Number(month)]);
        return { rows: [] };
      });
      const r = await get(`/api/escalas/${year}/${month}/calendario`);
      assert.equal(r.status, 404);
      assert.deepEqual(JSON.parse(r.body), { error: 'Escala não encontrada para o período informado.' });
    });
  }
  await t.test('500 nao revela detalhes internos do banco', async () => {
    query.mock.mockImplementation(async () => { throw new Error('detalhe-interno'); });
    const r = await get('/api/escalas/2026/1/calendario');
    assert.equal(r.status, 500);
    assert.deepEqual(JSON.parse(r.body), { error: 'Não foi possível consultar o calendário.' });
  });
  for (const quotas of [3,4,5]) {
    await t.test(`200 com ${quotas} cotas e plantao associado ao dia correto`, async () => {
      query.mock.mockImplementation(async (sql, values) => {
        if (sql.includes('FROM escala')) return { rows: [{ id: '1', quantidadeCotasPadrao: quotas }] };
        if (sql.includes('FROM dia')) { assert.deepEqual(values, ['1']); return { rows: [{ id:'2' }, { id:'3' }] }; }
        if (sql.includes('FROM periodo')) return { rows: [{ id:'4' }] };
        assert.deepEqual(values, [['2','3']]);
        return { rows: [{ id:'5', diaId:'2', periodoId:'4' }] };
      });
      const r = await get('/api/escalas/2026/1/calendario');
      assert.equal(r.status, 200);
      const body = JSON.parse(r.body);
      assert.equal(body.dias[0].plantoes[0].id, '5');
      assert.deepEqual(body.dias[1].plantoes, []);
      assert.deepEqual(body.distribuicaoDiariaPadrao, getDailyQuotaDistribution(quotas));
    });
  }
  await t.test('Escala sem dias nao consulta plantoes', async () => {
    query.mock.mockImplementation(async sql => {
      assert(!sql.includes('FROM plantao'));
      return { rows: sql.includes('FROM escala') ? [{ id:'1', quantidadeCotasPadrao:4 }] : [] };
    });
    const result = await getMonthlyCalendar(2026,1);
    assert.deepEqual(result.dias, []);
    assert.deepEqual(result.periodos, []);
  });
});

test('PostgreSQL real: fixtures, constraints e HTTP transacional', {
  skip: !process.env.TEST_DATABASE_URL ? 'BLOQUEADO: TEST_DATABASE_URL ausente'
    : process.env.TEST_DB_WRITES !== 'authorized' ? 'BLOQUEADO: insercoes de teste ainda nao autorizadas (TEST_DB_WRITES)' : false
}, async t => {
  const client = await connectTestDatabase(process.env.TEST_DATABASE_URL);
  // Uma conexao, uma transacao: inclusive as consultas do backend HTTP.
  // Nao utiliza a conexao do banco principal e nao altera codigo de producao.
  t.after(async () => { try { await client.query('ROLLBACK'); } finally { await client.end(); } });
  await client.query('BEGIN');
  await client.query("SET LOCAL search_path TO public");
  await client.query("SET LOCAL statement_timeout = '5s'");
  await client.query("SET LOCAL lock_timeout = '2s'");
  const fixture = await seedFixtures(client);
  t.mock.method(pool, 'query', (...args) => client.query(...args));
  const get = await httpServer(t);

  await t.test('Todas as 16 entidades possuem fixture valida', async () => {
    for (const [table,id] of Object.entries(fixture)) {
      if (['token','ano','mes','date','missingId'].includes(table)) continue;
      const result = await client.query(`SELECT id FROM public."${table}" WHERE id=$1`, [id]);
      assert.equal(result.rowCount,1);
    }
    for (const table of ['user','account','session','verification','jwks']) {
      assert.equal((await client.query(`SELECT id FROM public."${table}" WHERE id=$1`, [fixture.token])).rowCount,1);
    }
  });
  await t.test('200 com escala e vinculos persistidos na transacao', async () => {
    const r = await get(`/api/escalas/${fixture.ano}/${fixture.mes}/calendario`);
    assert.equal(r.status,200);
    const body = JSON.parse(r.body);
    assert.equal(body.escala.id, fixture.escala);
    assert.equal(body.dias[0].plantoes[0].id, fixture.plantao);
    assert(body.periodos.some(p => p.id === fixture.periodo));
    assert.equal(body.distribuicaoDiariaPadrao.diurnalQuotas,2);
    assert.equal(body.distribuicaoDiariaPadrao.nightQuotas,2);
  });
  await t.test('404 para periodo realmente sem registro', async () => {
    const free = await client.query(`SELECT y AS ano, m AS mes FROM generate_series(2000,9999) y
      CROSS JOIN generate_series(1,12) m WHERE NOT EXISTS
      (SELECT FROM public.escala e WHERE e.ano=y AND e.mes=m) LIMIT 1`);
    assert.equal(free.rowCount,1);
    const { ano, mes } = free.rows[0];
    assert.equal((await get(`/api/escalas/${ano}/${mes}/calendario`)).status,404);
  });
  for (const quotas of [3,5]) {
    await t.test(`Distribuicao de ${quotas} cotas lidas do PostgreSQL`, async () => {
      await client.query('SAVEPOINT quota_case');
      try {
        await writeTestData(client, 'UPDATE public.escala SET quantidade_cotas_padrao=$1 WHERE id=$2', [quotas,fixture.escala]);
        const result = await getMonthlyCalendar(fixture.ano,fixture.mes);
        assert.deepEqual(result.distribuicaoDiariaPadrao,getDailyQuotaDistribution(quotas));
      } finally { await client.query('ROLLBACK TO SAVEPOINT quota_case'); }
    });
  }
  const invalidCases = [
    ['ano inferior', 'UPDATE public.escala SET ano=1999 WHERE id=$1', [fixture.escala], '23514'],
    ['mes zero', 'UPDATE public.escala SET mes=0 WHERE id=$1', [fixture.escala], '23514'],
    ['mes treze', 'UPDATE public.escala SET mes=13 WHERE id=$1', [fixture.escala], '23514'],
    ['datas invertidas', "UPDATE public.escala SET data_fim=data_inicio-1 WHERE id=$1", [fixture.escala], '23514'],
    ['quantidade zero', 'UPDATE public.plantao SET quantidade_necessaria=0 WHERE id=$1', [fixture.plantao], '23514'],
    ['quantidade negativa', 'UPDATE public.plantao SET quantidade_necessaria=-1 WHERE id=$1', [fixture.plantao], '23514'],
    ['dia repetido', 'INSERT INTO public.dia (id,escala_id,data) OVERRIDING SYSTEM VALUE VALUES ($1,$2,$3)', [fixture.missingId,fixture.escala,fixture.date], '23505'],
    ['plantao repetido', 'INSERT INTO public.plantao (id,dia_id,periodo_id,quantidade_necessaria) OVERRIDING SYSTEM VALUE VALUES ($1,$2,$3,1)', [fixture.missingId,fixture.dia,fixture.periodo], '23505']
  ];
  invalidCases.push(
    ['tipo de solicitacao', 'UPDATE public.solicitacao SET tipo=$1 WHERE id=$2', ['fixture_invalida',fixture.solicitacao], '23514'],
    ['perfil repetido', 'INSERT INTO public.perfil (id,nome) OVERRIDING SYSTEM VALUE SELECT $1,nome FROM public.perfil WHERE id=$2', [fixture.missingId,fixture.perfil], '23505'],
    ['email de usuario repetido', 'INSERT INTO public.usuario (id,nome,email,senha_hash,perfil_id) OVERRIDING SYSTEM VALUE SELECT $1,nome,email,senha_hash,perfil_id FROM public.usuario WHERE id=$2', [fixture.missingId,fixture.usuario], '23505'],
    ['codigo de periodo repetido', 'INSERT INTO public.periodo (id,codigo,nome,hora_inicio,hora_fim) OVERRIDING SYSTEM VALUE SELECT $1,codigo,nome,hora_inicio,hora_fim FROM public.periodo WHERE id=$2', [fixture.missingId,fixture.periodo], '23505'],
    ['mes e ano repetidos', 'INSERT INTO public.escala (id,nome,mes,ano,data_inicio,data_fim) OVERRIDING SYSTEM VALUE SELECT $1,nome,mes,ano,data_inicio,data_fim FROM public.escala WHERE id=$2', [fixture.missingId,fixture.escala], '23505'],
    ['disponibilidade repetida', 'INSERT INTO public.disponibilidade (id,cotista_id,dia_id,periodo_id) OVERRIDING SYSTEM VALUE SELECT $1,cotista_id,dia_id,periodo_id FROM public.disponibilidade WHERE id=$2', [fixture.missingId,fixture.disponibilidade], '23505'],
    ['participacao repetida', 'INSERT INTO public.participacao (id,cotista_id,plantao_id) OVERRIDING SYSTEM VALUE SELECT $1,cotista_id,plantao_id FROM public.participacao WHERE id=$2', [fixture.missingId,fixture.participacao], '23505'],
    ['email de user repetido', 'INSERT INTO public."user" (id,name,email,"emailVerified") SELECT $1,name,email,"emailVerified" FROM public."user" WHERE id=$2', [`missing-${fixture.token}`,fixture.token], '23505']
  );
  // Todas as FKs e NOT NULL reais, sem deduzir relacionamentos pelo nome.
  const metadata = await client.query(`SELECT c.relname AS table_name, a.attname AS column_name,
    a.attnotnull AS required, a.attidentity AS identity FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'
    AND c.relkind='r' AND a.attnum>0 AND NOT a.attisdropped ORDER BY c.relname,a.attnum`);
  const ids = { ...fixture, ...Object.fromEntries(['user','account','session','verification','jwks'].map(k=>[k,fixture.token])) };
  const quote = value => '"'+value.replaceAll('"','""')+'"';
  for (const column of metadata.rows.filter(r=>r.required && !r.identity && Object.hasOwn(ids,r.table_name))) {
    invalidCases.push([`NOT NULL ${column.table_name}.${column.column_name}`,
      `UPDATE public.${quote(column.table_name)} SET ${quote(column.column_name)}=NULL WHERE id=$1`,
      [ids[column.table_name]],'23502']);
  }
  const fks = await client.query(`SELECT c.relname AS table_name,a.attname AS column_name,
    format_type(a.atttypid,a.atttypmod) AS data_type FROM pg_constraint fk
    JOIN pg_class c ON c.oid=fk.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=ANY(fk.conkey)
    WHERE fk.contype='f' AND n.nspname='public' ORDER BY c.relname,a.attname`);
  for (const fk of fks.rows.filter(r=>Object.hasOwn(ids,r.table_name))) {
    invalidCases.push([`FK ${fk.table_name}.${fk.column_name}`,
      `UPDATE public.${quote(fk.table_name)} SET ${quote(fk.column_name)}=$1 WHERE id=$2`,
      [fk.data_type==='text' ? `missing-${fixture.token}` : fixture.missingId,ids[fk.table_name]],'23503']);
  }
  for (const table of ['usuario','cotista','periodo','escala','plantao','participacao','solicitacao','notificacao']) {
    invalidCases.push([`status invalido em ${table}`,`UPDATE public.${quote(table)} SET status=$1 WHERE id=$2`,
      ['fixture_invalida',ids[table]],'23514']);
  }
  for (const [name, sql, values, code] of invalidCases) {
    await t.test(`Constraint rejeita ${name}`, async () => {
      await client.query('SAVEPOINT invalid_case');
      try {
        await assert.rejects(writeTestData(client,sql,values), error=>error.code===code);
      } finally { await client.query('ROLLBACK TO SAVEPOINT invalid_case'); }
    });
  }
  await t.test('ROLLBACK remove fixtures sem limpeza do banco principal', async () => {
    await client.query('ROLLBACK');
    for (const table of ['perfil','usuario','cotista','escala','periodo','dia','plantao',
      'disponibilidade','participacao','solicitacao','notificacao','user','account','session','verification','jwks']) {
      assert.equal((await client.query(`SELECT id FROM public.${quote(table)} WHERE id=$1`,[ids[table]])).rowCount,0, table);
    }
  });
});
