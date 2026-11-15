import { Router } from 'express';
import { authenticate,requireRole } from '../middleware/auth.js';
import { getCotistas,getCotistaById } from '../controllers/cotistaController.js';

const router = Router();
router.use(authenticate,requireRole('admin'));
router.get('/',getCotistas);
router.get('/:id',getCotistaById);

export default router;
