import { pool } from '../config/database.js';

const usuarioSelect = `SELECT u.id,u.nome,u.email,u.status,p.nome AS perfil,c.id AS "cotistaId"
  FROM usuario u JOIN perfil p ON p.id=u.perfil_id LEFT JOIN cotista c ON c.usuario_id=u.id`;

const contaColumns = `id,name,email,image,role,banned,patent,"createdAt"`;

export function findAllUsuarios() {
  return pool.query(`${usuarioSelect} ORDER BY u.id`);
}

export function findUsuarioById(id) {
  return pool.query(`${usuarioSelect} WHERE u.id=$1`,[id]);
}

// Provisionamento: todas as funções abaixo recebem o client da transação.

export function findIdentityConflicts(db,email) {
  return db.query(
    `SELECT (SELECT count(*) FROM public."user" WHERE lower(email)=lower($1))::int AS contas,
            (SELECT count(*) FROM public.usuario WHERE lower(email)=lower($1))::int AS usuarios,
            (SELECT count(*) FROM public.cotista WHERE lower(email)=lower($1))::int AS cotistas`,
    [email]);
}

export function findPerfilId(db,nome) {
  return db.query('SELECT id FROM public.perfil WHERE nome=$1',[nome]);
}

export function insertConta(db,{id,nome,email,role,patente}) {
  return db.query(
    `INSERT INTO public."user" (id,name,email,"emailVerified",role,banned,patent,"createdAt","updatedAt")
     VALUES ($1,$2,$3,false,$4,false,$5,now(),now()) RETURNING ${contaColumns}`,
    [id,nome,email,role,patente]);
}

export function insertCredencial(db,{id,contaId,hash}) {
  return db.query(
    `INSERT INTO public.account (id,"accountId","userId","providerId",password,"createdAt","updatedAt")
     VALUES ($1,$2,$2,'credential',$3,now(),now())`,
    [id,contaId,hash]);
}

export function insertUsuario(db,{nome,email,perfilId,contaId}) {
  return db.query(
    `INSERT INTO public.usuario (nome,email,perfil_id,status,better_auth_user_id)
     VALUES ($1,$2,$3,'ativo',$4) RETURNING id`,
    [nome,email,perfilId,contaId]);
}

export function insertCotista(db,{usuarioId,nome,email,telefone,dataNascimento}) {
  return db.query(
    `INSERT INTO public.cotista (usuario_id,nome,data_nascimento,telefone,email,status)
     VALUES ($1,$2,$3,$4,$5,'ativo')`,
    [usuarioId,nome,dataNascimento,telefone,email]);
}

// Manutenção de contas já vinculadas, identificadas pelo id do Better Auth.

export function lockUsuarioByContaId(db,contaId) {
  return db.query(
    `SELECT u.id,u.status,p.nome AS perfil,c.id AS "cotistaId",c.status AS "cotistaStatus"
       FROM public.usuario u JOIN public.perfil p ON p.id=u.perfil_id
       LEFT JOIN public.cotista c ON c.usuario_id=u.id
      WHERE u.better_auth_user_id=$1 FOR UPDATE OF u`,
    [contaId]);
}

export function updateContaCampos(db,contaId,{nome,patente,role}) {
  return db.query(
    `UPDATE public."user" SET
        name=CASE WHEN $2::boolean THEN $3 ELSE name END,
        patent=CASE WHEN $4::boolean THEN $5 ELSE patent END,
        role=CASE WHEN $6::boolean THEN $7 ELSE role END,
        "updatedAt"=now()
      WHERE id=$1`,
    [contaId,nome !== undefined,nome ?? null,patente !== undefined,patente ?? null,role !== undefined,role ?? null]);
}

export function updateUsuarioNome(db,usuarioId,nome) {
  return db.query('UPDATE public.usuario SET nome=$2 WHERE id=$1',[usuarioId,nome]);
}

export function updateCotistaNome(db,usuarioId,nome) {
  return db.query('UPDATE public.cotista SET nome=$2 WHERE usuario_id=$1',[usuarioId,nome]);
}

export function updateUsuarioPerfil(db,usuarioId,perfilId) {
  return db.query('UPDATE public.usuario SET perfil_id=$2 WHERE id=$1',[usuarioId,perfilId]);
}

export function updateCotistaStatus(db,usuarioId,status) {
  return db.query('UPDATE public.cotista SET status=$2 WHERE usuario_id=$1',[usuarioId,status]);
}

export function setContaBloqueio(db,contaId,banido) {
  return db.query(
    `UPDATE public."user" SET banned=$2,"banReason"=CASE WHEN $2 THEN 'Suspenso pelo administrador' END,
        "banExpires"=NULL,"updatedAt"=now() WHERE id=$1`,
    [contaId,banido]);
}

export function updateUsuarioStatus(db,usuarioId,status) {
  return db.query('UPDATE public.usuario SET status=$2 WHERE id=$1',[usuarioId,status]);
}

export function deleteSessoes(db,contaId) {
  return db.query('DELETE FROM public.session WHERE "userId"=$1',[contaId]);
}

export function findConta(db,contaId) {
  return db.query(`SELECT ${contaColumns} FROM public."user" WHERE id=$1`,[contaId]);
}
