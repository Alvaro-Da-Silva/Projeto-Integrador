import { listUsuarios,getUsuario,provisionarUsuario,atualizarConta,definirSuspensao } from '../services/usuarioService.js';
import { positiveId } from '../services/workflowValidation.js';

export async function getUsuarios(req,res) {
  res.set('Cache-Control','no-store');
  res.json(await listUsuarios());
}

export async function getUsuarioById(req,res) {
  res.set('Cache-Control','no-store');
  res.json(await getUsuario(positiveId(req.params.id)));
}

export async function postUsuario(req,res) {
  res.status(201).json(await provisionarUsuario(req.body));
}

export async function patchConta(req,res) {
  res.json(await atualizarConta(req.params.contaId,req.body,req.user));
}

export async function postSuspensao(req,res) {
  res.json(await definirSuspensao(req.params.contaId,true,req.user));
}

export async function postReativacao(req,res) {
  res.json(await definirSuspensao(req.params.contaId,false,req.user));
}
