import { pool } from '../config/database.js';
import { transaction } from '../config/transaction.js';
import * as repo from '../repositories/definitivaRepository.js';
import { conflitaHorario, distribuir, limitesDoDia, motivoSemVaga, totalVagas as contarVagas,
  vagasEfetivas } from './distributionEngine.js';
import { HttpError } from './workflowValidation.js';

async function scaleOr404(db, id, lock = false) {
  const result = lock ? await repo.findScaleForUpdate(db, id) : await repo.findScale(db, id);
  if (!result.rowCount) throw new HttpError(404, 'Escala não encontrada.');
  return result.rows[0];
}

function requireEditable(scale) {
  if (scale.status === 'aberta') {
    throw new HttpError(409, 'Feche a escala (encerre o período de disponibilidades) antes de alterar a escala definitiva.');
  }
  if (scale.status === 'encerrada') throw new HttpError(409, 'A escala está encerrada e não pode mais ser alterada.');
}

async function loadInputs(db, scale) {
  const plantoes = await repo.findShiftsByScale(db, scale.id);
  const candidatos = await repo.findCandidatesByScale(db, scale.id);
  const atribuicoes = await repo.findAssignmentsByScale(db, scale.id);
  return {
    plantoes: plantoes.rows,
    disponibilidades: candidatos.rows,
    atribuicoes: atribuicoes.rows
  };
}

function runEngine({ plantoes, disponibilidades, atribuicoes }) {
  const fixas = atribuicoes.filter(a => a.origem === 'manual');
  const resultado = distribuir({ plantoes, disponibilidades, fixas });
  const totalVagas = contarVagas(plantoes);
  const preenchidas = Math.min(totalVagas, fixas.length + resultado.atribuicoes.length);
  return {
    ...resultado,
    resumo: {
      plantoes: plantoes.length,
      totalVagas,
      vagasPreenchidas: preenchidas,
      vagasEmAberto: totalVagas - preenchidas,
      plantoesNaoPreenchidos: resultado.naoPreenchidos.length,
      disputas: resultado.disputas.length,
      ajustesManuaisPreservados: fixas.length,
      participantes: Object.keys(resultado.servicosPorCotista).length,
      candidatos: new Set(disponibilidades.map(d => String(d.cotistaId))).size
    }
  };
}

async function describe(resultado, plantoes) {
  const ids = [...new Set([
    ...resultado.atribuicoes.map(a => a.cotistaId),
    ...resultado.disputas.flatMap(d => d.naoSelecionados),
    ...Object.keys(resultado.servicosPorCotista)
  ])];
  const nomes = new Map();
  if (ids.length) {
    const { rows } = await pool.query('SELECT id,nome FROM cotista WHERE id=ANY($1::bigint[])', [ids]);
    for (const row of rows) nomes.set(String(row.id), row.nome);
  }
  const plantaoPorId = new Map(plantoes.map(p => [String(p.id), p]));
  return {
    ...resultado,
    atribuicoes: resultado.atribuicoes.map(a => ({ ...a, cotistaNome: nomes.get(a.cotistaId) ?? null,
      data: plantaoPorId.get(a.plantaoId)?.data, codigo: plantaoPorId.get(a.plantaoId)?.codigo })),
    disputas: resultado.disputas.map(d => ({ ...d,
      naoSelecionados: d.naoSelecionados.map(id => ({ cotistaId: id, cotistaNome: nomes.get(id) ?? null })) })),
    servicosPorCotista: Object.entries(resultado.servicosPorCotista)
      .map(([cotistaId, total]) => ({ cotistaId, cotistaNome: nomes.get(cotistaId) ?? null, total }))
      .sort((a, b) => b.total - a.total || String(a.cotistaNome).localeCompare(String(b.cotistaNome)))
  };
}

export async function simulateDistribution(scaleId) {
  const scale = await scaleOr404(pool, scaleId);
  if (scale.status === 'encerrada') throw new HttpError(409, 'A escala está encerrada e não pode mais ser redistribuída.');
  const inputs = await loadInputs(pool, scale);
  const resultado = runEngine(inputs);
  const avisos = [];
  if (scale.status === 'aberta') avisos.push('A escala ainda está aberta: as disponibilidades podem mudar até o fechamento.');
  if (scale.publicadaEm) avisos.push('A escala já foi publicada. Despublique-a para gerar uma nova distribuição.');
  return { simulacao: true, escala: scale, avisos, ...(await describe(resultado, inputs.plantoes)) };
}

