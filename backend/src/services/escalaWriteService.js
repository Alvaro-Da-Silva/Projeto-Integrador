import { transaction } from '../config/transaction.js';
import * as escalaRepository from '../repositories/escalaRepository.js';
import { calendarDate, HttpError, periodCode } from './workflowValidation.js';
import { getDailyQuotaDistribution } from './quotaDistributionService.js';

export async function lockedScale(client, id) {
  const result = await escalaRepository.findScaleForUpdate(client,id);
  if (!result.rowCount) throw new HttpError(404,'Escala não encontrada.');
  return result.rows[0];
}

export function releaseQuantities(quantidadeCotasPadrao) {
  const split = getDailyQuotaDistribution(quantidadeCotasPadrao);
  return split.supported
    ? {dia:split.diurnalQuotas,noite:split.nightQuotas}
    : {dia:quantidadeCotasPadrao,noite:quantidadeCotasPadrao};
}

export async function createScale({nome,ano,mes,quantidadeCotasPadrao,observacao,liberarTodosOsDias = true}) {
  const start = `${ano}-${String(mes).padStart(2,'0')}-01`;
  const last = new Date(Date.UTC(ano,mes,0)).getUTCDate();
  const end = `${ano}-${String(mes).padStart(2,'0')}-${last}`;
  return transaction(async client => {
    const result = await escalaRepository.insertScale(client,nome,ano,mes,start,end,quantidadeCotasPadrao,observacao);
    const scale = result.rows[0];
    let plantoesLiberados = 0;
    if (liberarTodosOsDias) {
      const {dia,noite} = releaseQuantities(quantidadeCotasPadrao);
      await escalaRepository.insertAllDays(client,scale.id,start,end);
      plantoesLiberados = (await escalaRepository.insertAllShifts(client,scale.id,dia,noite)).rowCount ?? 0;
    }
    return {...scale,plantoesLiberados};
  });
}

export async function setScaleStatus(id, status) {
  return transaction(async client => {
    const scale = await lockedScale(client,id);
    if (status === 'aberta' && scale.status !== 'aberta' && scale.publicadaEm) {
      throw new HttpError(409,'A escala já foi publicada e não pode ser reaberta. Retire a publicação antes.');
    }
    return (await escalaRepository.updateScaleStatus(client,id,status)).rows[0];
  });
}

export async function releaseShift(scaleId, date, code, quantity, observation) {
  calendarDate(date); periodCode(code,false);
  return transaction(async client => {
    const scale = await lockedScale(client,scaleId);
    if (scale.status !== 'aberta') throw new HttpError(409,'A escala não está aberta.');
    if (date < scale.dataInicio || date > scale.dataFim
        || Number(date.slice(0,4)) !== scale.ano || Number(date.slice(5,7)) !== scale.mes) {
      throw new HttpError(400,'Dia fora do mês ou intervalo da escala.');
    }
    const period = await escalaRepository.findActivePeriodForShare(client,code);
    if (!period.rowCount) throw new HttpError(409,'Período não cadastrado ou inativo. Execute a preparação dos períodos.');
    const day = await escalaRepository.upsertDay(client,scaleId,date);
    const shift = await escalaRepository.upsertReleasedShift(client,day.rows[0].id,period.rows[0].id,quantity,observation);
    return shift.rows[0];
  });
}

export async function releaseShifts(scaleId, dates, codes, quantity, observation) {
  return transaction(async client => {
    const scale = await lockedScale(client,scaleId);
    if (scale.status !== 'aberta') throw new HttpError(409,'A escala não está aberta.');
    for (const date of dates) {
      if (date < scale.dataInicio || date > scale.dataFim) throw new HttpError(400,`Dia ${date} fora do mês da escala.`);
    }
    const periods = new Map();
    for (const code of codes) {
      const period = await escalaRepository.findActivePeriodForShare(client,code);
      if (!period.rowCount) throw new HttpError(409,`Período ${code} não cadastrado ou inativo.`);
      periods.set(code,period.rows[0].id);
    }
    const plantoes = [];
    for (const date of dates) {
      const day = await escalaRepository.upsertDay(client,scaleId,date);
      for (const code of codes) {
        const shift = await escalaRepository.upsertReleasedShift(client,day.rows[0].id,periods.get(code),quantity,observation);
        plantoes.push({...shift.rows[0],data:date,codigoPeriodo:code});
      }
    }
    return {escalaId:scaleId,total:plantoes.length,plantoes};
  });
}

export async function setShiftStatus(scaleId,date,code,status) {
  calendarDate(date); periodCode(code,false);
  return transaction(async client => {
    await lockedScale(client,scaleId);
    const result = await escalaRepository.updateShiftStatus(client,scaleId,date,code,status);
    if (!result.rowCount) throw new HttpError(404,'Plantão não encontrado.');
    return result.rows[0];
  });
}
