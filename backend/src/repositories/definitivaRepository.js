import { HttpError } from '../services/workflowValidation.js';

const scaleColumns = `id,nome,ano,mes,status,data_inicio::text AS "dataInicio",data_fim::text AS "dataFim",
  quantidade_cotas_padrao AS "quantidadeCotasPadrao",publicada_em AS "publicadaEm"`;

export function findScale(db, id) {
  return db.query(`SELECT ${scaleColumns} FROM escala WHERE id=$1`, [id]);
}

export function findScaleForUpdate(client, id) {
  return client.query(`SELECT ${scaleColumns} FROM escala WHERE id=$1 FOR UPDATE`, [id]);
}

export function findShiftsByScale(db, scaleId) {
  return db.query(`SELECT p.id,p.dia_id AS "diaId",d.data::text AS data,r.codigo,
      p.quantidade_necessaria AS "quantidadeNecessaria",p.status
    FROM plantao p JOIN dia d ON d.id=p.dia_id JOIN periodo r ON r.id=p.periodo_id
    WHERE d.escala_id=$1 AND r.codigo IN ('D','N1','N2') AND p.quantidade_necessaria>0
    ORDER BY d.data,r.codigo`, [scaleId]);
}

export function findShiftInScale(client, scaleId, shiftId) {
  return client.query(`SELECT p.id,p.dia_id AS "diaId",d.data::text AS data,r.codigo,
      p.quantidade_necessaria AS "quantidadeNecessaria"
    FROM plantao p JOIN dia d ON d.id=p.dia_id JOIN periodo r ON r.id=p.periodo_id
    WHERE p.id=$2 AND d.escala_id=$1 AND r.codigo IN ('D','N1','N2') FOR UPDATE OF p`, [scaleId, shiftId]);
}

export function findCandidatesByScale(db, scaleId) {
  return db.query(`SELECT a.cotista_id AS "cotistaId",a.dia_id AS "diaId",r.codigo,a.registrada_em AS "registradaEm",
      ba.patent AS patente
    FROM disponibilidade a JOIN dia d ON d.id=a.dia_id JOIN periodo r ON r.id=a.periodo_id
    JOIN cotista c ON c.id=a.cotista_id AND c.status='ativo'
    LEFT JOIN usuario u ON u.id=c.usuario_id
    LEFT JOIN public."user" ba ON ba.id=u.better_auth_user_id
    WHERE d.escala_id=$1`, [scaleId]);
}

export function findAssignmentsByScale(db, scaleId) {
  return db.query(`SELECT pa.id,pa.plantao_id AS "plantaoId",pa.cotista_id AS "cotistaId",c.nome AS "cotistaNome",
      pa.origem,pa.status,pa.observacao,pa.atribuida_em AS "atribuidaEm",d.data::text AS data,r.codigo
    FROM participacao pa JOIN plantao p ON p.id=pa.plantao_id JOIN dia d ON d.id=p.dia_id
    JOIN periodo r ON r.id=p.periodo_id JOIN cotista c ON c.id=pa.cotista_id
    WHERE d.escala_id=$1 AND pa.status<>'cancelada'
    ORDER BY d.data,r.codigo,c.nome`, [scaleId]);
}

export function deleteAutomaticAssignments(client, scaleId) {
  return client.query(`DELETE FROM participacao pa USING plantao p,dia d
    WHERE pa.plantao_id=p.id AND p.dia_id=d.id AND d.escala_id=$1 AND pa.origem='automatica'`, [scaleId]);
}

export function insertAutomaticAssignments(client, shiftIds, cotistaIds) {
  return client.query(`INSERT INTO participacao (plantao_id,cotista_id,origem,status)
    SELECT p,c,'automatica','pendente' FROM unnest($1::bigint[],$2::bigint[]) AS t(p,c)
    ON CONFLICT (cotista_id,plantao_id) DO UPDATE
      SET origem='automatica',status='pendente',observacao=NULL,atribuida_em=CURRENT_TIMESTAMP`,
  [shiftIds, cotistaIds]);
}

