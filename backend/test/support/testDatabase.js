import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

// Arquivo exclusivo dos testes. Nunca carregar o .env de desenvolvimento.
dotenv.config({ path: fileURLToPath(new URL('../../.env.test', import.meta.url)), quiet: true });

export function assertTestDatabaseUrl(value) {
  if (!value) throw new Error('TEST_DATABASE_URL ausente.');
  let url;
  try { url = new URL(value); } catch { throw new Error('TEST_DATABASE_URL invalida.'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)
      || decodeURIComponent(url.pathname) !== '/siscota_test'
      || url.searchParams.has('options') || url.searchParams.has('dbname')
      || url.searchParams.has('database') || url.searchParams.has('service')) {
    throw new Error('Conexao recusada: use exclusivamente siscota_test, sem redirecionamento.');
  }
  return url;
}

export async function connectTestDatabase(value) {
  assertTestDatabaseUrl(value);
  const client = new pg.Client({ connectionString: value, connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    const result = await client.query('SELECT current_database() AS database');
    if (result.rows[0].database !== 'siscota_test') throw new Error('Banco real diferente de siscota_test.');
    return client;
  } catch {
    await client.end().catch(() => {});
    throw new Error('Nao foi possivel confirmar conexao com siscota_test; nenhuma escrita permitida.');
  }
}

// Executar novamente imediatamente antes de cada comando de escrita.
export async function writeTestData(client, sql, values = []) {
  const result = await client.query('SELECT current_database() AS database');
  if (result.rows[0].database !== 'siscota_test') throw new Error('Escrita bloqueada fora de siscota_test.');
  return client.query(sql, values);
}
