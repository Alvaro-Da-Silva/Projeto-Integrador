import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../src/app.js';
import { pool } from '../src/config/database.js';
import { mockAuthProvider } from './support/mockAuth.js';
import { availabilityOptions } from '../src/services/availabilityOptions.js';
import { positiveId,calendarDate } from '../src/services/workflowValidation.js';
import { transaction } from '../src/config/transaction.js';

test('Validacoes e opcoes do preenchimento',async t=> {
  await t.test('IDs bigint validos sem perder precisao',()=> {
    assert.equal(positiveId('9223372036854775807'),'9223372036854775807');
    for(const id of ['0','-1','1.5','1e3','9223372036854775808']) assert.throws(()=>positiveId(id));
  });
  await t.test('Datas reais, incluindo ano bissexto',()=> {
    assert.equal(calendarDate('2028-02-29'),'2028-02-29');
    for(const date of ['2026-02-29','2026-11-31','2026-1-01']) assert.throws(()=>calendarDate(date));
  });
  const scale={status:'aberta',dataInicio:'2026-11-01',dataFim:'2026-11-30'};
  const periods=[{id:'1',codigo:'D',status:'ativo'},{id:'2',codigo:'N1',status:'ativo'},
    {id:'3',codigo:'N2',status:'ativo'},{id:'4',codigo:'I',status:'ativo'}];
  const day={data:'2026-11-01',plantoes:[{periodoId:'1',status:'aberto',quantidadeNecessaria:2}]};
  await t.test('I e oferecido como flexibilidade quando existe plantao liberado',()=> {
    assert.deepEqual(availabilityOptions(scale,day,periods),['D','I']);
  });
  await t.test('Escala fechada nao oferece preenchimento',()=> {
    assert.deepEqual(availabilityOptions({...scale,status:'fechada'},day,periods),[]);
  });
  await t.test('Plantao encerrado, dia fora do intervalo e periodo inativo nao liberam opcoes',()=> {
    assert.deepEqual(availabilityOptions(scale,{...day,plantoes:[{...day.plantoes[0],status:'encerrado'}]},periods),[]);
    assert.deepEqual(availabilityOptions(scale,{...day,data:'2026-12-01'},periods),[]);
    assert.deepEqual(availabilityOptions(scale,day,periods.map(p=>({...p,status:'inativo'}))),[]);
  });
});

