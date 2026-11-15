import { pool } from '../config/database.js';

const usuarioSelect = `SELECT u.id,u.nome,u.email,u.status,p.nome AS perfil,c.id AS "cotistaId"
  FROM usuario u JOIN perfil p ON p.id=u.perfil_id LEFT JOIN cotista c ON c.usuario_id=u.id`;

export function findAllUsuarios() {
  return pool.query(`${usuarioSelect} ORDER BY u.id`);
}

export function findUsuarioById(id) {
  return pool.query(`${usuarioSelect} WHERE u.id=$1`,[id]);
}
