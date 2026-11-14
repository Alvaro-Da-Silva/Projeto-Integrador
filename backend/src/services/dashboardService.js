import {
  COTAS_POR_DIA,
  FUSO_HORARIO,
  META_HORAS_SEMESTRE,
  SEMESTRES,
  STATUS_ESCALA_DEFINITIVA,
  STATUS_PARTICIPACAO_DEFINITIVA
} from '../config/dashboard.js';
import * as repo from '../repositories/dashboardRepository.js';
import { HttpError } from './workflowValidation.js';

const pad = value => String(value).padStart(2, '0');
const diasNoMes = (ano, mes) => new Date(Date.UTC(ano, mes, 0)).getUTCDate();

export function anoMesAtual(agora = new Date()) {
  const partes = new Intl.DateTimeFormat('en-US', { timeZone: FUSO_HORARIO, year: 'numeric', month: 'numeric' })
    .formatToParts(agora);
  const valor = tipo => Number(partes.find(p => p.type === tipo).value);
  return { ano: valor('year'), mes: valor('month') };
}

export function semestreAtual(agora = new Date()) {
  const { ano, mes } = anoMesAtual(agora);
  const semestre = SEMESTRES.find(s => mes >= s.mesInicio && mes <= s.mesFim);
  if (!semestre) throw new HttpError(500, 'Definição de semestre não cobre o mês atual.');
  return {
    ano,
    numero: semestre.numero,
    inicio: `${ano}-${pad(semestre.mesInicio)}-01`,
    fim: `${ano}-${pad(semestre.mesFim)}-${pad(diasNoMes(ano, semestre.mesFim))}`
  };
}

export async function getCotistaDashboard(cotistaId, agora = new Date()) {
  const semestre = semestreAtual(agora);
  const { rows } = await repo.sumCotistaHours({ cotistaId, inicio: semestre.inicio, fim: semestre.fim,
    statusEscala: STATUS_ESCALA_DEFINITIVA, statusParticipacao: STATUS_PARTICIPACAO_DEFINITIVA });
  const horasConquistadas = rows[0].horas;
  return {
    horasConquistadas,
    metaHoras: META_HORAS_SEMESTRE,
    horasFaltantes: Math.max(0, META_HORAS_SEMESTRE - horasConquistadas),
    semestre
  };
}

async function desistenciasDoMes(ano, mes) {
  try {
    const { rows } = await repo.findDropouts({ ano, mes });
    return { total: rows.length, lista: rows, disponivel: true };
  } catch (error) {
    if (error.code === '42703') return { total: 0, lista: [], disponivel: false };
    throw error;
  }
}

export async function getCoordenadorDashboard({ ano, mes }) {
  const [{ rows: [mesAtual] }, desistencias] = await Promise.all([
    repo.findMonthIndicators({ ano, mes, statusEscala: STATUS_ESCALA_DEFINITIVA,
      statusParticipacao: STATUS_PARTICIPACAO_DEFINITIVA }),
    desistenciasDoMes(ano, mes)
  ]);
  const temEscala = Boolean(mesAtual.escalaId);
  return {
    mes: `${ano}-${pad(mes)}`,
    escala: temEscala ? { id: mesAtual.escalaId, status: mesAtual.escalaStatus } : null,
    totalCotas: temEscala ? mesAtual.diasComPlantao * mesAtual.cotasPorDia : diasNoMes(ano, mes) * COTAS_POR_DIA,
    totalCotasEstimado: !temEscala,
    solicitadas: temEscala ? mesAtual.solicitadas : 0,
    distribuidas: temEscala ? mesAtual.distribuidas : 0,
    desistencias: desistencias.total,
    desistenciasLista: desistencias.lista,
    desistenciasDisponivel: desistencias.disponivel
  };
}
