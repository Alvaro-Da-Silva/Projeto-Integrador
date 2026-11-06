// Operacoes transacionais usam exclusivamente o client recebido do service.
export function findScaleForUpdate(client, id) {
  return client.query(`SELECT id,ano,mes,status,data_inicio::text AS "dataInicio",
    data_fim::text AS "dataFim" FROM escala WHERE id=$1 FOR UPDATE`,[id]);
}

export function insertScale(client,nome,ano,mes,start,end,quantidadeCotasPadrao,observacao) {
  return client.query(`INSERT INTO escala
      (nome,ano,mes,data_inicio,data_fim,quantidade_cotas_padrao,observacao)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING id,nome,ano,mes,status,quantidade_cotas_padrao AS "quantidadeCotasPadrao"`,
      [nome,ano,mes,start,end,quantidadeCotasPadrao,observacao]);
}

export function updateScaleStatus(client,id,status) {
  return client.query('UPDATE escala SET status=$1 WHERE id=$2 RETURNING id,status',[status,id]);
}

export function findActivePeriodForShare(client,code) {
  return client.query("SELECT id FROM periodo WHERE codigo=$1 AND status='ativo' FOR SHARE",[code]);
}

export function upsertDay(client,scaleId,date) {
  return client.query(`INSERT INTO dia (escala_id,data) VALUES ($1,$2)
      ON CONFLICT (escala_id,data) DO UPDATE SET data=EXCLUDED.data RETURNING id`,[scaleId,date]);
}

export function upsertReleasedShift(client,dayId,periodId,quantity,observation) {
  return client.query(`INSERT INTO plantao (dia_id,periodo_id,quantidade_necessaria,observacao)
      VALUES ($1,$2,$3,$4) ON CONFLICT (dia_id,periodo_id) DO UPDATE
      SET quantidade_necessaria=EXCLUDED.quantidade_necessaria,observacao=EXCLUDED.observacao,status='aberto'
      RETURNING id,dia_id AS "diaId",periodo_id AS "periodoId",quantidade_necessaria AS "quantidadeNecessaria",status`,
      [dayId,periodId,quantity,observation]);
}

export function updateShiftStatus(client,scaleId,date,code,status) {
  return client.query(`UPDATE plantao p SET status=$1 FROM dia d,periodo r
      WHERE p.dia_id=d.id AND p.periodo_id=r.id AND d.escala_id=$2 AND d.data=$3 AND r.codigo=$4
      RETURNING p.id,p.status`,[status,scaleId,date,code]);
}
