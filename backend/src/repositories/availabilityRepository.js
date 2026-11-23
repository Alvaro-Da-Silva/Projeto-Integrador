import { pool } from '../config/database.js';

export function findActiveCotistaForUpdate(client,cotistaId) {
  return client.query("SELECT id FROM cotista WHERE id=$1 AND status='ativo' FOR UPDATE",[cotistaId]);
}

export function findDayById(client,dayId) {
  return client.query('SELECT id,escala_id AS "escalaId",data::text AS data FROM dia WHERE id=$1',[dayId]);
}

export function findActivePeriodForShare(client,code) {
  return client.query("SELECT id FROM periodo WHERE codigo=$1 AND status='ativo' FOR SHARE",[code]);
}

export function findReleasedShiftsForUpdate(client,dayId,codes) {
  return client.query(`SELECT p.id FROM plantao p JOIN periodo r ON r.id=p.periodo_id
      WHERE p.dia_id=$1 AND p.status='aberto' AND p.quantidade_necessaria>0 AND r.status='ativo'
      AND r.codigo=ANY($2::text[]) FOR UPDATE OF p`,[dayId,codes]);
}

export function findCurrentAvailabilityForUpdate(client,cotistaId,dayId) {
  return client.query('SELECT id,periodo_id FROM disponibilidade WHERE cotista_id=$1 AND dia_id=$2 FOR UPDATE',[cotistaId,dayId]);
}

export function updateAvailability(client,id,periodId,observation) {
  return client.query(`UPDATE disponibilidade SET periodo_id=$1,observacao=$2,registrada_em=CURRENT_TIMESTAMP
          WHERE id=$3 RETURNING id,cotista_id AS "cotistaId",dia_id AS "diaId",periodo_id AS "periodoId",observacao`,
          [periodId,observation,id]);
}

export function insertAvailability(client,cotistaId,dayId,periodId,observation) {
  return client.query(`INSERT INTO disponibilidade (cotista_id,dia_id,periodo_id,observacao)
          VALUES ($1,$2,$3,$4) RETURNING id,cotista_id AS "cotistaId",dia_id AS "diaId",periodo_id AS "periodoId",observacao`,
          [cotistaId,dayId,periodId,observation]);
}

export function findScaleById(scaleId) {
  return pool.query('SELECT id FROM escala WHERE id=$1',[scaleId]);
}

export function findAvailabilityByScale(scaleId,cotistaId) {
  return pool.query(`SELECT a.id,a.dia_id AS "diaId",d.data::text AS data,
    r.codigo AS "codigoPeriodo",a.periodo_id AS "periodoId",a.observacao,
    a.registrada_em AS "registradaEm",c.nome AS "cotistaNome"
    FROM disponibilidade a JOIN dia d ON d.id=a.dia_id
    JOIN periodo r ON r.id=a.periodo_id JOIN cotista c ON c.id=a.cotista_id
    WHERE d.escala_id=$1${cotistaId === undefined ? '' : ' AND a.cotista_id=$2'}
    ORDER BY d.data,a.id`,cotistaId === undefined ? [scaleId] : [scaleId,cotistaId]);
}

export function findAvailabilityByCotistaAndScale(cotistaId,scaleId) {
  return pool.query(`SELECT a.id,a.dia_id AS "diaId",d.data,r.codigo AS "codigoPeriodo",
    a.periodo_id AS "periodoId",a.observacao,a.registrada_em AS "registradaEm"
    FROM disponibilidade a JOIN dia d ON d.id=a.dia_id JOIN periodo r ON r.id=a.periodo_id
    WHERE a.cotista_id=$1 AND d.escala_id=$2 ORDER BY d.data,a.id`,[cotistaId,scaleId]);
}

export function findActivePeriodByIdForShare(client,periodId) {
  return client.query("SELECT id,codigo FROM periodo WHERE id=$1 AND status='ativo' FOR SHARE",[periodId]);
}

export function deleteCurrentAvailability(client,cotistaId,dayId) {
  return client.query('DELETE FROM disponibilidade WHERE cotista_id=$1 AND dia_id=$2 RETURNING id',[cotistaId,dayId]);
}
