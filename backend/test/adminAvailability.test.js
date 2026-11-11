import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../src/app.js';
import { pool } from '../src/config/database.js';
import { mockAuthProvider } from './support/mockAuth.js';

test('Consulta administrativa de disponibilidades (somente PostgreSQL simulado)', async t => {
  const queries = [];
  const availability = {id:'7',diaId:'10',data:'2026-11-09',codigoPeriodo:'D',
    periodoId:'5',observacao:null,registradaEm:'2026-11-09T12:00:00.000Z',cotistaNome:'Exemplo'};
  t.mock.method(pool,'connect',async () => { throw new Error('Conexao real proibida neste teste'); });
  t.mock.method(pool,'query',async (sql,values) => {
    queries.push({sql,values});
    if (sql.includes('FROM usuario')) return {rows:[{id:values[0].slice(5),status:'ativo',
      perfil:values[0] === 'auth-1' ? 'admin' : 'cotista',cotistaId:'5',cotistaStatus:'ativo'}],rowCount:1};
    if (sql.includes('FROM escala')) return {rows:values[0] === '20' ? [{id:'20'}] : [],rowCount:values[0] === '20' ? 1 : 0};
    if (sql.includes('FROM disponibilidade')) return {rows:values[1] === '99' ? [] : [availability],rowCount:values[1] === '99' ? 0 : 1};
    throw new Error('SQL inesperado');
  });
  const server = createApp({authProvider:mockAuthProvider,origins:['http://localhost:3000']}).listen(0,'127.0.0.1');
  await once(server,'listening');
  t.after(() => new Promise(resolve => {server.close(resolve);server.closeAllConnections();}));
  const request = async (path,id) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/escalas/${path}`,{
      headers:id ? {Cookie:`test-session=${id}`} : {},signal:AbortSignal.timeout(5000)});
    return {status:response.status,body:await response.json(),headers:response.headers};
  };
  await t.test('Autenticacao e perfil administrativo antes de qualquer consulta da escala',async () => {
    assert.equal((await request('20/disponibilidades')).status,401);
    assert.equal((await request('20/disponibilidades','2')).status,403);
    assert(!queries.some(q => q.sql.includes('FROM escala')));
  });
  await t.test('IDs invalidos e repetidos rejeitados',async () => {
    for (const path of ['0/disponibilidades','abc/disponibilidades','20/disponibilidades?cotistaId=',
      '20/disponibilidades?cotistaId=1&cotistaId=2',
      '20/disponibilidades?cotistaId=9223372036854775808']) {
      assert.equal((await request(path,'1')).status,400);
    }
  });
  await t.test('Escala ausente retorna 404',async () => {
    assert.equal((await request('21/disponibilidades','1')).status,404);
  });
  await t.test('Projecao e filtro da escala sem escrita',async () => {
    const response = await request('20/disponibilidades','1');
    assert.equal(response.status,200);
    assert.equal(response.headers.get('cache-control'),'no-store');
    assert.deepEqual(response.body,[availability]);
    const query = queries.find(q => q.sql.includes('FROM disponibilidade'));
    assert.deepEqual(query.values,['20']);
    assert(query.sql.includes('d.escala_id=$1'));
    assert(!query.sql.includes('a.cotista_id=$2'));
  });
  await t.test('Filtro opcional parametrizado e resultado vazio',async () => {
    assert.equal((await request('20/disponibilidades?cotistaId=5','1')).status,200);
    assert.deepEqual(queries.at(-1).values,['20','5']);
    assert(queries.at(-1).sql.includes('a.cotista_id=$2'));
    assert.deepEqual((await request('20/disponibilidades?cotistaId=99','1')).body,[]);
    assert(!queries.some(q => /\b(INSERT|UPDATE|DELETE)\b/.test(q.sql)));
  });
});
