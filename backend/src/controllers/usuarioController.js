import { listUsuarios,getUsuario } from '../services/usuarioService.js';
import { positiveId } from '../services/workflowValidation.js';

export async function getUsuarios(req,res) {
  res.set('Cache-Control','no-store');
  res.json(await listUsuarios());
}

export async function getUsuarioById(req,res) {
  res.set('Cache-Control','no-store');
  res.json(await getUsuario(positiveId(req.params.id)));
}
