import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { getCoordenador, getCotista } from '../controllers/dashboardController.js';

const router = Router();
router.use(authenticate);
router.get('/cotista', requireRole('cotista'), getCotista);
router.get('/coordenador', requireRole('admin'), getCoordenador);

export default router;
