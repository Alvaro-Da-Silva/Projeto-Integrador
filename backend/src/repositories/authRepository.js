import { pool } from '../config/database.js';

const userSelect = `SELECT u.id,u.nome,u.email,u.status,
  p.nome AS perfil,c.id AS "cotistaId",c.status AS "cotistaStatus"
  FROM usuario u JOIN perfil p ON p.id=u.perfil_id LEFT JOIN cotista c ON c.usuario_id=u.id`;

export function findUserByAuthId(authUserId, db = pool) {
  return db.query(`${userSelect} WHERE u.better_auth_user_id=$1 LIMIT 2`,[authUserId]);
}

export function findUserIdByAuthIdForUpdate(client, authUserId) {
  return client.query('SELECT id FROM usuario WHERE better_auth_user_id=$1 FOR UPDATE',[authUserId]);
}

export function insertUser(client, {nome,email,perfil,authUserId}) {
  return client.query(`INSERT INTO usuario (nome,email,perfil_id,better_auth_user_id)
    SELECT $1,$2,p.id,$4 FROM perfil p WHERE p.nome=$3 RETURNING id`,[nome,email,perfil,authUserId]);
}

export function updateUserProfile(client, id, {nome,email,perfil}) {
  return client.query(`UPDATE usuario u SET nome=$2,email=$3,perfil_id=p.id
    FROM perfil p WHERE p.nome=$4 AND u.id=$1
      AND (u.nome<>$2 OR u.email<>$3 OR u.perfil_id<>p.id)`,[id,nome,email,perfil]);
}

export function ensureCotista(client, usuarioId, {nome,email}) {
  return client.query(`INSERT INTO cotista (usuario_id,nome,email)
    SELECT $1,$2,$3 WHERE NOT EXISTS (SELECT 1 FROM cotista WHERE usuario_id=$1)`,[usuarioId,nome,email]);
}
