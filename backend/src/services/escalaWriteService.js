import { transaction } from '../config/transaction.js';
import { calendarDate, HttpError, periodCode } from './workflowValidation.js';

export async function lockedScale(client, id) {
  const result = await client.query(`SELECT id,ano,mes,status,data_inicio::text AS "dataInicio",
    data_fim::text AS "dataFim" FROM escala WHERE id=$1 FOR UPDATE`,[id]);
  if (!result.rowCount) throw new HttpError(404,'Escala não encontrada.');
  return result.rows[0];
}

export async function createScale({nome,ano,mes,quantidadeCotasPadrao,observacao}) {
  const start = `${ano}-${String(mes).padStart(2,'0')}-01`;
  const last = new Date(Date.UTC(ano,mes,0)).getUTCDate();
  const end = `${ano}-${String(mes).padStart(2,'0')}-${last}`;
  return transaction(async client => {
    const result = await client.query(`INSERT INTO escala
      (nome,ano,mes,data_inicio,data_fim,quantidade_cotas_padrao,observacao)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING id,nome,ano,mes,status,quantidade_cotas_padrao AS "quantidadeCotasPadrao"`,
      [nome,ano,mes,start,end,quantidadeCotasPadrao,observacao]);
    return result.rows[0];
  });
}

export async function setScaleStatus(id, status) {
  return transaction(async client => {
    await lockedScale(client,id);
    return (await client.query('UPDATE escala SET status=$1 WHERE id=$2 RETURNING id,status',[status,id])).rows[0];
  });
}

export async function releaseShift(scaleId, date, code, quantity, observation) {
  calendarDate(date); periodCode(code,false);
  return transaction(async client => {
    const scale = await lockedScale(client,scaleId);
    if (scale.status !== 'aberta') throw new HttpError(409,'A escala não está aberta.');
    if (date < scale.dataInicio || date > scale.dataFim
        || Number(date.slice(0,4)) !== scale.ano || Number(date.slice(5,7)) !== scale.mes) {
      throw new HttpError(400,'Dia fora do mês ou intervalo da escala.');
    }
    const period = await client.query("SELECT id FROM periodo WHERE codigo=$1 AND status='ativo' FOR SHARE",[code]);
    if (!period.rowCount) throw new HttpError(409,'Período não cadastrado ou inativo. Execute a preparação dos períodos.');
    const day = await client.query(`INSERT INTO dia (escala_id,data) VALUES ($1,$2)
      ON CONFLICT (escala_id,data) DO UPDATE SET data=EXCLUDED.data RETURNING id`,[scaleId,date]);
    const shift = await client.query(`INSERT INTO plantao (dia_id,periodo_id,quantidade_necessaria,observacao)
      VALUES ($1,$2,$3,$4) ON CONFLICT (dia_id,periodo_id) DO UPDATE
      SET quantidade_necessaria=EXCLUDED.quantidade_necessaria,observacao=EXCLUDED.observacao,status='aberto'
      RETURNING id,dia_id AS "diaId",periodo_id AS "periodoId",quantidade_necessaria AS "quantidadeNecessaria",status`,
      [day.rows[0].id,period.rows[0].id,quantity,observation]);
    return shift.rows[0];
  });
}

export async function setShiftStatus(scaleId,date,code,status) {
  calendarDate(date); periodCode(code,false);
  return transaction(async client => {
    await lockedScale(client,scaleId);
    const result = await client.query(`UPDATE plantao p SET status=$1 FROM dia d,periodo r
      WHERE p.dia_id=d.id AND p.periodo_id=r.id AND d.escala_id=$2 AND d.data=$3 AND r.codigo=$4
      RETURNING p.id,p.status`,[status,scaleId,date,code]);
    if (!result.rowCount) throw new HttpError(404,'Plantão não encontrado.');
    return result.rows[0];
  });
}
