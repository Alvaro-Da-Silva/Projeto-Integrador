import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { getMyAvailability,saveMyAvailability } from '../controllers/availabilityController.js';

const router = Router();
router.use(authenticate,requireRole('cotista'));
router.get('/',getMyAvailability);
router.put('/:diaId',saveMyAvailability);
export default router;
