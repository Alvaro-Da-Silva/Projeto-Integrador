import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { connectDevelopment } from './development-db.js';

const base='http://localhost:8080';
const client=await connectDevelopment();
let free;
try {
  free=(await client.query(`SELECT y AS ano,m AS mes FROM generate_series(2000,9999) y
    CROSS JOIN generate_series(1,12) m WHERE NOT EXISTS
    (SELECT FROM public.escala e WHERE e.ano=y AND e.mes=m) ORDER BY y,m LIMIT 1`)).rows[0];
} finally { await client.end(); }
const cases=[
  ['Calendario novembro 2026 (depende do seed)','2026/11/calendario',200,true],
  ['Escala ausente confirmada no banco',`${free.ano}/${free.mes}/calendario`,404,false],
  ...[['1999','11'],['10000','11'],['2026.5','11'],['abc','11'],['2026','0'],['2026','13'],['2026','1.5'],['2026','abc']]
    .map(([y,m])=>[`Parametros invalidos ${y}/${m}`,`${y}/${m}/calendario`,400,false]),
  ['Mes ausente (rota incompleta)','2026/calendario',404,false],
  ['CORS com origem frontend','1999/11/calendario',400,false]
];
const results=[];
for(const [name,path,expectedStatus,needsSeed] of cases) {
  const url=base+'/api/escalas/'+path;
  const headers={Accept:'application/json'};
  if(name.startsWith('CORS')) headers.Origin='http://localhost:3000';
  try {
    const r=await fetch(url,{headers,signal:AbortSignal.timeout(5000)});
    const raw=await r.text(); let body; try { body=JSON.parse(raw); } catch { body=raw; }
    results.push({name,method:'GET',url,headers,expectedStatus,actualStatus:r.status,body,
      cors:r.headers.get('access-control-allow-origin'),
      resultado:needsSeed && r.status===404 ? 'BLOQUEADO: seed sem dados' : r.status===expectedStatus ? 'APROVADO' : 'REPROVADO'});
  } catch(error) {
    results.push({name,method:'GET',url,headers,expectedStatus,resultado:'BLOQUEADO: HTTP indisponivel',code:error.cause?.code || error.name});
  }
}
// O importador Thunder Client pode ignorar URLs no formato string do Postman.
// Usar o objeto estruturado, incluindo raw, em requests e exemplos salvos.
function postmanUrl(raw) {
  const parsed=new URL(raw);
  return {raw,protocol:parsed.protocol.slice(0,-1),host:parsed.hostname.split('.'),
    port:parsed.port,path:parsed.pathname.slice(1).split('/')};
}
const collection={info:{_postman_id:randomUUID(),name:'SISCOTA Free - URLs corrigidas',
  schema:'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  description:'12 GETs, URLs absolutas, sem environments, scripts ou dependencias pagas. Resultados reais em cada descricao. Importacao na interface nao verificada.'},
  item:results.map(row=>({name:row.name,request:{method:'GET',url:postmanUrl(row.url),
    header:Object.entries(row.headers).map(([key,value])=>({key,value,type:'text'})),
    description:`HTTP esperado: ${row.expectedStatus}. Resultado real: ${row.actualStatus || 'sem status'} (${row.resultado}). Sem body e sem autenticacao.\nResposta efetivamente obtida:\n${JSON.stringify(row.body,null,2)}`},
    response:row.actualStatus ? [{name:'Resultado real desta execucao',originalRequest:{method:'GET',url:postmanUrl(row.url)},
      status:String(row.actualStatus),code:row.actualStatus,header:[],
      body:typeof row.body==='string' ? row.body : JSON.stringify(row.body,null,2)}] : []}))};
fs.mkdirSync(new URL('../docs/evidence/',import.meta.url),{recursive:true});
fs.writeFileSync(new URL('../docs/evidence/http.json',import.meta.url),JSON.stringify(results,null,2)+'\n');
fs.writeFileSync(new URL('../thunder-client/siscota-free.postman_collection.json',import.meta.url),JSON.stringify(collection,null,2)+'\n');
console.log(JSON.stringify(results.map(({name,actualStatus,expectedStatus,resultado})=>({name,actualStatus,expectedStatus,resultado})),null,2));
