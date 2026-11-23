import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { getMyAvailability,saveMyAvailability,deleteMyAvailability } from '../controllers/availabilityController.js';

const router = Router();
router.use(authenticate,requireRole('cotista'));
router.get('/',getMyAvailability);
router.put('/:diaId',saveMyAvailability);
router.delete('/:diaId',deleteMyAvailability);
export default router;
