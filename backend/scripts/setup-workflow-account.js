import { hashPassword } from '../src/services/authService.js';
import { positiveId } from '../src/services/workflowValidation.js';
import { connectDevelopment,developmentEnv,developmentWrite,databaseError } from './development-db.js';

// Senha somente pelo ambiente, nunca em argumentos ou saida do terminal.
let client;
try {
  const role=developmentEnv.SETUP_PERFIL;
  const name=developmentEnv.SETUP_NOME?.trim();
  const email=developmentEnv.SETUP_EMAIL?.trim().toLowerCase();
  if (!['admin','cotista'].includes(role) || !name || name.length>200
      || !email || email.length>200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Configurar SETUP_PERFIL (admin/cotista), SETUP_NOME e SETUP_EMAIL.');
  }
  const cotistaId=role==='cotista' ? positiveId(developmentEnv.SETUP_COTISTA_ID) : null;
  const hash=await hashPassword(developmentEnv.SETUP_SENHA);
  client=await connectDevelopment();
  await client.query('BEGIN READ WRITE');
  const existing=await client.query('SELECT id FROM usuario WHERE lower(email)=$1',[email]);
  if(existing.rowCount) throw new Error('Email ja cadastrado; nenhuma conta ou senha existente alterada.');
  if(cotistaId) {
    const cotista=await client.query("SELECT id FROM cotista WHERE id=$1 AND usuario_id IS NULL AND status='ativo' FOR UPDATE",[cotistaId]);
    if(cotista.rowCount!==1) throw new Error('Cotista inexistente, inativo ou ja vinculado a usuario.');
  }
  await developmentWrite(client,'INSERT INTO perfil (nome) VALUES ($1) ON CONFLICT (nome) DO NOTHING',[role]);
  const profile=await client.query('SELECT id FROM perfil WHERE nome=$1',[role]);
  const user=await developmentWrite(client,`INSERT INTO usuario (nome,email,senha_hash,perfil_id)
    VALUES ($1,$2,$3,$4) RETURNING id,nome,email`,[name,email,hash,profile.rows[0].id]);
  if(cotistaId) await developmentWrite(client,'UPDATE cotista SET usuario_id=$1 WHERE id=$2',[user.rows[0].id,cotistaId]);
  await developmentWrite(client,'COMMIT');
  console.log(JSON.stringify({banco:'siscota',usuario:{...user.rows[0],perfil:role,cotistaId}},null,2));
} catch(error) {
  if(client) await client.query('ROLLBACK').catch(()=>{});
  console.error(JSON.stringify(databaseError(error))); process.exitCode=1;
} finally {if(client) await client.end();}
