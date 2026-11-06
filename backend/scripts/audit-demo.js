import fs from 'node:fs';
import { connectTestDatabase } from '../test/support/testDatabase.js';

const plan=JSON.parse(fs.readFileSync(new URL('./demo-plan.json',import.meta.url),'utf8'));
const report={banco:'siscota_test',falhas:[],bloqueios:[],comportamentosIntencionais:[],verificacoes:[],escalas:[]};
const quote = value => '"'+value.replaceAll('"','""')+'"';
let client;
try {
  client=await connectTestDatabase(process.env.TEST_DATABASE_URL);
  await client.query('BEGIN READ ONLY ISOLATION LEVEL REPEATABLE READ');
  const fail=(name,count)=> { if (Number(count)) report.falhas.push({verificacao:name,quantidade:Number(count)}); };
  const keys=await client.query(`SELECT c.conname,c.contype,s.relname AS source,r.relname AS target,
    ARRAY(SELECT a.attname FROM pg_attribute a WHERE a.attrelid=c.conrelid AND a.attnum=ANY(c.conkey)
      ORDER BY array_position(c.conkey,a.attnum)) AS source_columns,
    ARRAY(SELECT a.attname FROM pg_attribute a WHERE a.attrelid=c.confrelid AND a.attnum=ANY(c.confkey)
      ORDER BY array_position(c.confkey,a.attnum)) AS target_columns
    FROM pg_constraint c JOIN pg_class s ON s.oid=c.conrelid
    JOIN pg_namespace n ON n.oid=s.relnamespace LEFT JOIN pg_class r ON r.oid=c.confrelid
    WHERE n.nspname='public' AND c.contype IN ('f','u','p') ORDER BY c.conname`);
  for (const key of keys.rows) {
    let sql;
    if (key.contype==='f') {
      const join=key.source_columns.map((column,i)=>`a.${quote(column)}=b.${quote(key.target_columns[i])}`).join(' AND ');
      const required=key.source_columns.map(column=>`a.${quote(column)} IS NOT NULL`).join(' AND ');
      sql=`SELECT count(*) AS count FROM public.${quote(key.source)} a LEFT JOIN public.${quote(key.target)} b
        ON ${join} WHERE ${required} AND b.${quote(key.target_columns[0])} IS NULL`;
    } else {
      const columns=key.source_columns.map(quote);
      sql=`SELECT count(*) AS count FROM (SELECT ${columns.join(',')} FROM public.${quote(key.source)}
        WHERE ${columns.map(c=>`${c} IS NOT NULL`).join(' AND ')} GROUP BY ${columns.join(',')} HAVING count(*)>1) duplicates`;
    }
    const count=(await client.query(sql)).rows[0].count;
    fail(key.conname,count);
    report.verificacoes.push({constraint:key.conname,problemas:Number(count)});
  }
  const indicators=await client.query(`SELECT
    (SELECT count(*) FROM public.dia d JOIN public.escala e ON e.id=d.escala_id
      WHERE d.data<e.data_inicio OR d.data>e.data_fim) AS dias_fora_intervalo,
    (SELECT count(*) FROM public.plantao WHERE quantidade_necessaria<=0) AS quantidades_invalidas,
    (SELECT count(*) FROM public.escala WHERE quantidade_cotas_padrao NOT IN (3,4)) AS distribuicoes_pendentes`);
  const stats=indicators.rows[0];
  fail('dias_fora_intervalo',stats.dias_fora_intervalo);
  fail('quantidades_invalidas',stats.quantidades_invalidas);
  report.comportamentosIntencionais.push({distribuicoes_sem_regra_aprovada:Number(stats.distribuicoes_pendentes),nota:'5 cotas nao sao distribuidas automaticamente; nao equivalem a falha de constraint.'});
  const port=Number(process.env.TEST_API_PORT || 8081);
  if (!Number.isInteger(port) || port<1024 || port>65535) throw new Error('Porta invalida');
  for (const expected of plan.escalas) {
    const scale=await client.query('SELECT id,nome,quantidade_cotas_padrao FROM public.escala WHERE ano=$1 AND mes=$2',[expected.ano,expected.mes]);
    if (scale.rowCount!==1) { report.falhas.push({escala:expected.nome,motivo:'Escala ausente ou duplicada'}); continue; }
    const row=scale.rows[0];
    const url=`http://127.0.0.1:${port}/api/escalas/${expected.ano}/${expected.mes}/calendario`;
    const days=await client.query('SELECT id FROM public.dia WHERE escala_id=$1 ORDER BY data,id',[row.id]);
    const shifts=await client.query(`SELECT p.id,p.dia_id,p.periodo_id,p.quantidade_necessaria
      FROM public.plantao p JOIN public.dia d ON d.id=p.dia_id WHERE d.escala_id=$1`,[row.id]);
    const periods=await client.query('SELECT id FROM public.periodo ORDER BY codigo,id');
    const result={id:row.id,nome:row.nome,url,dias:days.rowCount,plantoes:shifts.rowCount};
    report.escalas.push(result);
    const plannedDays=new Date(Date.UTC(expected.ano,expected.mes,0)).getUTCDate();
    if (days.rowCount!==plannedDays || shifts.rowCount!==plannedDays*expected.plantoesPorDia.length
        || row.quantidade_cotas_padrao!==expected.cotas || row.nome!==expected.nome) {
      report.falhas.push({escala:row.id,motivo:'Dados persistidos divergem do plano confirmado'});
    }
    try {
      const response=await fetch(url,{signal:AbortSignal.timeout(5000)});
      result.http=response.status;
      if (response.status!==200) { report.falhas.push({escala:row.id,motivo:'HTTP diferente de 200'}); continue; }
      const body=await response.json();
      const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
      if (body.escala.id!==row.id || body.escala.quantidadeCotasPadrao!==row.quantidade_cotas_padrao
          || !same(body.dias.map(d=>d.id),days.rows.map(d=>d.id))
          || !same(body.periodos.map(p=>p.id),periods.rows.map(p=>p.id))) {
        report.falhas.push({escala:row.id,motivo:'Escala, dias ou periodos HTTP divergem do PostgreSQL'});
      }
      const actualShifts=body.dias.flatMap(d=>d.plantoes);
      if (actualShifts.length!==shifts.rowCount || shifts.rows.some(s=>!actualShifts.some(p=>p.id===s.id
          && p.diaId===s.dia_id && p.periodoId===s.periodo_id && p.quantidadeNecessaria===s.quantidade_necessaria))) {
        report.falhas.push({escala:row.id,motivo:'Plantoes HTTP divergem do PostgreSQL'});
      }
      const distribution=body.distribuicaoDiariaPadrao;
      const supported=[3,4].includes(expected.cotas);
      if (distribution.totalQuotas!==expected.cotas || distribution.hoursPerQuota!==12
          || distribution.nightPeriodAllocation!=='pending' || distribution.supported!==supported
          || distribution.diurnalQuotas!==(expected.cotas===4 ? 2 : expected.cotas===3 ? 1 : null)
          || distribution.nightQuotas!==(supported ? 2 : null)) {
        report.falhas.push({escala:row.id,motivo:'Distribuicao HTTP diverge das regras implementadas'});
      }
      result.distribuicao=distribution;
    } catch {
      result.http='BLOQUEADO';
      report.bloqueios.push({escala:row.id,motivo:'Consulta HTTP indisponivel ou resposta invalida; nao comprova falha no PostgreSQL'});
    }
  }
  await client.query('ROLLBACK');
  console.log(JSON.stringify(report,null,2));
  if (report.falhas.length || report.bloqueios.length) process.exitCode=1;
} catch {
  console.error('Auditoria bloqueada: conexao de teste ou esquema nao disponivel; nenhuma escrita executada.');
  process.exitCode=1;
} finally { if (client) await client.end(); }