export async function confirmDistribution(scaleId, usuarioId) {
  const { resultado, plantoes, scale } = await transaction(async client => {
    const scale = await scaleOr404(client, scaleId, true);
    requireEditable(scale);
    if (scale.publicadaEm) {
      throw new HttpError(409, 'A escala já foi publicada. Despublique-a para gerar uma nova distribuição, ou faça ajustes manuais.');
    }
    const inputs = await loadInputs(client, scale);
    if (!inputs.plantoes.length) throw new HttpError(409, 'A escala não possui plantões liberados.');
    const resultado = runEngine(inputs);

    await repo.deleteAutomaticAssignments(client, scale.id);
    if (resultado.atribuicoes.length) {
      await repo.insertAutomaticAssignments(client,
        resultado.atribuicoes.map(a => a.plantaoId), resultado.atribuicoes.map(a => a.cotistaId));
    }
    await repo.insertAdjustment(client, { escalaId: scale.id, acao: 'distribuicao_automatica', usuarioId,
      detalhes: { resumo: resultado.resumo, criterios: resultado.criterios.map(c => c.id),
        naoPreenchidos: resultado.naoPreenchidos.map(({ plantaoId, faltam, motivo }) => ({ plantaoId, faltam, motivo })) } });
    return { resultado, plantoes: inputs.plantoes, scale };
  });
  return { simulacao: false, escala: scale, avisos: [], ...(await describe(resultado, plantoes)) };
}

function situacao(vagas, atribuidos) {
  if (!vagas && !atribuidos) return 'opcional';
  if (!atribuidos) return 'nao_preenchido';
  return atribuidos >= vagas ? 'preenchido' : 'parcial';
}

function vagasPorPlantao(plantoes, porPlantao) {
  const porDia = new Map();
  for (const p of plantoes) {
    const dia = String(p.diaId);
    if (!porDia.has(dia)) porDia.set(dia, []);
    porDia.get(dia).push(p);
  }
  const vagas = new Map();
  for (const plantoesDia of porDia.values()) {
    const ocupacao = new Map(plantoesDia.map(p => [p.codigo, (porPlantao.get(String(p.id)) ?? []).length]));
    for (const [id, qtd] of vagasEfetivas(plantoesDia, ocupacao)) vagas.set(id, qtd);
  }
  return vagas;
}

export async function getDefinitiveScale(scaleId, user) {
  const scale = await scaleOr404(pool, scaleId);
  const admin = user.perfil === 'admin';
  const visivel = admin || (scale.publicadaEm && scale.status !== 'aberta');
  const base = { escala: scale, publicada: Boolean(scale.publicadaEm), meuCotistaId: admin ? null : user.cotistaId ?? null };
  if (!visivel) return { ...base, plantoes: [], resumo: null, ultimaDistribuicao: null };

  const [plantoes, atribuicoes, ultima] = await Promise.all([
    repo.findShiftsByScale(pool, scale.id),
    repo.findAssignmentsByScale(pool, scale.id),
    admin ? repo.findLastDistribution(pool, scale.id) : { rows: [] }
  ]);

  const porPlantao = new Map();
  for (const a of atribuicoes.rows) {
    const key = String(a.plantaoId);
    if (!porPlantao.has(key)) porPlantao.set(key, []);
    porPlantao.get(key).push({ id: a.id, cotistaId: a.cotistaId, cotistaNome: a.cotistaNome, origem: a.origem,
      ...(admin ? { observacao: a.observacao, atribuidaEm: a.atribuidaEm } : {}) });
  }

  const vagas = vagasPorPlantao(plantoes.rows, porPlantao);
  const lista = plantoes.rows.map(p => {
    const atribuidos = porPlantao.get(String(p.id)) ?? [];
    const vagasPlantao = vagas.get(String(p.id)) ?? p.quantidadeNecessaria;
    return { id: p.id, diaId: p.diaId, data: p.data, codigoPeriodo: p.codigo,
      quantidadeNecessaria: p.quantidadeNecessaria, vagas: vagasPlantao,
      situacao: situacao(vagasPlantao, atribuidos.length), atribuicoes: atribuidos };
  });

  const totalVagas = lista.reduce((s, p) => s + p.vagas, 0);
  const preenchidas = lista.reduce((s, p) => s + Math.min(p.atribuicoes.length, p.vagas), 0);
  return {
    ...base,
    plantoes: lista,
    resumo: {
      plantoes: lista.length,
      totalVagas,
      vagasPreenchidas: preenchidas,
      vagasEmAberto: totalVagas - preenchidas,
      plantoesPreenchidos: lista.filter(p => p.situacao === 'preenchido').length,
      plantoesParciais: lista.filter(p => p.situacao === 'parcial').length,
      plantoesNaoPreenchidos: lista.filter(p => p.situacao === 'nao_preenchido').length,
      participantes: new Set(atribuicoes.rows.map(a => String(a.cotistaId))).size,
      atribuicoesManuais: atribuicoes.rows.filter(a => a.origem === 'manual').length,
      atribuicoes: atribuicoes.rows.length
    },
    ultimaDistribuicao: ultima.rows[0] ?? null
  };
}

