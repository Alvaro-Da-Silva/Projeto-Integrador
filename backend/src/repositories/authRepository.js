import { pool } from '../config/database.js';

const userSelect = `SELECT u.id,u.nome,u.email,u.status,
  p.nome AS perfil,c.id AS "cotistaId",c.status AS "cotistaStatus"
  FROM usuario u JOIN perfil p ON p.id=u.perfil_id LEFT JOIN cotista c ON c.usuario_id=u.id`;

export function findUserByAuthId(authUserId) {
  return pool.query(`${userSelect} WHERE u.better_auth_user_id=$1 LIMIT 2`,[authUserId]);
}