export function insertManualAssignment(client, shiftId, cotistaId, justification) {
  return client.query(`INSERT INTO participacao (plantao_id,cotista_id,origem,status,observacao)
    VALUES ($1,$2,'manual','pendente',$3)
    ON CONFLICT (cotista_id,plantao_id) DO UPDATE
      SET origem='manual',status='pendente',observacao=EXCLUDED.observacao,atribuida_em=CURRENT_TIMESTAMP
    RETURNING id`, [shiftId, cotistaId, justification]);
}

export function findAssignmentInScale(client, scaleId, assignmentId) {
  return client.query(`SELECT pa.id,pa.plantao_id AS "plantaoId",pa.cotista_id AS "cotistaId",pa.status
    FROM participacao pa JOIN plantao p ON p.id=pa.plantao_id JOIN dia d ON d.id=p.dia_id
    WHERE pa.id=$2 AND d.escala_id=$1 FOR UPDATE OF pa`, [scaleId, assignmentId]);
}

export function deleteAssignment(client, assignmentId) {
  return client.query('DELETE FROM participacao WHERE id=$1', [assignmentId]);
}

export function findActiveCotista(client, cotistaId) {
  return client.query("SELECT id,nome FROM cotista WHERE id=$1 AND status='ativo' FOR SHARE", [cotistaId]);
}

export function setPublication(client, scaleId, published) {
  return client.query(`UPDATE escala SET publicada_em=${published ? 'CURRENT_TIMESTAMP' : 'NULL'} WHERE id=$1
    RETURNING publicada_em AS "publicadaEm"`, [scaleId]);
}

export function insertAdjustment(client, { escalaId, acao, plantaoId = null, cotistaId = null,
  cotistaAnteriorId = null, justificativa = null, detalhes = null, usuarioId = null, motivo = null }) {
  const params = [escalaId, acao, plantaoId, cotistaId, cotistaAnteriorId, justificativa,
    detalhes === null ? null : JSON.stringify(detalhes), usuarioId];
  if (motivo === null) {
    return client.query(`INSERT INTO escala_ajuste
        (escala_id,acao,plantao_id,cotista_id,cotista_anterior_id,justificativa,detalhes,usuario_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, params);
  }
  return client.query(`INSERT INTO escala_ajuste
      (escala_id,acao,plantao_id,cotista_id,cotista_anterior_id,justificativa,detalhes,usuario_id,motivo)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [...params, motivo]).catch(error => {
    if (error.code === '42703') {
      throw new HttpError(503, 'Registro de desistência indisponível: aplique a migração 007 no banco.');
    }
    throw error;
  });
}

const adjustmentsQuery = motivo => `SELECT a.id,a.acao,${motivo},a.justificativa,a.detalhes,a.realizado_em AS "realizadoEm",
    d.data::text AS data,r.codigo,c.nome AS "cotistaNome",ca.nome AS "cotistaAnteriorNome",u.nome AS "usuarioNome"
  FROM escala_ajuste a
  LEFT JOIN plantao p ON p.id=a.plantao_id LEFT JOIN dia d ON d.id=p.dia_id
  LEFT JOIN periodo r ON r.id=p.periodo_id
  LEFT JOIN cotista c ON c.id=a.cotista_id LEFT JOIN cotista ca ON ca.id=a.cotista_anterior_id
  LEFT JOIN usuario u ON u.id=a.usuario_id
  WHERE a.escala_id=$1 ORDER BY a.realizado_em DESC,a.id DESC LIMIT 300`;

export function findAdjustments(db, scaleId) {
  return db.query(adjustmentsQuery('a.motivo'), [scaleId]).catch(error => {
    if (error.code === '42703') return db.query(adjustmentsQuery('NULL::varchar AS motivo'), [scaleId]);
    throw error;
  });
}

export function findLastDistribution(db, scaleId) {
  return db.query(`SELECT a.realizado_em AS "realizadoEm",a.detalhes,u.nome AS "usuarioNome"
    FROM escala_ajuste a LEFT JOIN usuario u ON u.id=a.usuario_id
    WHERE a.escala_id=$1 AND a.acao='distribuicao_automatica'
    ORDER BY a.realizado_em DESC,a.id DESC LIMIT 1`, [scaleId]);
}
