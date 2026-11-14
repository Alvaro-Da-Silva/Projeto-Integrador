import * as authRepository from '../repositories/authRepository.js';
import { transaction } from '../config/transaction.js';
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

export function perfilFromRole(role) {
  return String(role ?? '').split(',').map(r => r.trim()).includes('admin') ? 'admin' : 'cotista';
}

export async function userFromFrontendToken(payload) {
  const authUserId = payload?.id ?? payload?.sub;
  const email = typeof payload?.email === 'string' ? payload.email.trim() : '';
  if (typeof authUserId !== 'string' || !authUserId || !email) throw new HttpError(401,'Sessão inválida.');
  const data = {
    authUserId, email: email.slice(0,200),
    nome: (typeof payload.name === 'string' && payload.name.trim() ? payload.name.trim() : email).slice(0,200),
    perfil: perfilFromRole(payload.role)
  };
  try {
    return await transaction(async client => {
      const existing = await authRepository.findUserIdByAuthIdForUpdate(client,authUserId);
      let usuarioId;
      if (existing.rowCount) {
        usuarioId = existing.rows[0].id;
        await authRepository.updateUserProfile(client,usuarioId,data);
      } else {
        const inserted = await authRepository.insertUser(client,data);
        if (!inserted.rowCount) throw new HttpError(503,'Perfis SISCOTA não cadastrados. Execute npm run setup:local.');
        usuarioId = inserted.rows[0].id;
      }
      if (data.perfil === 'cotista') await authRepository.ensureCotista(client,usuarioId,data);
      const result = await authRepository.findUserByAuthId(authUserId,client);
      return toDomainUser(result.rows[0]);
    });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    return databaseUnavailable(error);
  }
}
