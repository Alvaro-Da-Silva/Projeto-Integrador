import { saveAvailability,listMyAvailability } from '../services/availabilityService.js';
import { objectBody,optionalObservation,periodCode,positiveId } from '../services/workflowValidation.js';

export async function getMyAvailability(req,res) {
  res.set('Cache-Control','no-store');
  res.json(await listMyAvailability(req.user.cotistaId,positiveId(req.query.escalaId)));
}

export async function saveMyAvailability(req,res) {
  const b = objectBody(req.body,['codigoPeriodo','observacao']);
  res.json(await saveAvailability(req.user.cotistaId,positiveId(req.params.diaId),
    periodCode(b.codigoPeriodo),optionalObservation(b.observacao)));
}
