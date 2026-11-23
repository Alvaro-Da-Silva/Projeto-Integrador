import { saveAvailability,listMyAvailability,listScaleAvailability,deleteAvailability } from '../services/availabilityService.js';
import { objectBody,optionalObservation,periodCode,positiveId } from '../services/workflowValidation.js';

export async function getMyAvailability(req,res) {
  res.set('Cache-Control','no-store');
  res.json(await listMyAvailability(req.user.cotistaId,positiveId(req.query.escalaId)));
}

export async function getScaleAvailability(req,res) {
  const scaleId = positiveId(req.params.escalaId);
  const cotistaId = req.query.cotistaId === undefined ? undefined : positiveId(req.query.cotistaId);
  res.set('Cache-Control','no-store');
  res.json(await listScaleAvailability(scaleId,cotistaId));
}

export async function saveMyAvailability(req,res) {
  const b = objectBody(req.body,['codigoPeriodo','observacao']);
  res.json(await saveAvailability(req.user.cotistaId,positiveId(req.params.diaId),
    periodCode(b.codigoPeriodo),optionalObservation(b.observacao)));
}

export async function deleteMyAvailability(req,res) {
  await deleteAvailability(req.user.cotistaId,positiveId(req.params.diaId));
  res.status(204).end();
}
