import * as cotistaRepository from '../repositories/cotistaRepository.js';
import { HttpError } from './workflowValidation.js';

function publicCotista(row) {
  return {id:row.id,usuarioId:row.usuarioId,nome:row.nome,
    dataNascimento:row.dataNascimento,telefone:row.telefone,email:row.email,
    status:row.status,observacao:row.observacao};
}

export async function listCotistas() {
  const { rows } = await cotistaRepository.findAllCotistas();
  return rows.map(publicCotista);
}

export async function getCotista(id) {
  const { rows } = await cotistaRepository.findCotistaById(id);
  if (!rows.length) throw new HttpError(404,'Cotista não encontrado.');
  return publicCotista(rows[0]);
}
