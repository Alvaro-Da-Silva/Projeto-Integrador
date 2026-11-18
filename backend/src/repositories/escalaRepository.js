export function findScaleForUpdate(client, id) {
  return client.query(`SELECT id,ano,mes,status,data_inicio::text AS "dataInicio",
    data_fim::text AS "dataFim",publicada_em AS "publicadaEm" FROM escala WHERE id=$1 FOR UPDATE`,[id]);
}

export function insertScale(client,nome,ano,mes,start,end,quantidadeCotasPadrao,observacao) {
  return client.query(`INSERT INTO escala
      (nome,ano,mes,data_inicio,data_fim,quantidade_cotas_padrao,observacao)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING id,nome,ano,mes,status,quantidade_cotas_padrao AS "quantidadeCotasPadrao"`,
      [nome,ano,mes,start,end,quantidadeCotasPadrao,observacao]);
}

export function insertAllDays(client,scaleId,start,end) {
  return client.query(`INSERT INTO dia (escala_id,data)
      SELECT $1,d::date FROM generate_series($2::date,$3::date,interval '1 day') d
      ON CONFLICT (escala_id,data) DO NOTHING`,[scaleId,start,end]);
}

export function insertAllShifts(client,scaleId,dayQuantity,nightQuantity,n2Quantity) {
  return client.query(`INSERT INTO plantao (dia_id,periodo_id,quantidade_necessaria)
      SELECT d.id,p.id,q.qtd FROM dia d
      CROSS JOIN (VALUES ('D',$2::int),('N1',$3::int),('N2',$4::int)) AS q(codigo,qtd)
      JOIN periodo p ON p.codigo=q.codigo AND p.status='ativo'
      WHERE d.escala_id=$1
      ON CONFLICT (dia_id,periodo_id) DO NOTHING`,[scaleId,dayQuantity,nightQuantity,n2Quantity]);
}

export function findDayShiftQuantities(client,dayId) {
  return client.query(`SELECT r.codigo,p.quantidade_necessaria AS "quantidadeNecessaria"
      FROM plantao p JOIN periodo r ON r.id=p.periodo_id
      WHERE p.dia_id=$1 AND r.codigo IN ('D','N1','N2') AND p.quantidade_necessaria>0`,[dayId]);
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
