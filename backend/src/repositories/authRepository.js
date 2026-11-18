import { pool } from '../config/database.js';

const userSelect = `SELECT u.id,u.nome,u.email,u.status,
  p.nome AS perfil,c.id AS "cotistaId",c.status AS "cotistaStatus"
  FROM usuario u JOIN perfil p ON p.id=u.perfil_id LEFT JOIN cotista c ON c.usuario_id=u.id`;

export function findUserByAuthId(authUserId, db = pool) {
  return db.query(`${userSelect} WHERE u.better_auth_user_id=$1 LIMIT 2`,[authUserId]);
}

export function findActiveAuthSession(sessionId, userId) {
  return pool.query(
    'SELECT 1 FROM public.session WHERE id=$1 AND "userId"=$2 AND "expiresAt">CURRENT_TIMESTAMP',
    [sessionId,userId]
  );
}
