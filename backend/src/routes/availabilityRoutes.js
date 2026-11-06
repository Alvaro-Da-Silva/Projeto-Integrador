import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { saveAvailability,listMyAvailability } from '../services/availabilityService.js';
import { objectBody,optionalObservation,periodCode,positiveId } from '../services/workflowValidation.js';

const router = Router();
router.use(authenticate,requireRole('cotista'));
router.get('/',async(req,res)=> {
  res.set('Cache-Control','no-store');
  res.json(await listMyAvailability(req.user.cotistaId,positiveId(req.query.escalaId)));
});
router.put('/:diaId',async(req,res)=> {
  const b = objectBody(req.body,['codigoPeriodo','observacao']);
  res.json(await saveAvailability(req.user.cotistaId,positiveId(req.params.diaId),
    periodCode(b.codigoPeriodo),optionalObservation(b.observacao)));
});
export default router;
