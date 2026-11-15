import * as availabilityRepository from '../repositories/availabilityRepository.js';
import { transaction } from '../config/transaction.js';
import { lockedScale } from './escalaWriteService.js';
import { HttpError, periodCode } from './workflowValidation.js';

export async function saveAvailability(cotistaId,dayId,code,observation) {
  periodCode(code);
  return transaction(async client => {
    // Serializar escolhas do mesmo cotista. A UNIQUE existente permite varias
    // opcoes por dia; esta trava garante a regra aprovada de apenas uma opcao.
    const cotista = await availabilityRepository.findActiveCotistaForUpdate(client,cotistaId);
    if (!cotista.rowCount) throw new HttpError(403,'Cotista não encontrado ou inativo.');
    const day = await availabilityRepository.findDayById(client,dayId);
    if (!day.rowCount) throw new HttpError(404,'Dia não encontrado.');
    const scale = await lockedScale(client,day.rows[0].escalaId);
    if (scale.status !== 'aberta') throw new HttpError(409,'A escala não está aberta para preenchimento.');
    if (day.rows[0].data < scale.dataInicio || day.rows[0].data > scale.dataFim) {
      throw new HttpError(409,'Dia fora do intervalo da escala.');
    }
    const period = await availabilityRepository.findActivePeriodForShare(client,code);
    if (!period.rowCount) throw new HttpError(409,'Período não cadastrado ou inativo.');
    const released = await availabilityRepository.findReleasedShiftsForUpdate(client,dayId,code === 'I' ? ['D','N1','N2'] : [code]);
    if (!released.rowCount) throw new HttpError(409,'Dia/período não liberado pelo administrador.');
    // Uma preferencia nao confirma participacao, nao consome vaga nem limita
    // quantos cotistas podem candidatar-se. I e flexibilidade, nao plantao 24h.
    const current = await availabilityRepository.findCurrentAvailabilityForUpdate(client,cotistaId,dayId);
    if (current.rowCount > 1) throw new HttpError(409,'Há múltiplas escolhas antigas neste dia. Solicite revisão administrativa.');
    const result = current.rowCount
      ? await availabilityRepository.updateAvailability(client,current.rows[0].id,period.rows[0].id,observation)
      : await availabilityRepository.insertAvailability(client,cotistaId,dayId,period.rows[0].id,observation);
    return {...result.rows[0],codigoPeriodo:code};
  });
}

export async function listMyAvailability(cotistaId,scaleId) {
  const scale = await availabilityRepository.findScaleById(scaleId);
  if (!scale.rowCount) throw new HttpError(404,'Escala não encontrada.');
  const result = await availabilityRepository.findAvailabilityByCotistaAndScale(cotistaId,scaleId);
  return result.rows;
}

export async function listScaleAvailability(scaleId,cotistaId) {
  const scale = await availabilityRepository.findScaleById(scaleId);
  if (!scale.rowCount) throw new HttpError(404,'Escala não encontrada.');
  const result = await availabilityRepository.findAvailabilityByScale(scaleId,cotistaId);
  return result.rows;
}