test('Sessao simulada, permissoes, liberacao e disponibilidade (PostgreSQL simulado)',async t=> {
  const users=[
    {id:'1',nome:'TESTE Admin',email:'admin@example.invalid',status:'ativo',perfil:'admin',cotistaId:null},
    {id:'2',nome:'TESTE Cotista',email:'cotista@example.invalid',status:'ativo',perfil:'cotista',cotistaId:'10',cotistaStatus:'ativo'},
    {id:'3',nome:'TESTE Outro',email:'outro@example.invalid',status:'ativo',perfil:'cotista',cotistaId:'11',cotistaStatus:'ativo'},
    {id:'4',nome:'TESTE Inativo',email:'inativo@example.invalid',status:'desativado',perfil:'admin'}
  ];
  t.mock.method(pool,'query',async(sql,values)=> {
    if(sql.includes('FROM usuario')) {
      const rows=users.filter(u=>sql.includes('lower(u.email)') ? u.email===values[0] : `auth-${u.id}`===values[0]);
      return {rows,rowCount:rows.length};
    }
    if(sql.includes('FROM escala WHERE id=$1')) return values[0]==='20' ? row({id:'20'}) : {rows:[],rowCount:0};
    if(sql.includes('FROM disponibilidade a JOIN dia d ON d.id=a.dia_id')) {
      return deleteWasDone ? {rows:[],rowCount:0} : row({id:'60',diaId:'30',data:'2026-11-01',codigoPeriodo:'D',periodoId:'40'});
    }
    throw new Error('Query fora de transacao nao esperada');
  });
  let handle;
  let queries=[];
  let releases=0;
  let deleteWasDone=false;
  t.mock.method(pool,'connect',async()=>({
    query:async(sql,values)=> {
      queries.push({sql,values});
      if(['BEGIN READ WRITE','COMMIT','ROLLBACK'].includes(sql)) return {rows:[],rowCount:0};
      return handle(sql,values);
    }, release:()=> {releases++;}
  }));
  const server=createApp({authProvider:mockAuthProvider,origins:['http://localhost:3000']}).listen(0,'127.0.0.1');
  await once(server,'listening');
  t.after(()=>new Promise(resolve=> {server.close(resolve);server.closeAllConnections();}));
  const request=async(method,path,body,userId)=> {
    const response=await fetch(`http://127.0.0.1:${server.address().port}${path}`,{
      method,headers:{'Content-Type':'application/json',Origin:'http://localhost:3000',...(userId?{Cookie:`test-session=${userId}`}:{})},
      body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
    return {status:response.status,body:response.status===204?undefined:await response.json(),headers:response.headers};
  };
  const row = value=>({rows:[value],rowCount:1});
  const scale={id:'20',ano:2026,mes:11,status:'aberta',dataInicio:'2026-11-01',dataFim:'2026-11-30'};
  const defaultHandle=async(sql,values)=> {
    if(sql.includes('FROM cotista')) return row({id:values[0]});
    if(sql.includes('FROM dia WHERE id=')) return row({id:'30',escalaId:'20',data:'2026-11-01'});
    if(sql.includes('FROM escala')) return row(scale);
    if(sql.includes('FROM periodo')) return row({id:values[0]==='I'?'43':'40'});
    if(sql.includes('SELECT p.id FROM plantao')) return row({id:'50'});
    if(sql.includes('SELECT id,periodo_id FROM disponibilidade')) return {rows:[],rowCount:0};
    if(sql.includes('INSERT INTO disponibilidade')) return row({id:'60',cotistaId:values[0],diaId:values[1],periodoId:values[2]});
    if(sql.includes('UPDATE disponibilidade')) return row({id:values[2],cotistaId:'10',diaId:'30',periodoId:values[0]});
    if(sql.includes('INSERT INTO escala')) return row({id:'20',nome:values[0],ano:values[1],mes:values[2],status:'aberta',quantidadeCotasPadrao:values[5]});
    if(sql.includes('INSERT INTO dia')) return row({id:'30'});
    if(sql.includes('INSERT INTO plantao')) return row({id:'50',diaId:values[0],periodoId:values[1],quantidadeNecessaria:values[2],status:'aberto'});
    if(sql.includes('UPDATE escala')) return row({id:values[1],status:values[0]});
    if(sql.includes('UPDATE plantao')) return row({id:'50',status:values[0]});
    throw new Error('SQL nao esperado');
  };
  handle=defaultHandle;
  await t.test('GET me exige sessao e consulta perfil atual no banco',async()=> {
    assert.equal((await request('GET','/api/me')).status,401);
    assert.equal((await request('GET','/api/me',undefined,'2')).body.cotistaId,'10');
    users[1].status='desativado';
    assert.equal((await request('GET','/api/me',undefined,'2')).status,403);
    users[1].status='ativo';
  });
  await t.test('Sem token nao cria escala; cotista recebe 403',async()=> {
    assert.equal((await request('POST','/api/escalas',{})).status,401);
    assert.equal((await request('POST','/api/escalas',{},'2')).status,403);
  });
  await t.test('Administrador cria escala mensal com limites corretos',async()=> {
    queries=[];
    const result=await request('POST','/api/escalas',{nome:'TESTE',ano:2028,mes:2,quantidadeCotasPadrao:4},'1');
    assert.equal(result.status,201);
    const sql=queries.find(q=>q.sql.includes('INSERT INTO escala'));
    assert.deepEqual(sql.values.slice(3,6),['2028-02-01','2028-02-29',4]);
    assert.equal(queries[0].sql,'BEGIN READ WRITE');assert.equal(queries.at(-1).sql,'COMMIT');
  });
  for(const body of [{nome:'TESTE',ano:2026,mes:13,quantidadeCotasPadrao:4},
    {nome:'TESTE',ano:2026,mes:11,quantidadeCotasPadrao:0},
    {nome:'TESTE',ano:2026,mes:11,quantidadeCotasPadrao:4,cotistaId:'10'}]) {
    await t.test('Cadastro de escala rejeita dados invalidos',async()=> {
      assert.equal((await request('POST','/api/escalas',body,'1')).status,400);
    });
  }
  await t.test('Administrador libera plantao; quantidade fica parametrizada',async()=> {
    queries=[];
    const r=await request('PUT','/api/escalas/20/dias/2026-11-01/plantoes/N1',{quantidadeNecessaria:2},'1');
    assert.equal(r.status,200);
    assert.deepEqual(queries.find(q=>q.sql.includes('INSERT INTO plantao')).values.slice(0,3),['30','40',2]);
  });
  await t.test('I nao gera plantao fisico e quantidade zero e rejeitada',async()=> {
    assert.equal((await request('PUT','/api/escalas/20/dias/2026-11-01/plantoes/I',{quantidadeNecessaria:4},'1')).status,400);
    assert.equal((await request('PUT','/api/escalas/20/dias/2026-11-01/plantoes/D',{quantidadeNecessaria:0},'1')).status,400);
  });
  await t.test('Dia fora do intervalo nao e liberado e transacao reverte',async()=> {
    queries=[];
    assert.equal((await request('PUT','/api/escalas/20/dias/2026-12-01/plantoes/D',{quantidadeNecessaria:2},'1')).status,400);
    assert.equal(queries.at(-1).sql,'ROLLBACK');
    assert(!queries.some(q=>q.sql.includes('INSERT INTO dia')));
  });
  await t.test('Administrador altera status de escala e plantao',async()=> {
    assert.equal((await request('PATCH','/api/escalas/20/status',{status:'fechada'},'1')).body.status,'fechada');
    assert.equal((await request('PATCH','/api/escalas/20/dias/2026-11-01/plantoes/D/status',{status:'encerrado'},'1')).body.status,'encerrado');
  });
  await t.test('Admin nao escolhe como cotista e cliente nao determina identidade',async()=> {
    assert.equal((await request('PUT','/api/disponibilidades/30',{codigoPeriodo:'D'},'1')).status,403);
    assert.equal((await request('PUT','/api/disponibilidades/30',{codigoPeriodo:'D',cotistaId:'11'},'2')).status,400);
    users[1].cotistaStatus='inativo';
    assert.equal((await request('PUT','/api/disponibilidades/30',{codigoPeriodo:'D'},'2')).status,403);
    users[1].cotistaStatus='ativo';
  });
  await t.test('Cotista escolhe dia liberado, sem gravar participacao ou consumir vagas',async()=> {
    queries=[];
    const r=await request('PUT','/api/disponibilidades/30',{codigoPeriodo:'D'},'2');
    assert.equal(r.status,200);assert.equal(r.body.cotistaId,'10');
    assert.deepEqual(queries.find(q=>q.sql.includes('INSERT INTO disponibilidade')).values.slice(0,3),['10','30','40']);
    assert(queries.some(q=>q.sql.includes('FROM cotista')&&q.sql.includes('FOR UPDATE')));
    assert(!queries.some(q=>/INSERT INTO participacao|UPDATE plantao/.test(q.sql)));
  });
  await t.test('Segundo cotista pode escolher mesmo dia e periodo',async()=> {
    const r=await request('PUT','/api/disponibilidades/30',{codigoPeriodo:'D'},'3');
    assert.equal(r.status,200);assert.equal(r.body.cotistaId,'11');
  });
  await t.test('Escolha I procura qualquer plantao fisico liberado',async()=> {
    queries=[];
    assert.equal((await request('PUT','/api/disponibilidades/30',{codigoPeriodo:'I'},'2')).status,200);
    assert.deepEqual(queries.find(q=>q.sql.includes('SELECT p.id FROM plantao')).values,['30',['D','N1','N2']]);
  });
  await t.test('Troca da escolha atualiza registro em vez de criar segunda opcao',async()=> {
    queries=[];
    handle=async(sql,values)=>sql.includes('SELECT id,periodo_id FROM disponibilidade') ? row({id:'60',periodo_id:'40'}) : defaultHandle(sql,values);
    const r=await request('PUT','/api/disponibilidades/30',{codigoPeriodo:'N2'},'2');
    assert.equal(r.status,200);
    assert(queries.some(q=>q.sql.includes('UPDATE disponibilidade')));
    assert(!queries.some(q=>q.sql.includes('INSERT INTO disponibilidade')));
    handle=defaultHandle;
  });
  for(const scenario of ['fechada','plantao','dia','periodo']) {
    await t.test(`Recusa preenchimento quando bloqueado: ${scenario}`,async()=> {
      handle=async(sql,values)=> {
        if(scenario==='fechada'&&sql.includes('FROM escala')) return row({...scale,status:'fechada'});
        if(scenario==='plantao'&&sql.includes('SELECT p.id FROM plantao')) return {rows:[],rowCount:0};
        if(scenario==='dia'&&sql.includes('FROM dia WHERE id=')) return {rows:[],rowCount:0};
        if(scenario==='periodo'&&sql.includes('FROM periodo')) return {rows:[],rowCount:0};
        return defaultHandle(sql,values);
      };
      const r=await request('PUT','/api/disponibilidades/30',{codigoPeriodo:'N1'},'2');
      assert.equal(r.status,scenario==='dia'?404:409);
      handle=defaultHandle;
    });
  }
  await t.test('Permissao SQL ausente retorna 503, sem detalhes internos',async()=> {
    handle=async()=> {throw Object.assign(new Error('detalhe interno'),{code:'42501'});};
    const r=await request('PUT','/api/disponibilidades/30',{codigoPeriodo:'D'},'2');
    assert.equal(r.status,503);assert(!JSON.stringify(r.body).includes('detalhe interno'));
    handle=defaultHandle;
  });
  await t.test('Transacao sempre libera cliente',async()=> {
    const before=releases;
    await assert.rejects(transaction(async()=> {throw new Error('teste');}));
    assert.equal(releases,before+1);assert.equal(queries.at(-1).sql,'ROLLBACK');
  });
  const configureDelete=({cotistaId='10',availability=true,scaleStatus='aberta',periodActive=true,released=true,deleteRow=true}={})=> {
    handle=async(sql,values)=> {
      if(sql.includes('FROM cotista')) return row({id:values[0]});
      if(sql.includes('FROM dia WHERE id=')) return row({id:'30',escalaId:'20',data:'2026-11-01'});
      if(sql.includes('FROM escala')) return row({...scale,status:scaleStatus});
      if(sql.includes('SELECT id,periodo_id FROM disponibilidade')) {
        assert.equal(values[1],'30');
        return availability&&values[0]===cotistaId ? row({id:'60',periodo_id:'40'}) : {rows:[],rowCount:0};
      }
      if(sql.includes('FROM periodo WHERE id=$1')) return periodActive ? row({id:'40',codigo:'D'}) : {rows:[],rowCount:0};
      if(sql.includes('SELECT p.id FROM plantao')) {
        assert.deepEqual(values,['30',['D']]);
        return released ? row({id:'50'}) : {rows:[],rowCount:0};
      }
      if(sql.startsWith('DELETE FROM disponibilidade')) {
        assert.deepEqual(values,[cotistaId,'30']);
        if(deleteRow) deleteWasDone=true;
        return deleteRow ? row({id:'60'}) : {rows:[],rowCount:0};
      }
      return defaultHandle(sql,values);
    };
  };
  await t.test('GET de disponibilidades continua retornando as escolhas do cotista',async()=> {
    deleteWasDone=false;
    const response=await request('GET','/api/disponibilidades?escalaId=20',undefined,'2');
    assert.equal(response.status,200);
    assert.equal(response.headers.get('cache-control'),'no-store');
    assert.equal(response.body[0].diaId,'30');
  });
  await t.test('DELETE exige sessão e perfil cotista',async()=> {
    queries=[];
    assert.equal((await request('DELETE','/api/disponibilidades/30')).status,401);
    assert.equal((await request('DELETE','/api/disponibilidades/30',undefined,'1')).status,403);
    assert(!queries.some(q=>q.sql==='BEGIN READ WRITE'));
  });
  await t.test('DELETE recusa cotista inativo antes de abrir transação',async()=> {
    users[1].cotistaStatus='inativo';queries=[];
    const response=await request('DELETE','/api/disponibilidades/30',undefined,'2');
    assert.equal(response.status,403);
    assert(!queries.some(q=>q.sql==='BEGIN READ WRITE'));
    users[1].cotistaStatus='ativo';
  });
  await t.test('DELETE remove somente a escolha do cotista autenticado e o calendário reflete a remoção',async()=> {
    deleteWasDone=false;configureDelete();queries=[];
    const response=await request('DELETE','/api/disponibilidades/30',undefined,'2');
    assert.equal(response.status,204);assert.equal(response.body,undefined);
    const deletion=queries.find(q=>q.sql.startsWith('DELETE FROM disponibilidade'));
    assert.deepEqual(deletion.values,['10','30']);
    assert.equal(queries.at(-1).sql,'COMMIT');
    const calendar=await request('GET','/api/disponibilidades?escalaId=20',undefined,'2');
    assert.equal(calendar.status,200);assert.deepEqual(calendar.body,[]);
  });
  await t.test('DELETE inexistente retorna 404 sem executar DELETE',async()=> {
    configureDelete({availability:false});queries=[];
    const response=await request('DELETE','/api/disponibilidades/30',undefined,'2');
    assert.equal(response.status,404);
    assert(!queries.some(q=>q.sql.startsWith('DELETE FROM disponibilidade')));
    assert.equal(queries.at(-1).sql,'ROLLBACK');
  });
  await t.test('Cotista nao pode excluir escolha pertencente a outro cotista',async()=> {
    configureDelete({cotistaId:'10'});queries=[];
    const response=await request('DELETE','/api/disponibilidades/30',undefined,'3');
    assert.equal(response.status,404);
    assert.deepEqual(queries.find(q=>q.sql.includes('SELECT id,periodo_id FROM disponibilidade')).values,['11','30']);
    assert(!queries.some(q=>q.sql.startsWith('DELETE FROM disponibilidade')));
  });
  await t.test('DELETE respeita escala fechada',async()=> {
    configureDelete({scaleStatus:'fechada'});queries=[];
    const response=await request('DELETE','/api/disponibilidades/30',undefined,'2');
    assert.equal(response.status,409);
    assert(!queries.some(q=>q.sql.startsWith('DELETE FROM disponibilidade')));
  });
  await t.test('DELETE sem privilégio SQL retorna erro sanitizado e reverte',async()=> {
    configureDelete();queries=[];
    const delegate=handle;
    handle=async(sql,values)=> {
      if(sql.startsWith('DELETE FROM disponibilidade')) throw Object.assign(new Error('permission denied'),{code:'42501'});
      return delegate(sql,values);
    };
    const response=await request('DELETE','/api/disponibilidades/30',undefined,'2');
    assert.equal(response.status,503);
    assert.deepEqual(response.body,{error:'Permissões de escrita do banco não configuradas para esta operação.'});
    assert.equal(queries.at(-1).sql,'ROLLBACK');
    handle=defaultHandle;
  });
  await t.test('DELETE respeita período inativo ou plantão não liberado',async()=> {
    for(const options of [{periodActive:false},{released:false}]) {
      configureDelete(options);queries=[];
      const response=await request('DELETE','/api/disponibilidades/30',undefined,'2');
      assert.equal(response.status,409);
      assert(!queries.some(q=>q.sql.startsWith('DELETE FROM disponibilidade')));
      assert.equal(queries.at(-1).sql,'ROLLBACK');
    }
    handle=defaultHandle;
  });
});
