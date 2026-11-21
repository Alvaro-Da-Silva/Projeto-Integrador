import { randomUUID } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import * as usuarioRepository from '../repositories/usuarioRepository.js';
import { transaction } from '../config/transaction.js';
import { PATENTES } from '../config/patentes.js';
import { HttpError, calendarDate, objectBody } from './workflowValidation.js';

const PERFIS = ['admin','cotista'];
// O Better Auth guarda o papel em "user".role; o domínio usa perfil. Os dois andam juntos.
const ROLE_DO_PERFIL = {admin:'admin',cotista:'user'};
const PERFIL_DA_ROLE = {admin:'admin',user:'cotista'};

function publicUsuario(row) {
  return {id:row.id,nome:row.nome,email:row.email,perfil:row.perfil,
    status:row.status,cotistaId:row.cotistaId};
}

function publicConta(row) {
  return {id:row.id,name:row.name,email:row.email,image:row.image,role:row.role,
    banned:row.banned,patent:row.patent,createdAt:row.createdAt};
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

function nome(value) {
  const texto = typeof value === 'string' ? value.trim().replace(/\s+/g,' ') : '';
  if (texto.length < 3 || texto.length > 200) throw new HttpError(400,'Nome deve ter entre 3 e 200 caracteres.');
  return texto;
}

function email(value) {
  const texto = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (texto.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto)) throw new HttpError(400,'E-mail inválido.');
  return texto;
}

function senha(value) {
  if (typeof value !== 'string' || value.length < 12 || value.length > 256) {
    throw new HttpError(400,'A senha deve ter entre 12 e 256 caracteres.');
  }
  return value;
}

function patente(value) {
  if (value === null) return null;
  if (!PATENTES.includes(value)) throw new HttpError(400,'Patente inválida.');
  return value;
}

function perfil(value) {
  if (!PERFIS.includes(value)) throw new HttpError(400,'Perfil inválido. Use admin ou cotista.');
  return value;
}

function telefone(value) {
  const texto = typeof value === 'string' ? value.trim() : '';
  const digitos = texto.replace(/\D/g,'').length;
  if (texto.length > 20 || !/^[0-9()+\-\s]+$/.test(texto) || digitos < 10 || digitos > 13) {
    throw new HttpError(400,'Telefone inválido. Informe DDD e número.');
  }
  return texto;
}

function dataNascimento(value) {
  const data = calendarDate(value);
  const hoje = new Date().toISOString().slice(0,10);
  if (data < '1900-01-01' || data >= hoje) throw new HttpError(400,'Data de nascimento inválida.');
  return data;
}

function erroDeBanco(error) {
  if (error instanceof HttpError) throw error;
  if (error.code === '23505') throw new HttpError(409,'Já existe uma conta com este e-mail.');
  if (error.code === '42501') {
    throw new HttpError(503,'O banco ainda não concede permissão para gerenciar contas. Aplique as permissões revisadas.');
  }
  throw error;
}

async function perfilId(db,nomePerfil) {
  const { rows } = await usuarioRepository.findPerfilId(db,nomePerfil);
  if (!rows.length) throw new HttpError(503,`Perfil ${nomePerfil} não cadastrado no banco.`);
  return rows[0].id;
}

/**
 * Cria, numa única transação, a identidade Better Auth (user + credencial), o usuário SISCOTA
 * com o perfil escolhido e, para cotistas, o cadastro de cotista. Nada é gravado se uma etapa falhar.
 */
