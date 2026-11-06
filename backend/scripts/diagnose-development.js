import fs from 'node:fs';
import { connectDevelopment, developmentWrite, databaseError } from './development-db.js';

const report={node:process.version,banco:'siscota',conexao:'NAO_TESTADO',permissoes:[],operacoes:[],modelo:{}};
let client;
try {
  client=await connectDevelopment();
  report.conexao='FUNCIONANDO';
  report.identity=(await client.query('SELECT current_database() AS database,current_user AS role,version() AS version')).rows[0];
  report.transaction=(await client.query(`SELECT current_setting('default_transaction_read_only') AS default_read_only,
    current_setting('transaction_read_only') AS read_only,pg_is_in_recovery() AS in_recovery`)).rows[0];
  report.permissoes=(await client.query(`SELECT c.relname AS tabela,
    has_table_privilege(c.oid,'SELECT') AS select,has_table_privilege(c.oid,'INSERT') AS insert,
    has_table_privilege(c.oid,'UPDATE') AS update,has_table_privilege(c.oid,'DELETE') AS delete,
    (c.relowner=(SELECT oid FROM pg_roles WHERE rolname=current_user) OR
      pg_has_role(c.relowner,'USAGE') OR (SELECT rolsuper FROM pg_roles WHERE rolname=current_user)) AS pode_alterar_como_dono,
    has_schema_privilege(n.oid,'CREATE') AS create_no_schema
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r' ORDER BY c.relname`)).rows;
  report.modelo.colunas=(await client.query(`SELECT table_name,column_name,data_type,is_nullable,
    character_maximum_length,column_default,is_identity,identity_generation
    FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position`)).rows;
  report.modelo.constraints=(await client.query(`SELECT c.relname AS tabela,k.conname,k.contype,
    pg_get_constraintdef(k.oid) AS definicao,k.convalidated FROM pg_constraint k
    JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' ORDER BY c.relname,k.conname`)).rows;
  report.sequences=(await client.query(`SELECT c.relname AS sequence,
    has_sequence_privilege(c.oid,'USAGE') AS usage FROM pg_class c
    JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='S' ORDER BY c.relname`)).rows;
  report.contagens={};
  for(const row of report.permissoes) {
    const table='"'+row.tabela.replaceAll('"','""')+'"';
    report.contagens[row.tabela]=Number((await client.query(`SELECT count(*) FROM public.${table}`)).rows[0].count);
  }
  const id=String(-Date.now()*100);
  const operations=[
    ['escala','INSERT',`INSERT INTO public.escala (id,nome,mes,ano,data_inicio,data_fim)
      OVERRIDING SYSTEM VALUE VALUES ($1,'TESTE PROBE ROLLBACK',11,9998,'9998-11-01','9998-11-30')`,[id]],
    ['periodo','INSERT',`INSERT INTO public.periodo (id,codigo,nome,hora_inicio,hora_fim)
      OVERRIDING SYSTEM VALUE VALUES ($1,'TESTE_PRB','TESTE PROBE ROLLBACK','08:00','20:00')`,[id]],
    ['cotista','INSERT',`INSERT INTO public.cotista (id,nome,cpf)
      OVERRIDING SYSTEM VALUE VALUES ($1,'TESTE PROBE ROLLBACK','00000000009')`,[id]],
    ['dia','INSERT',`INSERT INTO public.dia (id,escala_id,data)
      OVERRIDING SYSTEM VALUE VALUES ($1,$1,'9998-11-01')`,[id]],
    ['plantao','INSERT',`INSERT INTO public.plantao (id,dia_id,periodo_id,quantidade_necessaria)
      OVERRIDING SYSTEM VALUE VALUES ($1,$1,$1,1)`,[id]]
  ];
  for(const [table,column] of [['escala','nome'],['periodo','nome'],['cotista','nome'],['dia','data'],['plantao','quantidade_necessaria']]) {
    operations.push([table,'UPDATE',`UPDATE public.${table} SET ${column}=${column} WHERE id=$1`,[id]]);
  }
  // Ordem reversa das FKs. Todas as operacoes permanecem em ROLLBACK.
  for(const table of ['plantao','dia','cotista','periodo','escala']) {
    operations.push([table,'DELETE',`DELETE FROM public.${table} WHERE id=$1`,[id]]);
  }
  await client.query('BEGIN READ WRITE');
  await client.query("SET LOCAL statement_timeout='5s'");
  for(const [table,operation,sql,values] of operations) {
    await client.query('SAVEPOINT probe');
    try {
      const result=await developmentWrite(client,sql,values);
      report.operacoes.push({tabela:table,operacao:operation,status:'FUNCIONANDO',linhas:result.rowCount,sql});
    } catch(error) {
      await client.query('ROLLBACK TO SAVEPOINT probe');
      report.operacoes.push({tabela:table,operacao:operation,status:'BLOQUEADO',sql,erro:databaseError(error)});
    }
  }
  await client.query('ROLLBACK');
  report.rollback='EXECUTADO; probes nao persistidos; sequences nao utilizadas';
} catch(error) {
  if(client) await client.query('ROLLBACK').catch(()=>{});
  report.erro=databaseError(error); report.conexao=report.conexao==='FUNCIONANDO' ? 'FUNCIONANDO' : 'BLOQUEADO';
} finally { if(client) await client.end(); }
fs.mkdirSync(new URL('../docs/evidence/',import.meta.url),{recursive:true});
fs.writeFileSync(new URL('../docs/evidence/environment.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({node:report.node,conexao:report.conexao,identity:report.identity,
  permissoes:report.permissoes.filter(r=>['escala','dia','periodo','plantao','cotista'].includes(r.tabela)),
  operacoes:report.operacoes,erro:report.erro},null,2));
