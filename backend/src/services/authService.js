import * as authRepository from '../repositories/authRepository.js';
import { HttpError } from './workflowValidation.js';

export async function authenticatedUser(authUserId) {
  if (typeof authUserId !== 'string' || !authUserId.length) throw new HttpError(401,'Sessão inválida.');
  let result;
  try { result = await authRepository.findUserByAuthId(authUserId); }
  catch (error) {
    if (['42703','42P01','42501','25006'].includes(error.code)) {
      throw new HttpError(503,'Associação de identidade indisponível; configuração do banco pendente.');
    }
    throw error;
  }
  if (result.rowCount !== 1) throw new HttpError(403,'Identidade sem usuário SISCOTA associado.');
  const row = result.rows[0];
  if (row.status !== 'ativo' || !['admin','cotista'].includes(row.perfil)) {
    throw new HttpError(403,'Usuário inativo ou sem perfil autorizado.');
  }
  return {id:row.id,nome:row.nome,email:row.email,perfil:row.perfil,
    cotistaId:row.cotistaId,cotistaStatus:row.cotistaStatus};
}
