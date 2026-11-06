import * as usuarioRepository from '../repositories/usuarioRepository.js';
import { HttpError } from './workflowValidation.js';

function publicUsuario(row) {
  return {id:row.id,nome:row.nome,email:row.email,perfil:row.perfil,
    status:row.status,cotistaId:row.cotistaId};
}

export async function listUsuarios() {
  const { rows } = await usuarioRepository.findAllUsuarios();
  return rows.map(publicUsuario);
}

export async function getUsuario(id) {
  const { rows } = await usuarioRepository.findUsuarioById(id);
  if (!rows.length) throw new HttpError(404,'Usuário não encontrado.');
  return publicUsuario(rows[0]);
}