export async function assignManually(scaleId, { plantaoId, cotistaId, substituirParticipacaoId, justificativa,
  desistencia = false }, usuarioId) {
  if (desistencia && !substituirParticipacaoId) {
    throw new HttpError(400, 'Desistência só se aplica ao substituir um cotista.');
  }
  return transaction(async client => {
    const scale = await scaleOr404(client, scaleId, true);
    requireEditable(scale);

    const shiftResult = await repo.findShiftInScale(client, scale.id, plantaoId);
    if (!shiftResult.rowCount) throw new HttpError(404, 'Plantão não encontrado nesta escala.');
    const plantao = shiftResult.rows[0];

    const cotista = await repo.findActiveCotista(client, cotistaId);
    if (!cotista.rowCount) throw new HttpError(404, 'Cotista não encontrado ou inativo.');

    let substituido = null;
    if (substituirParticipacaoId) {
      const result = await repo.findAssignmentInScale(client, scale.id, substituirParticipacaoId);
      if (!result.rowCount || String(result.rows[0].plantaoId) !== String(plantao.id)) {
        throw new HttpError(404, 'Atribuição a substituir não encontrada neste plantão.');
      }
      substituido = result.rows[0];
      if (String(substituido.cotistaId) === String(cotistaId)) throw new HttpError(400, 'Escolha um cotista diferente do atual.');
    }

    const atuais = (await repo.findAssignmentsByScale(client, scale.id)).rows
      .filter(a => !substituido || String(a.id) !== String(substituido.id));
    const doPlantao = atuais.filter(a => String(a.plantaoId) === String(plantao.id));

    if (doPlantao.some(a => String(a.cotistaId) === String(cotistaId))) {
      throw new HttpError(409, 'Este cotista já está atribuído a este plantão.');
    }
    const plantoesDia = (await repo.findShiftsByScale(client, scale.id)).rows
      .filter(p => String(p.diaId) === String(plantao.diaId));
    const ocupacao = new Map(plantoesDia.map(p => [p.codigo,
      atuais.filter(a => String(a.plantaoId) === String(p.id)).length]));
    const semVaga = motivoSemVaga(limitesDoDia(plantoesDia), ocupacao, plantao.codigo);
    if (semVaga) throw new HttpError(409, semVaga);

    const doCotista = atuais.filter(a => String(a.cotistaId) === String(cotistaId));
    const conflito = doCotista.find(a => conflitaHorario(a, plantao));
    if (conflito) {
      throw new HttpError(409, `Conflito de horário: o cotista já está no plantão ${conflito.codigo} de ${conflito.data}.`);
    }
    const avisos = doCotista.filter(a => a.data === plantao.data)
      .map(a => `O cotista também está no plantão ${a.codigo} deste dia.`);

    if (substituido) await repo.deleteAssignment(client, substituido.id);
    const inserted = await repo.insertManualAssignment(client, plantao.id, cotistaId, justificativa);
    await repo.insertAdjustment(client, { escalaId: scale.id, acao: substituido ? 'substituicao' : 'atribuicao_manual',
      plantaoId: plantao.id, cotistaId, cotistaAnteriorId: substituido?.cotistaId ?? null, justificativa, usuarioId,
      motivo: desistencia ? 'desistencia' : null });

    return { id: inserted.rows[0].id, plantaoId: plantao.id, cotistaId, cotistaNome: cotista.rows[0].nome, avisos };
  });
}

export async function removeAssignment(scaleId, participacaoId, justificativa, usuarioId, desistencia = false) {
  return transaction(async client => {
    const scale = await scaleOr404(client, scaleId, true);
    requireEditable(scale);
    const result = await repo.findAssignmentInScale(client, scale.id, participacaoId);
    if (!result.rowCount) throw new HttpError(404, 'Atribuição não encontrada nesta escala.');
    const atual = result.rows[0];
    await repo.deleteAssignment(client, atual.id);
    await repo.insertAdjustment(client, { escalaId: scale.id, acao: 'remocao', plantaoId: atual.plantaoId,
      cotistaAnteriorId: atual.cotistaId, justificativa, usuarioId, motivo: desistencia ? 'desistencia' : null });
  });
}

export async function setPublished(scaleId, publicada, usuarioId) {
  return transaction(async client => {
    const scale = await scaleOr404(client, scaleId, true);
    if (publicada && scale.status === 'aberta') {
      throw new HttpError(409, 'Feche a escala antes de publicá-la.');
    }
    if (!publicada && scale.status === 'encerrada') {
      throw new HttpError(409, 'A escala está encerrada; a publicação não pode ser retirada.');
    }
    if (Boolean(scale.publicadaEm) === publicada) return { publicadaEm: scale.publicadaEm };
    const result = await repo.setPublication(client, scale.id, publicada);
    await repo.insertAdjustment(client, { escalaId: scale.id, acao: publicada ? 'publicacao' : 'despublicacao', usuarioId });
    return result.rows[0];
  });
}

export async function listAdjustments(scaleId) {
  await scaleOr404(pool, scaleId);
  return (await repo.findAdjustments(pool, scaleId)).rows;
}
