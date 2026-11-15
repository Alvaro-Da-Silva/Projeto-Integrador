import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { connectTestDatabase, writeTestData } from '../test/support/testDatabase.js';

const text = fs.readFileSync(new URL('./demo-plan.json', import.meta.url), 'utf8');
const plan = JSON.parse(text);
const digest = createHash('sha256').update(text).digest('hex');
const stamp = `${plan.marker} SHA256=${digest}`;
const date = (year, month, day) => `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

// Sem --apply: apenas apresentar o plano. Nenhuma conexao ou escrita.
if (!process.argv.includes('--apply')) {
  console.log(JSON.stringify({estado:'PROPOSTA_NAO_INSERIDA',sha256:digest,...plan},null,2));
} else if (!process.argv.includes(`--confirm-plan=${digest}`) || process.env.TEST_DB_WRITES !== 'authorized') {
  console.error('Seed bloqueado: requer confirmacao do plano exato e TEST_DB_WRITES=authorized.');
  process.exitCode = 1;
} else {
  let client;
  try {
    client = await connectTestDatabase(process.env.TEST_DATABASE_URL);
    await client.query('BEGIN');
    await client.query("SET LOCAL search_path TO public");
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL statement_timeout = '15s'");
    await client.query('SELECT pg_advisory_xact_lock(81427026)');
    const run = (sql, values) => writeTestData(client, sql, values);
    const existing = [];
    for (const scale of plan.escalas) {
      const result = await client.query('SELECT id,nome,observacao FROM public.escala WHERE ano=$1 AND mes=$2',[scale.ano,scale.mes]);
      if (result.rows.some(row=>row.observacao!==stamp || row.nome!==scale.nome)) throw new Error('Periodo ocupado por dados diferentes');
      existing.push(...result.rows);
    }
    if (existing.length) {
      // Nenhuma atualizacao automatica em demonstracao existente, inclusive modificacoes manuais.
      if (existing.length !== plan.escalas.length) throw new Error('Demonstracao parcial; revisar sem apagar registros');
      await client.query('ROLLBACK');
      console.log(JSON.stringify({estado:'JA_EXISTENTE_SEM_ALTERACOES',escalas:existing.map(r=>({id:r.id,nome:r.nome}))},null,2));
    } else {
      const ids = {periodos:[],cotistas:[],escalas:[],dias:[],plantoes:[],participacoes:[]};
      const periods = new Map();
      for (const period of plan.periodos) {
        const collision = await client.query('SELECT id FROM public.periodo WHERE codigo=$1',[period.codigo]);
        if (collision.rowCount) throw new Error('Codigo de periodo ocupado');
        const result = await run(`INSERT INTO public.periodo (codigo,nome,descricao,hora_inicio,hora_fim)
          VALUES ($1,$2,$3,$4,$5) RETURNING id`,[period.codigo,period.nome,stamp,period.horaInicio,period.horaFim]);
        periods.set(period.codigo,result.rows[0].id);
        ids.periodos.push({id:result.rows[0].id,codigo:period.codigo});
      }
      for (const cotista of plan.cotistas) {
        const result = await run(`INSERT INTO public.cotista (nome,observacao)
          VALUES ($1,$2) RETURNING id`,[cotista.nome,stamp]);
        ids.cotistas.push({id:result.rows[0].id,nome:cotista.nome});
      }
      for (const scale of plan.escalas) {
        const days = new Date(Date.UTC(scale.ano,scale.mes,0)).getUTCDate();
        const start = date(scale.ano,scale.mes,1), end = date(scale.ano,scale.mes,days);
        const result = await run(`INSERT INTO public.escala
          (nome,mes,ano,data_inicio,data_fim,observacao,quantidade_cotas_padrao)
          VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,[scale.nome,scale.mes,scale.ano,start,end,stamp,scale.cotas]);
        const scaleId = result.rows[0].id;
        ids.escalas.push({id:scaleId,nome:scale.nome,ano:scale.ano,mes:scale.mes,cotas:scale.cotas});
        for (let day=1; day<=days; day++) {
          const dayResult = await run('INSERT INTO public.dia (escala_id,data) VALUES ($1,$2) RETURNING id',[scaleId,date(scale.ano,scale.mes,day)]);
          const dayId = dayResult.rows[0].id;
          ids.dias.push({id:dayId,escalaId:scaleId,data:date(scale.ano,scale.mes,day)});
          for (const shift of scale.plantoesPorDia) {
            if (!periods.has(shift.periodo)) throw new Error('Periodo nao declarado');
            const shiftResult = await run(`INSERT INTO public.plantao
              (dia_id,periodo_id,quantidade_necessaria,observacao) VALUES ($1,$2,$3,$4) RETURNING id`,
              [dayId,periods.get(shift.periodo),shift.quantidade,stamp]);
            const shiftId = shiftResult.rows[0].id;
            ids.plantoes.push({id:shiftId,diaId:dayId,periodo:shift.periodo});
            if (day===1) for (const participation of scale.participacoesPrimeiroDia.filter(p=>p.periodo===shift.periodo)) {
              const participant = ids.cotistas[participation.cotista];
              if (!participant) throw new Error('Cotista nao declarado');
              const r = await run(`INSERT INTO public.participacao (cotista_id,plantao_id,observacao)
                VALUES ($1,$2,$3) RETURNING id`,[participant.id,shiftId,stamp]);
              ids.participacoes.push({id:r.rows[0].id,cotistaId:participant.id,plantaoId:shiftId,status:'pendente'});
            }
          }
        }
      }
      // Conferir novamente o destino imediatamente antes de persistir a transacao.
      await run('COMMIT');
      // IDs reais, sem credenciais; nao ha manifesto ficticio anterior ao COMMIT.
      console.log(JSON.stringify({estado:'PERSISTIDO',sha256:digest,...ids},null,2));
    }
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(()=>{});
    console.error(`Seed nao concluido; transacao revertida. Codigo: ${error.code || 'VALIDATION'}.`);
    process.exitCode=1;
  } finally { if (client) await client.end(); }
}
