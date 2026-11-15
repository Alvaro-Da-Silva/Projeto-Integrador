import { availabilityCodes,shiftCodes } from './workflowValidation.js';

export function availabilityOptions(scale,day,periods) {
  const date = new Date(day.data).getTime();
  if (scale.status !== 'aberta' || !Number.isFinite(date)
      || date < new Date(scale.dataInicio).getTime() || date > new Date(scale.dataFim).getTime()) return [];
  const periodMap = new Map(periods.filter(p=>p.status==='ativo').map(p=>[String(p.id),p.codigo]));
  const codes = new Set((day.plantoes || []).filter(p=>p.status==='aberto' && p.quantidadeNecessaria>0)
    .map(p=>periodMap.get(String(p.periodoId))).filter(code=>shiftCodes.includes(code)));
  if (codes.size && periods.some(p=>p.codigo==='I' && p.status==='ativo')) codes.add('I');
  return availabilityCodes.filter(code=>codes.has(code));
}
