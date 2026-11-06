import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { createMonthlyScale,changeScaleStatus,releaseDayShift,changeShiftStatus } from '../controllers/escalaController.js';

const router = Router();
const admin = [authenticate,requireRole('admin')];
router.post('/',...admin,createMonthlyScale);
router.patch('/:escalaId/status',...admin,changeScaleStatus);
router.put('/:escalaId/dias/:data/plantoes/:codigoPeriodo',...admin,releaseDayShift);
router.patch('/:escalaId/dias/:data/plantoes/:codigoPeriodo/status',...admin,changeShiftStatus);
export default router;
