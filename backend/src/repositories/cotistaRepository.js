import { pool } from '../config/database.js';

const cotistaSelect = `SELECT id,usuario_id AS "usuarioId",nome,
  data_nascimento AS "dataNascimento",telefone,email,status,observacao FROM cotista`;

export function findAllCotistas() {
  return pool.query(`${cotistaSelect} ORDER BY id`);
}

export function findCotistaById(id) {
  return pool.query(`${cotistaSelect} WHERE id=$1`,[id]);
}
