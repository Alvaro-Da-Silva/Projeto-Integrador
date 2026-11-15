import { Router } from 'express';
import { getCalendar } from '../controllers/escalaController.js';

const router = Router();

router.get('/:ano/:mes/calendario',getCalendar);

export default router;
// Compatibilidade com os imports existentes, inclusive nos testes.
export { parsePeriodParams } from '../controllers/escalaController.js';
