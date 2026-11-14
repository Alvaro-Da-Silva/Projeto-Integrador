import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { getScaleAvailability } from '../controllers/availabilityController.js';
import { createMonthlyScale,changeScaleStatus,releaseDayShift,releaseShiftsBatch,changeShiftStatus } from '../controllers/escalaController.js';
import { changePublication,createAssignment,deleteAssignment,getAdjustments,getDefinitive,runDistribution } from '../controllers/definitivaController.js';

const router = Router();
const admin = [authenticate,requireRole('admin')];
router.get('/:escalaId/disponibilidades',...admin,getScaleAvailability);
router.post('/',...admin,createMonthlyScale);
router.patch('/:escalaId/status',...admin,changeScaleStatus);
router.put('/:escalaId/dias/:data/plantoes/:codigoPeriodo',...admin,releaseDayShift);
router.put('/:escalaId/plantoes',...admin,releaseShiftsBatch);
router.patch('/:escalaId/dias/:data/plantoes/:codigoPeriodo/status',...admin,changeShiftStatus);

router.get('/:escalaId/definitiva',authenticate,getDefinitive);
router.post('/:escalaId/distribuicao',...admin,runDistribution);
router.post('/:escalaId/participacoes',...admin,createAssignment);
router.delete('/:escalaId/participacoes/:participacaoId',...admin,deleteAssignment);
router.patch('/:escalaId/publicacao',...admin,changePublication);
router.get('/:escalaId/ajustes',...admin,getAdjustments);
export default router;
