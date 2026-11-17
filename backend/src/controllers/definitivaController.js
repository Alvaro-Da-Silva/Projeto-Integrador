import {
  assignManually,
  confirmDistribution,
  getDefinitiveScale,
  listAdjustments,
  removeAssignment,
  setPublished,
  simulateDistribution
} from '../services/definitivaService.js';
import { HttpError, objectBody, positiveId } from '../services/workflowValidation.js';

function justification(value) {
  if (typeof value !== 'string' || value.trim().length < 3 || value.trim().length > 1000) {
    throw new HttpError(400, 'Informe uma justificativa de 3 a 1000 caracteres.');
  }
  return value.trim();
}

function dropout(value) {
  if (value === undefined) return false;
  if (typeof value !== 'boolean') throw new HttpError(400, 'desistencia deve ser verdadeiro ou falso.');
  return value;
}

export async function getDefinitive(req, res) {
  res.set('Cache-Control', 'no-store');
  res.json(await getDefinitiveScale(positiveId(req.params.escalaId), req.user));
}

export async function runDistribution(req, res) {
  const b = objectBody(req.body ?? {}, ['simular']);
  if (b.simular !== undefined && typeof b.simular !== 'boolean') throw new HttpError(400, 'simular deve ser verdadeiro ou falso.');
  const scaleId = positiveId(req.params.escalaId);
  res.json(b.simular === false ? await confirmDistribution(scaleId, req.user.id) : await simulateDistribution(scaleId));
}

export async function createAssignment(req, res) {
  const b = objectBody(req.body, ['plantaoId', 'cotistaId', 'substituirParticipacaoId', 'justificativa', 'desistencia']);
  res.status(201).json(await assignManually(positiveId(req.params.escalaId), {
    plantaoId: positiveId(b.plantaoId),
    cotistaId: positiveId(b.cotistaId),
    substituirParticipacaoId: b.substituirParticipacaoId == null ? null : positiveId(b.substituirParticipacaoId),
    justificativa: justification(b.justificativa),
    desistencia: dropout(b.desistencia)
  }, req.user.id));
}

export async function deleteAssignment(req, res) {
  const b = objectBody(req.body ?? {}, ['justificativa', 'desistencia']);
  await removeAssignment(positiveId(req.params.escalaId), positiveId(req.params.participacaoId),
    justification(b.justificativa), req.user.id, dropout(b.desistencia));
  res.status(204).end();
}

export async function changePublication(req, res) {
  const b = objectBody(req.body, ['publicada']);
  if (typeof b.publicada !== 'boolean') throw new HttpError(400, 'publicada deve ser verdadeiro ou falso.');
  res.json(await setPublished(positiveId(req.params.escalaId), b.publicada, req.user.id));
}

export async function getAdjustments(req, res) {
  res.set('Cache-Control', 'no-store');
  res.json(await listAdjustments(positiveId(req.params.escalaId)));
}
