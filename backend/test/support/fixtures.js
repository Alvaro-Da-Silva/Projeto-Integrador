import { randomUUID, randomInt } from 'node:crypto';
import { writeTestData } from './testDatabase.js';

// Colunas e constraints conferidas no catalogo real de public em 04/11/2026.
// IDs explicitos: nao avancar sequences, que nao seriam revertidas por ROLLBACK.
export async function seedFixtures(client) {
  const id = -Date.now() * 100 - randomInt(100);
  const token = randomUUID();
  const ids = Object.fromEntries(['perfil', 'usuario', 'cotista', 'escala', 'periodo', 'dia',
    'plantao', 'disponibilidade', 'participacao', 'solicitacao', 'notificacao'].map((name, i) => [name, String(id - i)]));
  const identityTables = ['perfil','usuario','cotista','escala','periodo','dia',
    'plantao','disponibilidade','participacao','solicitacao','notificacao'];
  const insert = (sql, values) => {
    // O esquema real usa GENERATED ALWAYS. OVERRIDING fornece IDs de fixture
    // sem desabilitar constraints nem avancar sequences.
    if (identityTables.some(table => sql.startsWith(`INSERT INTO public.${table} `))) {
      sql = sql.replace(/\)\s+VALUES/, ') OVERRIDING SYSTEM VALUE VALUES');
    }
    return writeTestData(client, sql, values);
  };
  // Escolher periodo realmente livre dentro do intervalo aceito pela API.
  const free = await client.query(`SELECT y AS ano, m AS mes
    FROM generate_series(2000, 9999) y CROSS JOIN generate_series(1, 12) m
    WHERE NOT EXISTS (SELECT FROM public.escala e WHERE e.ano = y AND e.mes = m)
    ORDER BY y, m LIMIT 1`);
  if (!free.rowCount) throw new Error('Nao existe periodo livre para fixture.');
  const { ano, mes } = free.rows[0];
  const date = `${ano}-${String(mes).padStart(2, '0')}-01`;
  await insert('INSERT INTO public.perfil (id, nome) VALUES ($1, $2)', [ids.perfil, `test-${token}`]);
  await insert('INSERT INTO public.usuario (id, nome, email, senha_hash, perfil_id) VALUES ($1,$2,$3,$4,$5)',
    [ids.usuario, 'Teste isolado', `${token}@example.invalid`, 'fixture-sem-login', ids.perfil]);
  await insert('INSERT INTO public.cotista (id, usuario_id, nome, cpf) VALUES ($1,$2,$3,$4)',
    [ids.cotista, ids.usuario, 'Teste isolado', String(randomInt(10000000000, 99999999999))]);
  await insert(`INSERT INTO public.escala (id,nome,mes,ano,data_inicio,data_fim,quantidade_cotas_padrao)
    VALUES ($1,$2,$3,$4,$5,$5,4)`, [ids.escala, `test-${token}`, mes, ano, date]);
  await insert(`INSERT INTO public.periodo (id,codigo,nome,hora_inicio,hora_fim)
    VALUES ($1,$2,$3,'08:00','20:00')`, [ids.periodo, `T${randomInt(100000000,999999999)}`, 'Teste isolado']);
  await insert('INSERT INTO public.dia (id,escala_id,data) VALUES ($1,$2,$3)', [ids.dia, ids.escala, date]);
  await insert('INSERT INTO public.plantao (id,dia_id,periodo_id,quantidade_necessaria) VALUES ($1,$2,$3,1)',
    [ids.plantao, ids.dia, ids.periodo]);
  await insert('INSERT INTO public.disponibilidade (id,cotista_id,dia_id,periodo_id) VALUES ($1,$2,$3,$4)',
    [ids.disponibilidade, ids.cotista, ids.dia, ids.periodo]);
  await insert('INSERT INTO public.participacao (id,cotista_id,plantao_id) VALUES ($1,$2,$3)',
    [ids.participacao, ids.cotista, ids.plantao]);
  await insert('INSERT INTO public.solicitacao (id,cotista_id,participacao_id,tipo,descricao) VALUES ($1,$2,$3,$4,$5)',
    [ids.solicitacao, ids.cotista, ids.participacao, 'troca', 'Fixture de integridade']);
  await insert('INSERT INTO public.notificacao (id,usuario_id,canal,tipo) VALUES ($1,$2,$3,$4)',
    [ids.notificacao, ids.usuario, 'teste', 'fixture']);
  await insert('INSERT INTO public."user" (id,name,email,"emailVerified") VALUES ($1,$2,$3,false)',
    [token, 'Teste isolado', `${token}@example.invalid`]);
  await insert(`INSERT INTO public.account (id,"accountId","providerId","userId","updatedAt")
    VALUES ($1,$1,$2,$1,CURRENT_TIMESTAMP)`, [token, 'fixture']);
  await insert(`INSERT INTO public.session (id,"expiresAt",token,"updatedAt","userId")
    VALUES ($1,CURRENT_TIMESTAMP + interval '1 hour',$2,CURRENT_TIMESTAMP,$1)`, [token, randomUUID()]);
  await insert(`INSERT INTO public.verification (id,identifier,value,"expiresAt")
    VALUES ($1,$2,$3,CURRENT_TIMESTAMP + interval '1 hour')`, [token, 'fixture', 'sem-uso-real']);
  await insert(`INSERT INTO public.jwks (id,"publicKey","privateKey","createdAt")
    VALUES ($1,$2,$3,CURRENT_TIMESTAMP)`, [token, 'fixture-nao-criptografica', 'fixture-nao-criptografica']);
  return { ...ids, token, ano, mes, date, missingId: String(id - 100) };
}
