import { pool } from '../config/database.js';

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

export function findScaleByPeriod(year, month) {
  return pool.query(scaleQuery, [year, month]);
}

export function findDaysByScale(scaleId) {
  return pool.query(daysQuery, [scaleId]);
}

export function findPeriods() {
  return pool.query(periodsQuery);
}

export function findShiftsByDayIds(dayIds) {
  return pool.query(shiftsQuery, [dayIds]);
}
