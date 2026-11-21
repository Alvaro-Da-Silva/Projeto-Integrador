import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import pg from 'pg';

// Execução explícita contra o cluster descartável desta investigação.
const enabled = process.env.SISCOTA_PROVISIONING_TEST === 'isolated-55439';

test('cadastro administrativo com PostgreSQL e runtime restrito', { skip: !enabled }, async t => {
  process.env.PGHOST = '127.0.0.1';
  process.env.PGPORT = '55439';
  process.env.PGDATABASE = 'siscota';
  process.env.PGUSER = 'siscota';
  delete process.env.DATABASE_URL;
  delete process.env.PGPASSWORD;
  delete process.env.PGSSLMODE;
  const admin = new pg.Client({ host: '127.0.0.1', port: 55439, database: 'siscota', user: 'postgres' });
  await admin.connect();
  const { createApp } = await import('../src/app.js');
  const { pool } = await import('../src/config/database.js');
  const app = createApp({ origins: ['http://localhost:3000'], authProvider: () => ({ api: {
    getSession: async ({ headers }) => {
      const id = headers.get('cookie') === 'test=cotista' ? 'fixture-cotista' : 'fixture-admin';
      return { user: { id }, session: { userId: id, expiresAt: new Date(Date.now() + 60000) } };
    }
  } }) });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const endpoint = `http://127.0.0.1:${server.address().port}/api/usuarios`;
  const body = { nome: 'Conta Sintetica', email: 'cadastro@example.invalid', senha: 'Senha-sintetica-123!', perfil: 'admin' };
  const request = async (data, cookie = 'test=admin', origin = 'http://localhost:3000') => {
    const headers = { 'Content-Type': 'application/json', Origin: origin };
    if (cookie) headers.Cookie = cookie;
    const response = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(data) });
    return { status: response.status, body: await response.json() };
  };
  const count = async () => (await admin.query('SELECT count(*)::int AS count FROM public."user"')).rows[0].count;
  try {
    await t.test('baseline reproduz 503 e rollback sem conta parcial', async () => {
      const before = await count();
      const response = await request(body);
      assert.equal(response.status, 503);
      assert.match(response.body.error, /permissão para gerenciar contas/);
      assert.equal(await count(), before);
    });
    const migration = await readFile(new URL('../migrations/008_user_provisioning_runtime.sql', import.meta.url), 'utf8');
    await t.test('migração transacional e repetível', async () => {
      await admin.query(migration);
      await admin.query(migration);
    });
    await t.test('administrador cadastra conta e credencial', async () => {
      assert.equal((await request(body)).status, 201);
      const result = await admin.query('SELECT count(*)::int AS count FROM public.account a JOIN public.usuario u ON u.better_auth_user_id=a."userId" WHERE u.email=$1', [body.email]);
      assert.equal(result.rows[0].count, 1);
    });
    await t.test('falha no último INSERT desfaz identidade, credencial e usuário', async () => {
      const before = await count();
      await admin.query('REVOKE INSERT ON public.cotista FROM siscota');
      try {
        assert.equal((await request({ ...body, email: 'rollback-parcial@example.invalid', perfil: 'cotista', telefone: '(48) 99999-0000', dataNascimento: '1990-01-01' })).status, 503);
        assert.equal(await count(), before);
        const { rows: [row] } = await admin.query("SELECT (SELECT count(*) FROM public.usuario WHERE email='rollback-parcial@example.invalid')::int AS usuarios, (SELECT count(*) FROM public.account WHERE \"userId\" NOT IN (SELECT id FROM public.\"user\"))::int AS orfaos");
        assert.deepEqual(row, { usuarios: 0, orfaos: 0 });
      } finally {
        await admin.query('GRANT INSERT ON public.cotista TO siscota');
      }
    });
    await t.test('administrador cadastra cotista com contato obrigatório', async () => {
      assert.equal((await request({ ...body, email: 'cotista-novo@example.invalid', perfil: 'cotista', telefone: '(48) 99999-0000', dataNascimento: '1990-01-01' })).status, 201);
      assert.equal((await admin.query("SELECT count(*)::int AS count FROM public.cotista WHERE email='cotista-novo@example.invalid'")).rows[0].count, 1);
    });
    await t.test('e-mail duplicado é 409 sem conta adicional', async () => {
      const before = await count();
      assert.equal((await request({ ...body, email: body.email.toUpperCase() })).status, 409);
      assert.equal(await count(), before);
    });
    await t.test('anônimo, cotista e origem indevida são rejeitados', async () => {
      const before = await count();
      assert.equal((await request(body, '')).status, 401);
      assert.equal((await request(body, 'test=cotista')).status, 403);
      assert.equal((await request(body, 'test=admin', 'http://origem.invalid')).status, 403);
      assert.equal(await count(), before);
    });
    await t.test('migração mantém privilégios de exclusão e administração restritos', async () => {
      const { rows: [row] } = await admin.query("SELECT has_table_privilege('siscota','public.\"user\"','DELETE') AS delete_user,has_table_privilege('siscota','public.usuario','UPDATE') AS update_usuario,rolsuper,rolbypassrls FROM pg_roles WHERE rolname='siscota'");
      assert.deepEqual(row, { delete_user: false, update_usuario: false, rolsuper: false, rolbypassrls: false });
    });
    await t.test('recuperação revoga somente a expansão e preserva contas criadas', async () => {
      const before = await count();
      const rollback = await readFile(new URL('./rollback-user-provisioning-runtime.sql', import.meta.url), 'utf8');
      await admin.query(rollback);
      assert.equal((await request({ ...body, email: 'apos-rollback@example.invalid' })).status, 503);
      assert.equal(await count(), before);
    });
  } finally {
    await new Promise(resolve => server.close(resolve));
    await pool.end();
    await admin.end();
  }
});
