import 'dotenv/config';
import fs from 'node:fs';
import { pool } from '../src/config/database.js';

const sql = fs.readFileSync(new URL('./local-domain-schema.sql', import.meta.url), 'utf8');
const client = await pool.connect();
try {
  await client.query('BEGIN READ WRITE');
  await client.query(sql);
  await client.query('COMMIT');
  const { rows } = await client.query(`SELECT current_database() AS banco,
    (SELECT count(*) FROM perfil)::int AS perfis, (SELECT count(*) FROM periodo)::int AS periodos,
    (SELECT count(*) FROM escala)::int AS escalas, (SELECT count(*) FROM usuario)::int AS usuarios`);
  console.log('Esquema de domínio pronto:', rows[0]);
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  console.error('Falha ao preparar o banco:', error.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
