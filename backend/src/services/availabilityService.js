import { pool } from '../config/database.js';
import { transaction } from '../config/transaction.js';
import { lockedScale } from './escalaWriteService.js';
import { HttpError, periodCode } from './workflowValidation.js';

export async function saveAvailability(cotistaId,dayId,code,observation) {
  periodCode(code);
  return transaction(async client => {
    // Serializar escolhas do mesmo cotista. A UNIQUE existente permite varias
    // opcoes por dia; esta trava garante a regra aprovada de apenas uma opcao.
    const cotista = await client.query("SELECT id FROM cotista WHERE id=$1 AND status='ativo' FOR UPDATE",[cotistaId]);
    if (!cotista.rowCount) throw new HttpError(403,'Cotista não encontrado ou inativo.');
    const day = await client.query('SELECT id,escala_id AS "escalaId",data::text AS data FROM dia WHERE id=$1',[dayId]);
    if (!day.rowCount) throw new HttpError(404,'Dia não encontrado.');
    const scale = await lockedScale(client,day.rows[0].escalaId);
    if (scale.status !== 'aberta') throw new HttpError(409,'A escala não está aberta para preenchimento.');
    if (day.rows[0].data < scale.dataInicio || day.rows[0].data > scale.dataFim) {
      throw new HttpError(409,'Dia fora do intervalo da escala.');
    }
    const period = await client.query("SELECT id FROM periodo WHERE codigo=$1 AND status='ativo' FOR SHARE",[code]);
    if (!period.rowCount) throw new HttpError(409,'Período não cadastrado ou inativo.');
    const released = await client.query(`SELECT p.id FROM plantao p JOIN periodo r ON r.id=p.periodo_id
      WHERE p.dia_id=$1 AND p.status='aberto' AND p.quantidade_necessaria>0 AND r.status='ativo'
      AND r.codigo=ANY($2::text[]) FOR UPDATE OF p`,[dayId,code === 'I' ? ['D','N1','N2'] : [code]]);
    if (!released.rowCount) throw new HttpError(409,'Dia/período não liberado pelo administrador.');
    // Uma preferencia nao confirma participacao, nao consome vaga nem limita
    // quantos cotistas podem candidatar-se. I e flexibilidade, nao plantao 24h.
    const current = await client.query('SELECT id,periodo_id FROM disponibilidade WHERE cotista_id=$1 AND dia_id=$2 FOR UPDATE',[cotistaId,dayId]);
    if (current.rowCount > 1) throw new HttpError(409,'Há múltiplas escolhas antigas neste dia. Solicite revisão administrativa.');
    const result = current.rowCount
      ? await client.query(`UPDATE disponibilidade SET periodo_id=$1,observacao=$2,registrada_em=CURRENT_TIMESTAMP
          WHERE id=$3 RETURNING id,cotista_id AS "cotistaId",dia_id AS "diaId",periodo_id AS "periodoId",observacao`,
          [period.rows[0].id,observation,current.rows[0].id])
      : await client.query(`INSERT INTO disponibilidade (cotista_id,dia_id,periodo_id,observacao)
          VALUES ($1,$2,$3,$4) RETURNING id,cotista_id AS "cotistaId",dia_id AS "diaId",periodo_id AS "periodoId",observacao`,
          [cotistaId,dayId,period.rows[0].id,observation]);
    return {...result.rows[0],codigoPeriodo:code};
  });
}

export async function listMyAvailability(cotistaId,scaleId) {
  const scale = await pool.query('SELECT id FROM escala WHERE id=$1',[scaleId]);
  if (!scale.rowCount) throw new HttpError(404,'Escala não encontrada.');
  const result = await pool.query(`SELECT a.id,a.dia_id AS "diaId",d.data,r.codigo AS "codigoPeriodo",
    a.periodo_id AS "periodoId",a.observacao,a.registrada_em AS "registradaEm"
    FROM disponibilidade a JOIN dia d ON d.id=a.dia_id JOIN periodo r ON r.id=a.periodo_id
    WHERE a.cotista_id=$1 AND d.escala_id=$2 ORDER BY d.data,a.id`,[cotistaId,scaleId]);
  return result.rows;
}
