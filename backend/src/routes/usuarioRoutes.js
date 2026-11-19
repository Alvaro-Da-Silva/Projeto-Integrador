import { Router } from 'express';
import { authenticate,requireRole } from '../middleware/auth.js';
import { getUsuarios,getUsuarioById,postUsuario,patchConta,postSuspensao,postReativacao }
  from '../controllers/usuarioController.js';

const router = Router();
router.use(authenticate,requireRole('admin'));
router.get('/',getUsuarios);
router.post('/',postUsuario);
// :contaId é o id da identidade Better Auth (o mesmo que a listagem de usuários do frontend usa).
router.patch('/conta/:contaId',patchConta);
router.post('/conta/:contaId/suspensao',postSuspensao);
router.post('/conta/:contaId/reativacao',postReativacao);
router.get('/:id',getUsuarioById);

export default router;
