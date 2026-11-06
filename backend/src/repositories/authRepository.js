import { pool } from '../config/database.js';

const userSelect = `SELECT u.id,u.nome,u.email,u.senha_hash AS "senhaHash",u.status,
  p.nome AS perfil,c.id AS "cotistaId",c.status AS "cotistaStatus"
  FROM usuario u JOIN perfil p ON p.id=u.perfil_id LEFT JOIN cotista c ON c.usuario_id=u.id`;

export function findUserById(id) {
  return pool.query(`${userSelect} WHERE u.id=$1`,[id]);
}

export function findUsersByEmail(email) {
  return pool.query(`${userSelect} WHERE lower(u.email)=$1 LIMIT 2`,[email]);
}
