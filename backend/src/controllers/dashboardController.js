import { z } from 'zod';
import { anoMesAtual, getCoordenadorDashboard, getCotistaDashboard } from '../services/dashboardService.js';
import { HttpError } from '../services/workflowValidation.js';

const coordenadorQuery = z.object({
  mes: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mês inválido. Use YYYY-MM.')
    .refine(value => Number(value.slice(0, 4)) >= 2000, 'Mês inválido. Use YYYY-MM a partir de 2000.')
    .optional()
}).strict();

export async function getCotista(req, res) {
  res.set('Cache-Control', 'no-store');
  res.json(await getCotistaDashboard(req.user.cotistaId));
}

export async function getCoordenador(req, res) {
  const parsed = coordenadorQuery.safeParse(req.query);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Parâmetros inválidos.');
  const { mes } = parsed.data;
  const periodo = mes ? { ano: Number(mes.slice(0, 4)), mes: Number(mes.slice(5, 7)) } : anoMesAtual();
  res.set('Cache-Control', 'no-store');
  res.json(await getCoordenadorDashboard(periodo));
}
