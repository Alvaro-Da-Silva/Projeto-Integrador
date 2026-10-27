import { Router } from 'express';
import { getMonthlyCalendar } from '../services/calendarService.js';

const router = Router();

function parsePeriodParams(ano, mes) {
  const year = Number(ano);
  const month = Number(mes);

  if (!Number.isInteger(year) || year < 2000 || year > 9999) {
    return { error: 'Ano inválido. Informe um ano entre 2000 e 9999.' };
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return { error: 'Mês inválido. Informe um mês entre 1 e 12.' };
  }

  return { year, month };
}

router.get('/:ano/:mes/calendario', async (req, res) => {
  const params = parsePeriodParams(req.params.ano, req.params.mes);

  if (params.error) {
    return res.status(400).json({ error: params.error });
  }

  try {
    const calendar = await getMonthlyCalendar(params.year, params.month);

    if (!calendar) {
      return res.status(404).json({ error: 'Escala não encontrada para o período informado.' });
    }

    return res.json(calendar);
  } catch {
    return res.status(500).json({ error: 'Não foi possível consultar o calendário.' });
  }
});

export default router;
export { parsePeriodParams };
