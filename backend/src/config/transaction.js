import { pool } from './database.js';

export async function transaction(work) {
  const client = await pool.connect();
  let discard;
  try {
    // O papel de desenvolvimento possui default_transaction_read_only=on.
    await client.query('BEGIN READ WRITE');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (rollbackError) { discard = rollbackError; }
    throw error;
  } finally { client.release(discard); }
}
