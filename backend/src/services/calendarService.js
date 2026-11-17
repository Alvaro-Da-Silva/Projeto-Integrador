import * as calendarRepository from '../repositories/calendarRepository.js';
import { getDailyQuotaDistribution } from './quotaDistributionService.js';
import { availabilityOptions } from './availabilityOptions.js';

export async function getMonthlyCalendar(year, month) {
  const scaleResult = await calendarRepository.findScaleByPeriod(year, month);
  const escala = scaleResult.rows[0];

  if (!escala) return null;

  const daysResult = await calendarRepository.findDaysByScale(escala.id);
  const dias = daysResult.rows;
  const dayIds = dias.map(day => day.id);

  const [periodsResult, shiftsResult] = await Promise.all([
    calendarRepository.findPeriods(),
    dayIds.length ? calendarRepository.findShiftsByDayIds(dayIds) : { rows: [] }
  ]);

  const plantoesPorDia = new Map(dias.map(day => [String(day.id), []]));
  for (const plantao of shiftsResult.rows) {
    plantoesPorDia.get(String(plantao.diaId))?.push(plantao);
  }

  return {
    escala,
    dias: dias.map(day => {
      const result = { ...day, plantoes: plantoesPorDia.get(String(day.id)) };
      const opcoesDisponibilidade = availabilityOptions(escala,result,periodsResult.rows);
      return { ...result, opcoesDisponibilidade, liberadoParaPreenchimento:opcoesDisponibilidade.length>0 };
    }),
    periodos: periodsResult.rows,
    distribuicaoDiariaPadrao: getDailyQuotaDistribution(escala.quantidadeCotasPadrao)
  };
}
