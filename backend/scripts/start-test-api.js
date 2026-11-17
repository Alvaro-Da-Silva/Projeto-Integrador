import { assertTestDatabaseUrl, connectTestDatabase } from '../test/support/testDatabase.js';

try {
  assertTestDatabaseUrl(process.env.TEST_DATABASE_URL);
  const client = await connectTestDatabase(process.env.TEST_DATABASE_URL);
  await client.end();
  const port = Number(process.env.TEST_API_PORT || 8081);
  if (!Number.isInteger(port) || port<1024 || port>65535) throw new Error('Porta invalida');
  process.env.DATABASE_URL=process.env.TEST_DATABASE_URL;
  const { createApp } = await import('../src/app.js');
  const { pool } = await import('../src/config/database.js');
  const server = createApp().listen(port,'127.0.0.1',()=> {
    console.log(`API isolada: http://127.0.0.1:${port}; banco confirmado: siscota_test`);
  });
  server.on('error',()=> { console.error('API de teste nao iniciou; verifique a porta.'); process.exitCode=1; });
  const stop = () => { server.close(async()=> { await pool.end(); }); server.closeAllConnections(); };
  process.once('SIGINT',stop);
  process.once('SIGTERM',stop);
} catch {
  console.error('API nao iniciada: conexao de teste nao confirmada ou configuracao invalida.');
  process.exitCode=1;
}
