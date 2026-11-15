import { listCotistas,getCotista } from '../services/cotistaService.js';
import { positiveId } from '../services/workflowValidation.js';

export async function getCotistas(req,res) {
  res.set('Cache-Control','no-store');
  res.json(await listCotistas());
}

export async function getCotistaById(req,res) {
  res.set('Cache-Control','no-store');
  res.json(await getCotista(positiveId(req.params.id)));
}
