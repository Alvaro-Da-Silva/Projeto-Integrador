import pg from 'pg';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import fs from 'node:fs';
import { connectTestDatabase } from '../test/support/testDatabase.js';

if (!process.argv.includes('--authorize-create') && !process.argv.includes('--export-only')) {
  console.error('Nao executado. Requer autorizacao para criar siscota_test e restaurar SOMENTE o esquema real.');
  process.exitCode = 1;
} else {
  try { await prepare(); }
  catch { console.error('Preparacao nao concluida. Verifique conexao, permissoes e versoes de pg_dump/psql. Nenhuma limpeza automatica foi executada.'); process.exitCode = 1; }
}

function toolEnvironment(url) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('PG')));
  return { ...env, PGHOST:url.hostname, PGPORT:url.port || '5432',
    PGUSER:decodeURIComponent(url.username), PGPASSWORD:decodeURIComponent(url.password),
    PGDATABASE:decodeURIComponent(url.pathname.slice(1)),
    PGSSLMODE:url.searchParams.get('sslmode') || 'prefer', PGCLIENTENCODING:'UTF8' };
}

async function prepare() {
  const executable = name => process.env.PG_BIN ? join(process.env.PG_BIN, process.platform === 'win32' ? `${name}.exe` : name) : name;
  const source = new URL(process.env.TEST_SCHEMA_SOURCE_URL);
  if (!['postgres:','postgresql:'].includes(source.protocol) || source.pathname !== '/siscota'
      || [...source.searchParams.keys()].some(key => key !== 'sslmode')) throw new Error('Fonte recusada');
  for (const tool of ['pg_dump','psql']) {
    if (spawnSync(executable(tool),['--version'],{stdio:'ignore',windowsHide:true}).status !== 0) throw new Error('Ferramenta ausente');
  }
  const dump = spawnSync(executable('pg_dump'),['--schema-only','--schema=public','--no-owner','--no-privileges'], {
    env:toolEnvironment(source),encoding:'utf8',maxBuffer:20*1024*1024,windowsHide:true
  });
  if (dump.status !== 0 || !dump.stdout.includes('CREATE TABLE')) throw new Error('Exportacao falhou');
  fs.writeFileSync(new URL('./siscota-test-schema.sql', import.meta.url), dump.stdout);
  if (process.argv.includes('--export-only')) {
    console.log('Esquema real exportado para scripts/siscota-test-schema.sql; nenhum banco ou registro alterado.');
    return;
  }
  const adminUrl = process.env.TEST_ADMIN_DATABASE_URL
    ? new URL(process.env.TEST_ADMIN_DATABASE_URL) : new URL(source);
  if (!process.env.TEST_ADMIN_DATABASE_URL) adminUrl.pathname='/postgres';
  if (adminUrl.pathname !== '/postgres' || adminUrl.hostname !== source.hostname
      || (adminUrl.port || '5432') !== (source.port || '5432')
      || [...adminUrl.searchParams.keys()].some(key => key !== 'sslmode')) throw new Error('Conexao administrativa recusada');
  const admin = new pg.Client({connectionString:adminUrl.href,connectionTimeoutMillis:5000});
  try {
    await admin.connect();
    const identity = await admin.query('SELECT current_database() AS database');
    if (identity.rows[0].database !== 'postgres') throw new Error('Banco administrativo incorreto');
    const exists = await admin.query('SELECT datname FROM pg_database WHERE datname=$1',['siscota_test']);
    if (exists.rowCount) throw new Error('Banco ja existe; nao sobrescrever');
    const owner = await admin.query('SELECT rolname FROM pg_roles WHERE rolname=$1', [decodeURIComponent(source.username)]);
    if (owner.rowCount !== 1) throw new Error('Proprietario nao encontrado');
    const quote = value => '"' + value.replaceAll('"', '""') + '"';
    await admin.query(`CREATE DATABASE siscota_test TEMPLATE template0 OWNER ${quote(owner.rows[0].rolname)}`);
  } finally { await admin.end(); }
  const target = new URL(source); target.pathname='/siscota_test';
  const client = await connectTestDatabase(target.href);
  await client.end();
  const guard = "DO $$ BEGIN IF current_database() <> 'siscota_test' THEN RAISE EXCEPTION 'Destino recusado'; END IF; END $$;\n";
  const restoreSql = dump.stdout.replace(/^CREATE SCHEMA public;\r?$/m, 'CREATE SCHEMA IF NOT EXISTS public;');
  const restored = spawnSync(executable('psql'),['--no-psqlrc','--single-transaction','--set=ON_ERROR_STOP=1'], {
    env:toolEnvironment(target),input:guard+restoreSql,encoding:'utf8',windowsHide:true,maxBuffer:20*1024*1024
  });
  if (restored.status !== 0) throw new Error('Restauracao falhou');
  console.log('siscota_test criado com esquema public real; nenhum registro copiado ou inserido.');
}
