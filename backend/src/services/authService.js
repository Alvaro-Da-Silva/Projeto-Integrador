import * as authRepository from '../repositories/authRepository.js';
import { HttpError } from './workflowValidation.js';

function toDomainUser(row) {
  if (row.status !== 'ativo' || !['admin','cotista'].includes(row.perfil)) {
    throw new HttpError(403,'Usuário inativo ou sem perfil autorizado.');
  }
  return {id:row.id,nome:row.nome,email:row.email,perfil:row.perfil,
    cotistaId:row.cotistaId,cotistaStatus:row.cotistaStatus};
}

function databaseUnavailable(error) {
  if (['42703','42P01','42501','25006'].includes(error.code)) {
    throw new HttpError(503,'Associação de identidade indisponível; configuração do banco pendente.');
  }
  if (error.code === '23505') {
    throw new HttpError(409,'Já existe um usuário SISCOTA com este e-mail vinculado a outra conta.');
  }
  throw error;
}

export async function authenticatedUser(authUserId) {
  if (typeof authUserId !== 'string' || !authUserId.length) throw new HttpError(401,'Sessão inválida.');
  let result;
  try { result = await authRepository.findUserByAuthId(authUserId); }
  catch (error) { databaseUnavailable(error); }
  if (result.rowCount !== 1) throw new HttpError(403,'Identidade sem usuário SISCOTA associado.');
  return toDomainUser(result.rows[0]);
}

export async function userFromFrontendToken(payload) {
  const authUserId = payload?.id ?? payload?.sub;
  if (typeof authUserId !== 'string' || typeof payload?.sid !== 'string') {
    throw new HttpError(401,'Sessão inválida.');
  }
  let session;
  try { session = await authRepository.findActiveAuthSession(payload.sid, authUserId); }
  catch (error) { databaseUnavailable(error); }
  if (session.rowCount !== 1) throw new HttpError(401,'Sessão inválida ou expirada.');
  return authenticatedUser(authUserId);
}
