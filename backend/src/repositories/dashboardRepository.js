import { pool } from '../config/database.js';
import { CODIGOS_PLANTAO } from '../services/distributionEngine.js';

export function horasDoTurnoSql(periodo = 'r') {
  return `(EXTRACT(EPOCH FROM (${periodo}.hora_fim - ${periodo}.hora_inicio
    + CASE WHEN ${periodo}.hora_fim <= ${periodo}.hora_inicio THEN interval '1 day' ELSE interval '0' END)) / 3600)`;
}

export function sumCotistaHours({ cotistaId, inicio, fim, statusEscala, statusParticipacao }) {
  return pool.query(`SELECT COALESCE(SUM(${horasDoTurnoSql('r')}),0)::float8 AS horas
    FROM participacao pa JOIN plantao p ON p.id=pa.plantao_id JOIN dia d ON d.id=p.dia_id
    JOIN escala e ON e.id=d.escala_id JOIN periodo r ON r.id=p.periodo_id
    WHERE pa.cotista_id=$1 AND d.data BETWEEN $2::date AND $3::date
      AND e.status=ANY($4::text[]) AND e.publicada_em IS NOT NULL
      AND pa.status=ANY($5::text[])`,
  [cotistaId, inicio, fim, statusEscala, statusParticipacao]);
}

export function findMonthIndicators({ ano, mes, statusEscala, statusParticipacao }) {
  return pool.query(`WITH esc AS (SELECT id,status,quantidade_cotas_padrao FROM escala WHERE ano=$1 AND mes=$2)
    SELECT esc.id AS "escalaId",esc.status AS "escalaStatus",esc.quantidade_cotas_padrao AS "cotasPorDia",
      (SELECT count(DISTINCT d.id) FROM dia d JOIN plantao p ON p.dia_id=d.id JOIN periodo r ON r.id=p.periodo_id
        WHERE d.escala_id=esc.id AND r.codigo=ANY($3::text[]) AND p.quantidade_necessaria>0)::int AS "diasComPlantao",
      (SELECT count(*) FROM disponibilidade a JOIN dia d ON d.id=a.dia_id
        WHERE d.escala_id=esc.id)::int AS solicitadas,
      (SELECT count(*) FROM participacao pa JOIN plantao p ON p.id=pa.plantao_id JOIN dia d ON d.id=p.dia_id
        WHERE d.escala_id=esc.id AND esc.status=ANY($4::text[]) AND pa.status=ANY($5::text[]))::int AS distribuidas
    FROM (SELECT 1) AS um LEFT JOIN esc ON true`,
  [ano, mes, CODIGOS_PLANTAO, statusEscala, statusParticipacao]);
}

export function findDropouts({ ano, mes }) {
  return pool.query(`SELECT a.id,a.acao,a.justificativa,a.realizado_em AS "realizadoEm",
      d.data::text AS data,r.codigo,ca.nome AS "cotistaNome",c.nome AS "substitutoNome",u.nome AS "registradoPor"
    FROM escala_ajuste a JOIN escala e ON e.id=a.escala_id
    LEFT JOIN plantao p ON p.id=a.plantao_id LEFT JOIN dia d ON d.id=p.dia_id
    LEFT JOIN periodo r ON r.id=p.periodo_id
    LEFT JOIN cotista ca ON ca.id=a.cotista_anterior_id LEFT JOIN cotista c ON c.id=a.cotista_id
    LEFT JOIN usuario u ON u.id=a.usuario_id
    WHERE e.ano=$1 AND e.mes=$2 AND a.acao IN ('remocao','substituicao') AND a.motivo='desistencia'
    ORDER BY a.realizado_em DESC,a.id DESC`,
  [ano, mes]);
}
