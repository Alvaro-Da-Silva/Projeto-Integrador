import { Router } from 'express';
import { getCalendar } from '../controllers/escalaController.js';

const router = Router();

router.get('/:ano/:mes/calendario',getCalendar);

export default router;
export { parsePeriodParams } from '../controllers/escalaController.js';