export async function provisionarUsuario(body) {
  objectBody(body,['nome','email','senha','patente','perfil','telefone','dataNascimento']);
  const dados = {nome:nome(body.nome),email:email(body.email),senha:senha(body.senha),
    patente:patente(body.patente ?? null),perfil:perfil(body.perfil)};
  if (dados.perfil === 'cotista') {
    dados.telefone = telefone(body.telefone);
    dados.dataNascimento = dataNascimento(body.dataNascimento);
  }
  const hash = await hashPassword(dados.senha);

  try {
    return await transaction(async db => {
      const { rows: [conflitos] } = await usuarioRepository.findIdentityConflicts(db,dados.email);
      if (conflitos.contas || conflitos.usuarios) throw new HttpError(409,'Já existe uma conta com este e-mail.');
      if (dados.perfil === 'cotista' && conflitos.cotistas) {
        throw new HttpError(409,'Já existe um cotista com este e-mail. Vincule a conta ao cadastro existente em vez de duplicá-lo.');
      }

      const contaId = randomUUID();
      const { rows: [conta] } = await usuarioRepository.insertConta(db,{id:contaId,nome:dados.nome,
        email:dados.email,role:ROLE_DO_PERFIL[dados.perfil],patente:dados.patente});
      await usuarioRepository.insertCredencial(db,{id:randomUUID(),contaId,hash});
      const { rows: [usuario] } = await usuarioRepository.insertUsuario(db,{nome:dados.nome,email:dados.email,
        perfilId:await perfilId(db,dados.perfil),contaId});
      if (dados.perfil === 'cotista') {
        await usuarioRepository.insertCotista(db,{usuarioId:usuario.id,nome:dados.nome,email:dados.email,
          telefone:dados.telefone,dataNascimento:dados.dataNascimento});
      }
      return publicConta(conta);
    });
  } catch (error) { erroDeBanco(error); }
}

async function usuarioVinculado(db,contaId) {
  const { rows } = await usuarioRepository.lockUsuarioByContaId(db,contaId);
  if (!rows.length) {
    throw new HttpError(404,'Esta conta não tem usuário SISCOTA vinculado. Vincule-a pelo provisionamento supervisionado.');
  }
  return rows[0];
}

function contaId(value) {
  if (typeof value !== 'string' || !value.length || value.length > 200) throw new HttpError(400,'Conta inválida.');
  return value;
}

async function contaAtualizada(db,id) {
  const { rows } = await usuarioRepository.findConta(db,id);
  return publicConta(rows[0]);
}

export async function atualizarConta(rawId,body,ator) {
  const id = contaId(rawId);
  objectBody(body,['nome','patente','role']);
  const dados = {};
  if (body.nome !== undefined) dados.nome = nome(body.nome);
  if (body.patente !== undefined) dados.patente = patente(body.patente);
  if (body.role !== undefined) {
    if (!PERFIL_DA_ROLE[body.role]) throw new HttpError(400,'Função inválida. Use admin ou user.');
    dados.role = body.role;
  }
  if (!Object.keys(dados).length) throw new HttpError(400,'Nenhuma alteração informada.');

  try {
    return await transaction(async db => {
      const usuario = await usuarioVinculado(db,id);
      const novoPerfil = dados.role && PERFIL_DA_ROLE[dados.role];

      if (novoPerfil && novoPerfil !== usuario.perfil) {
        if (String(usuario.id) === String(ator.id)) throw new HttpError(409,'Você não pode alterar a sua própria função.');
        if (novoPerfil === 'cotista' && !usuario.cotistaId) {
          throw new HttpError(409,'Este administrador não tem cadastro de cotista (telefone e nascimento). Crie uma conta de cotista para ele.');
        }
        await usuarioRepository.updateUsuarioPerfil(db,usuario.id,await perfilId(db,novoPerfil));
        if (usuario.cotistaId) {
          await usuarioRepository.updateCotistaStatus(db,usuario.id,novoPerfil === 'cotista' ? 'ativo' : 'inativo');
        }
      }

      await usuarioRepository.updateContaCampos(db,id,dados);
      if (dados.nome) {
        await usuarioRepository.updateUsuarioNome(db,usuario.id,dados.nome);
        await usuarioRepository.updateCotistaNome(db,usuario.id,dados.nome);
      }
      return contaAtualizada(db,id);
    });
  } catch (error) { erroDeBanco(error); }
}

export async function definirSuspensao(rawId,suspender,ator) {
  const id = contaId(rawId);
  try {
    return await transaction(async db => {
      const usuario = await usuarioVinculado(db,id);
      if (suspender && String(usuario.id) === String(ator.id)) {
        throw new HttpError(409,'Você não pode suspender a sua própria conta.');
      }
      await usuarioRepository.setContaBloqueio(db,id,suspender);
      await usuarioRepository.updateUsuarioStatus(db,usuario.id,suspender ? 'desativado' : 'ativo');
      if (suspender) await usuarioRepository.deleteSessoes(db,id);
      return contaAtualizada(db,id);
    });
  } catch (error) { erroDeBanco(error); }
}
