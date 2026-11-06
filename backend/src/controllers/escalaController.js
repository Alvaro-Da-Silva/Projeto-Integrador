import { getMonthlyCalendar } from '../services/calendarService.js';
import { createScale,releaseShift,setScaleStatus,setShiftStatus } from '../services/escalaWriteService.js';
import { calendarDate,HttpError,objectBody,optionalObservation,periodCode,positiveId,positiveInteger } from '../services/workflowValidation.js';

export function parsePeriodParams(ano, mes) {
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

export async function getCalendar(req, res) {
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
}

export async function createMonthlyScale(req,res) {
  const b = objectBody(req.body,['nome','ano','mes','quantidadeCotasPadrao','observacao']);
  if (typeof b.nome !== 'string' || !b.nome.trim() || b.nome.trim().length>100
      || !Number.isInteger(b.ano) || b.ano<2000 || b.ano>9999
      || !Number.isInteger(b.mes) || b.mes<1 || b.mes>12) {
    throw new HttpError(400,'Informe nome, ano (2000–9999) e mês (1–12) válidos.');
  }
  const quantity = positiveInteger(b.quantidadeCotasPadrao,'quantidadeCotasPadrao');
  res.status(201).json(await createScale({nome:b.nome.trim(),ano:b.ano,mes:b.mes,
    quantidadeCotasPadrao:quantity,observacao:optionalObservation(b.observacao)}));
}

export async function changeScaleStatus(req,res) {
  const b = objectBody(req.body,['status']);
  if (!['aberta','fechada','encerrada'].includes(b.status)) throw new HttpError(400,'Status de escala inválido.');
  res.json(await setScaleStatus(positiveId(req.params.escalaId),b.status));
}

export async function releaseDayShift(req,res) {
  const b = objectBody(req.body,['quantidadeNecessaria','observacao']);
  res.json(await releaseShift(positiveId(req.params.escalaId),calendarDate(req.params.data),
    periodCode(req.params.codigoPeriodo,false),positiveInteger(b.quantidadeNecessaria,'quantidadeNecessaria'),
    optionalObservation(b.observacao)));
}

export async function changeShiftStatus(req,res) {
  const b = objectBody(req.body,['status']);
  if (!['aberto','encerrado'].includes(b.status)) throw new HttpError(400,'Use aberto ou encerrado.');
  res.json(await setShiftStatus(positiveId(req.params.escalaId),calendarDate(req.params.data),
    periodCode(req.params.codigoPeriodo,false),b.status));
}
