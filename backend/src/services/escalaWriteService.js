import { transaction } from '../config/transaction.js';
import * as escalaRepository from '../repositories/escalaRepository.js';
import { calendarDate, HttpError, periodCode } from './workflowValidation.js';
import { getDailyQuotaDistribution } from './quotaDistributionService.js';
import { limitesDoDia, MAX_COTAS_POR_DIA, MAX_N2_POR_DIA } from './distributionEngine.js';

export async function lockedScale(client, id) {
  const result = await escalaRepository.findScaleForUpdate(client,id);
  if (!result.rowCount) throw new HttpError(404,'Escala não encontrada.');
  return result.rows[0];
}

export function releaseQuantities(quantidadeCotasPadrao) {
  const split = getDailyQuotaDistribution(quantidadeCotasPadrao);
  const {dia,noite} = split.supported
    ? {dia:split.diurnalQuotas,noite:split.nightQuotas}
    : {dia:quantidadeCotasPadrao,noite:quantidadeCotasPadrao};
  return {dia,noite,n2:Math.min(noite,MAX_N2_POR_DIA)};
}

function shiftQuantity(code, quantity) {
  return code === 'N2' ? Math.min(quantity,MAX_N2_POR_DIA) : quantity;
}

function requireQuantityAllowed(code, quantity) {
  if (code === 'N2' && quantity > MAX_N2_POR_DIA) {
    throw new HttpError(400,`O N2 aceita no máximo ${MAX_N2_POR_DIA} cotista por dia. Para 2 vagas noturnas use N1 (N1+N1 ou N1+N2).`);
  }
}

async function requireDayWithinLimit(client, dayId, date) {
  const shifts = (await escalaRepository.findDayShiftQuantities(client,dayId)).rows;
  const limites = limitesDoDia(shifts);
  const total = limites.D + limites.noite;
  if (total > MAX_COTAS_POR_DIA) {
    throw new HttpError(400,`O dia ${date} ficaria com ${total} cotas (D ${limites.D} + noite ${limites.noite}). `
      + `O máximo é ${MAX_COTAS_POR_DIA} cotas por dia.`);
  }
}

export async function createScale({nome,ano,mes,quantidadeCotasPadrao,observacao,liberarTodosOsDias = true}) {
  if (quantidadeCotasPadrao > MAX_COTAS_POR_DIA) {
    throw new HttpError(400,`O máximo é ${MAX_COTAS_POR_DIA} cotas por dia.`);
  }
  const start = `${ano}-${String(mes).padStart(2,'0')}-01`;
  const last = new Date(Date.UTC(ano,mes,0)).getUTCDate();
  const end = `${ano}-${String(mes).padStart(2,'0')}-${last}`;
  return transaction(async client => {
    const result = await escalaRepository.insertScale(client,nome,ano,mes,start,end,quantidadeCotasPadrao,observacao);
    const scale = result.rows[0];
    let plantoesLiberados = 0;
    if (liberarTodosOsDias) {
      const {dia,noite,n2} = releaseQuantities(quantidadeCotasPadrao);
      await escalaRepository.insertAllDays(client,scale.id,start,end);
      plantoesLiberados = (await escalaRepository.insertAllShifts(client,scale.id,dia,noite,n2)).rowCount ?? 0;
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
  requireQuantityAllowed(code,quantity);
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
    await requireDayWithinLimit(client,day.rows[0].id,date);
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
        const shift = await escalaRepository.upsertReleasedShift(client,day.rows[0].id,periods.get(code),
          shiftQuantity(code,quantity),observation);
        plantoes.push({...shift.rows[0],data:date,codigoPeriodo:code});
      }
      await requireDayWithinLimit(client,day.rows[0].id,date);
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
