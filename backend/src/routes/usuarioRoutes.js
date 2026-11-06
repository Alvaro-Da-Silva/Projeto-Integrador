import { Router } from 'express';
import { authenticate,requireRole } from '../middleware/auth.js';
import { getUsuarios,getUsuarioById } from '../controllers/usuarioController.js';

const router = Router();
router.use(authenticate,requireRole('admin'));
router.get('/',getUsuarios);
router.get('/:id',getUsuarioById);

export default router;
