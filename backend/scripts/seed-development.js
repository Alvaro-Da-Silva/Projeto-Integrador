import fs from 'node:fs';
import { connectDevelopment,developmentWrite,databaseError } from './development-db.js';

const marker='TESTE SISCOTA NOVEMBRO 2026 V1';
const result={banco:'siscota',estado:'NAO_EXECUTADO',criados:{escala:0,dia:0,periodo:0,plantao:0,cotista:0},ids:{}};
let client,operation='CONNECT';
let committed=false;
if(!process.argv.includes('--apply-authorized')) {
  console.error('Use --apply-authorized somente para a carga ficticia autorizada em siscota.');
  process.exitCode=1;
} else {
  try {
    client=await connectDevelopment();
    await client.query('BEGIN READ WRITE');
    await client.query("SET LOCAL lock_timeout='5s'");
    await client.query("SET LOCAL statement_timeout='10s'");
    await client.query('SELECT pg_advisory_xact_lock(81421126)');
    const run=async(sql,values)=> { operation=sql; return developmentWrite(client,sql,values); };
    const existing=await client.query('SELECT id,observacao FROM public.escala WHERE ano=2026 AND mes=11');
    if(existing.rowCount) {
      if(existing.rowCount!==1 || existing.rows[0].observacao!==marker) throw new Error('Novembro/2026 ocupado por escala diferente; nenhum registro sobrescrito.');
      const id=existing.rows[0].id;
      const counts=await client.query(`SELECT
        (SELECT count(*)::int FROM public.dia WHERE escala_id=$1) AS dias,
        (SELECT count(*)::int FROM public.plantao p JOIN public.dia d ON d.id=p.dia_id WHERE d.escala_id=$1) AS plantoes,
        (SELECT count(*)::int FROM public.cotista WHERE observacao=$2) AS cotistas`,[id,marker]);
      if(counts.rows[0].dias!==30 || counts.rows[0].plantoes!==60 || counts.rows[0].cotistas!==4) {
        throw new Error('Carga existente incompleta ou alterada: revisar sem apagar dados.');
      }
      result.estado='JA_EXISTENTE_SEM_ALTERACOES'; result.ids.escala=id;
      await client.query('ROLLBACK');
    } else {
      const scale=await run(`INSERT INTO public.escala
        (nome,mes,ano,data_inicio,data_fim,observacao,quantidade_cotas_padrao)
        VALUES ($1,11,2026,'2026-11-01','2026-11-30',$2,4) RETURNING id`,
        ['TESTE Novembro 2026 - 4 cotas',marker]);
      const scaleId=scale.rows[0].id;
      result.criados.escala=1; result.ids.escala=scaleId;
      result.ids.periodos=[]; result.ids.cotistas=[]; result.ids.dias=[]; result.ids.plantoes=[];
      const periods=[];
      for(const [codigo,nome,start,end] of [['TESTE_D','TESTE Diurno','08:00','20:00'],['TESTE_N','TESTE Noturno agregado','20:00','08:00']]) {
        const taken=await client.query('SELECT id FROM public.periodo WHERE codigo=$1',[codigo]);
        if(taken.rowCount) throw new Error('Codigo de periodo ocupado; nenhum periodo existente modificado.');
        const r=await run(`INSERT INTO public.periodo (codigo,nome,descricao,hora_inicio,hora_fim)
          VALUES ($1,$2,$3,$4,$5) RETURNING id`,[codigo,nome,marker,start,end]);
        periods.push(r.rows[0].id);
        result.ids.periodos.push({id:r.rows[0].id,codigo}); result.criados.periodo++;
      }
      for(let n=1;n<=4;n++) {
        const nome=`TESTE Cotista ${String(n).padStart(2,'0')}`;
        const r=await run('INSERT INTO public.cotista (nome,observacao) VALUES ($1,$2) RETURNING id',[nome,marker]);
        result.ids.cotistas.push({id:r.rows[0].id,nome}); result.criados.cotista++;
      }
      for(let day=1;day<=30;day++) {
        const date=`2026-11-${String(day).padStart(2,'0')}`;
        const r=await run('INSERT INTO public.dia (escala_id,data) VALUES ($1,$2) RETURNING id',[scaleId,date]);
        const dayId=r.rows[0].id;
        result.ids.dias.push({id:dayId,data:date}); result.criados.dia++;
        for(const periodId of periods) {
          const shift=await run(`INSERT INTO public.plantao (dia_id,periodo_id,quantidade_necessaria,observacao)
            VALUES ($1,$2,2,$3) RETURNING id`,[dayId,periodId,marker]);
          result.ids.plantoes.push({id:shift.rows[0].id,diaId:dayId,periodoId:periodId}); result.criados.plantao++;
        }
      }
      await run('COMMIT'); committed=true;
      // Confirmar persistencia em nova transacao/consulta apos COMMIT.
      const confirmation=await client.query('SELECT id FROM public.escala WHERE id=$1 AND observacao=$2',[scaleId,marker]);
      if(confirmation.rowCount!==1) throw new Error('Persistencia nao confirmada apos COMMIT.');
      result.estado='PERSISTIDO';
    }
  } catch(error) {
    if(client) await client.query('ROLLBACK').catch(()=>{});
    result.estado=committed ? 'PERSISTIDO_COM_VERIFICACAO_PENDENTE' : 'BLOQUEADO_ROLLBACK';
    result.operacao=operation; result.erro=databaseError(error);
    if(!committed) { for(const key of Object.keys(result.criados)) result.criados[key]=0; result.ids={}; }
    process.exitCode=1;
  } finally { if(client) await client.end(); }
  fs.mkdirSync(new URL('../docs/evidence/',import.meta.url),{recursive:true});
  fs.writeFileSync(new URL('../docs/evidence/seed.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
}
