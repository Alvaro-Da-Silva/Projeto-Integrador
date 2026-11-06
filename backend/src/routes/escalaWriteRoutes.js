import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { createScale,releaseShift,setScaleStatus,setShiftStatus } from '../services/escalaWriteService.js';
import { calendarDate,HttpError,objectBody,optionalObservation,periodCode,positiveId,positiveInteger } from '../services/workflowValidation.js';

const router = Router();
const admin = [authenticate,requireRole('admin')];
router.post('/',...admin,async(req,res)=> {
  const b = objectBody(req.body,['nome','ano','mes','quantidadeCotasPadrao','observacao']);
  if (typeof b.nome !== 'string' || !b.nome.trim() || b.nome.trim().length>100
      || !Number.isInteger(b.ano) || b.ano<2000 || b.ano>9999
      || !Number.isInteger(b.mes) || b.mes<1 || b.mes>12) {
    throw new HttpError(400,'Informe nome, ano (2000–9999) e mês (1–12) válidos.');
  }
  const quantity = positiveInteger(b.quantidadeCotasPadrao,'quantidadeCotasPadrao');
  res.status(201).json(await createScale({nome:b.nome.trim(),ano:b.ano,mes:b.mes,
    quantidadeCotasPadrao:quantity,observacao:optionalObservation(b.observacao)}));
});
router.patch('/:escalaId/status',...admin,async(req,res)=> {
  const b = objectBody(req.body,['status']);
  if (!['aberta','fechada','encerrada'].includes(b.status)) throw new HttpError(400,'Status de escala inválido.');
  res.json(await setScaleStatus(positiveId(req.params.escalaId),b.status));
});
router.put('/:escalaId/dias/:data/plantoes/:codigoPeriodo',...admin,async(req,res)=> {
  const b = objectBody(req.body,['quantidadeNecessaria','observacao']);
  res.json(await releaseShift(positiveId(req.params.escalaId),calendarDate(req.params.data),
    periodCode(req.params.codigoPeriodo,false),positiveInteger(b.quantidadeNecessaria,'quantidadeNecessaria'),
    optionalObservation(b.observacao)));
});
router.patch('/:escalaId/dias/:data/plantoes/:codigoPeriodo/status',...admin,async(req,res)=> {
  const b = objectBody(req.body,['status']);
  if (!['aberto','encerrado'].includes(b.status)) throw new HttpError(400,'Use aberto ou encerrado.');
  res.json(await setShiftStatus(positiveId(req.params.escalaId),calendarDate(req.params.data),
    periodCode(req.params.codigoPeriodo,false),b.status));
});
export default router;
