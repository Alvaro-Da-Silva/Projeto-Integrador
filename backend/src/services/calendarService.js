import { pool } from '../config/database.js';
import { getDailyQuotaDistribution } from './quotaDistributionService.js';
import { availabilityOptions } from './availabilityOptions.js';

const scaleQuery = `
  SELECT
    id,
    nome,
    mes,
    ano,
    data_inicio AS "dataInicio",
    data_fim AS "dataFim",
    status,
    observacao,
    criada_em AS "criadaEm",
    quantidade_cotas_padrao AS "quantidadeCotasPadrao"
  FROM escala
  WHERE ano = $1 AND mes = $2
`;

const daysQuery = `
  SELECT
    id,
    escala_id AS "escalaId",
    data
  FROM dia
  WHERE escala_id = $1
  ORDER BY data, id
`;

const periodsQuery = `
  SELECT
    id,
    codigo,
    nome,
    descricao,
    hora_inicio AS "horaInicio",
    hora_fim AS "horaFim",
    status
  FROM periodo
  ORDER BY codigo, id
`;

const shiftsQuery = `
  SELECT
    id,
    dia_id AS "diaId",
    periodo_id AS "periodoId",
    quantidade_necessaria AS "quantidadeNecessaria",
    status,
    observacao,
    criado_em AS "criadoEm"
  FROM plantao
  WHERE dia_id = ANY($1::bigint[])
  ORDER BY dia_id, periodo_id, id
`;

export async function getMonthlyCalendar(year, month) {
  const scaleResult = await pool.query(scaleQuery, [year, month]);
  const escala = scaleResult.rows[0];

  if (!escala) return null;

  const daysResult = await pool.query(daysQuery, [escala.id]);
  const dias = daysResult.rows;
  const dayIds = dias.map(day => day.id);

  const [periodsResult, shiftsResult] = await Promise.all([
    pool.query(periodsQuery),
    dayIds.length ? pool.query(shiftsQuery, [dayIds]) : { rows: [] }
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
