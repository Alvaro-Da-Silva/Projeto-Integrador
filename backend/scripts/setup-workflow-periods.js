import { connectDevelopment,developmentWrite,databaseError } from './development-db.js';

const periods = [
  ['D','Diurno','07:00','19:00','Diurno: 07h às 19h.'],
  ['N1','Noturno 1','19:00','07:00','Noturno: 19h às 07h do dia seguinte.'],
  ['N2','Noturno 2','18:00','06:00','Noturno: 18h às 06h do dia seguinte.'],
  ['I','Disponibilidade flexível','07:00','07:00','Opção flexível para qualquer cota no ciclo 07h–07h. Não confirma plantão de 24h.']
];
let client;
try {
  client=await connectDevelopment();
  await client.query('BEGIN READ WRITE');
  const output=[];
  for (const [code,name,start,end,description] of periods) {
    const inserted=await developmentWrite(client,`INSERT INTO periodo (codigo,nome,hora_inicio,hora_fim,descricao)
      VALUES ($1,$2,$3,$4,$5) ON CONFLICT (codigo) DO NOTHING RETURNING id`,[code,name,start,end,description]);
    const result=await client.query('SELECT id,codigo,hora_inicio::text,hora_fim::text,status FROM periodo WHERE codigo=$1',[code]);
    const row=result.rows[0];
    if(row.hora_inicio!==start+':00' || row.hora_fim!==end+':00' || row.status!=='ativo') {
      throw new Error('Periodo existente com horario/status diferente; nenhum registro existente sobrescrito.');
    }
    output.push({...row,criado:inserted.rowCount===1});
  }
  await developmentWrite(client,'COMMIT');
  console.log(JSON.stringify({banco:'siscota',periodos:output},null,2));
} catch(error) {
  if(client) await client.query('ROLLBACK').catch(()=>{});
  console.error(JSON.stringify(databaseError(error))); process.exitCode=1;
} finally {if(client) await client.end();}
