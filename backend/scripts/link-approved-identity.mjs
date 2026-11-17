import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { hashPassword } from 'better-auth/crypto';
import pg from 'pg';

// Invoke from an approved local administrative session. Never pass a password in argv.
async function run() {
  const { PGHOST, PGDATABASE, PGPORT } = process.env;
  if (!PGHOST?.startsWith('/') || !PGDATABASE ||
      !['--isolated','--apply-approved'].includes(process.argv[2])) {
    throw new Error('Destino ou autorização inválida.');
  }
  if (process.argv[2] === '--isolated' &&
      !(PGDATABASE.startsWith('siscota_isolated_') && PGPORT === '55433' && PGHOST.endsWith('/socket'))) {
    throw new Error('O modo isolado exige o socket e o banco de ensaio.');
  }
  if (process.argv[2] === '--apply-approved' &&
      !(PGHOST === '/var/run/postgresql' && PGPORT === '5432' && PGDATABASE === 'siscota')) {
    throw new Error('Destino definitivo inválido.');
  }
  const { usuarioId, password, identityId } = JSON.parse(readFileSync(0, 'utf8'));
  if (typeof usuarioId !== 'string' || !/^[1-9][0-9]*$/.test(usuarioId) ||
      (identityId === undefined
        ? typeof password !== 'string' || password.length < 12 || password.length > 256
        : typeof identityId !== 'string' || !identityId || identityId.length > 200 || password !== undefined)) {
    throw new Error('Entrada inválida.');
  }
  const hash = identityId === undefined ? await hashPassword(password) : undefined;
  const db = new pg.Client({ connectionTimeoutMillis: 5000 });
  await db.connect();
  try {
    await db.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
    await db.query("SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='15s'");
    const { rows: [user] } = await db.query(
      `SELECT u.id,u.nome,u.email,u.status,u.better_auth_user_id,p.nome AS perfil
         FROM public.usuario u JOIN public.perfil p ON p.id=u.perfil_id
        WHERE u.id=$1 FOR UPDATE OF u`, [usuarioId]);
    if (!user || user.status !== 'ativo' || user.better_auth_user_id ||
        !['admin','cotista'].includes(user.perfil) || !user.email?.trim()) {
      throw new Error('Usuário não elegível para vinculação.');
    }
    if (user.perfil === 'cotista') {
      const { rowCount } = await db.query(
        `SELECT 1 FROM public.cotista WHERE usuario_id=$1 AND status='ativo'
          AND telefone ~ '[^[:space:]]' AND email ~ '[^[:space:]]'
          AND data_nascimento IS NOT NULL FOR SHARE`, [usuarioId]);
      if (rowCount !== 1) throw new Error('Cotista aprovado completo é obrigatório.');
    }
    const ids = await db.query(
      'SELECT id,email,role,banned FROM public."user" WHERE lower(email)=lower($1) FOR UPDATE',
      [user.email]);
    let authId = identityId;
    const role = user.perfil === 'admin' ? 'admin' : 'user';
    if (identityId === undefined) {
      if (ids.rowCount !== 0) throw new Error('Identidade já existente. Revise a identidade antes de vincular.');
      authId = randomUUID();
      await db.query(
        'INSERT INTO public."user" (id,name,email,"emailVerified",role) VALUES ($1,$2,$3,false,$4)',
        [authId,user.nome,user.email.trim().toLowerCase(),role]);
      await db.query(
        'INSERT INTO public.account (id,"accountId","userId","providerId",password,"updatedAt") VALUES ($1,$2,$2,$3,$4,now())',
        [randomUUID(),authId,'credential',hash]);
    } else {
      if (ids.rowCount !== 1 || ids.rows[0].id !== authId || ids.rows[0].role !== role || ids.rows[0].banned) {
        throw new Error('Identidade incompatível com a vinculação aprovada.');
      }
      const credential = await db.query(
        'SELECT 1 FROM public.account WHERE "userId"=$1 AND "providerId"=$2 AND password IS NOT NULL',
        [authId,'credential']);
      if (credential.rowCount !== 1) throw new Error('Credencial existente não elegível.');
    }
    await db.query('UPDATE public.usuario SET better_auth_user_id=$1 WHERE id=$2',[authId,usuarioId]);
    await db.query('COMMIT');
    console.log('Vinculação confirmada.');
  } catch (error) {
    await db.query('ROLLBACK').catch(()=>{});
    throw error;
  } finally {
    await db.end();
  }
}
run().catch(error => {
  // PostgreSQL details can include personally identifying values or hashes.
  console.error(error.code ? 'Vinculação recusada ('+error.code+').' : 'Vinculação recusada. Revise a elegibilidade.');
  process.exitCode = 1;
});
