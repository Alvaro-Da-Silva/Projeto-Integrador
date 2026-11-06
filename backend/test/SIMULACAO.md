# Simulação PostgreSQL — preparação em 04/11/2026

> Plano anterior, substituído pela simulação autorizada de novembro/2026 em siscota. Consulte [STATUS_BACKEND.md](../docs/STATUS_BACKEND.md); não executar o seed de três meses como se fosse a solicitação atual.

## Estado real

- Conexão com `siscota` confirmada por SELECT current_database(), sem escrita no principal.
- `siscota_test` ainda não existe. O usuário conectado, siscota_codex, não tem CREATEDB.
- Usuário informou que vai configurar TEST_ADMIN_DATABASE_URL em `.env.test`; na última verificação essa variável ainda não estava configurada. Não enviar senha no chat.
- `.env.test` criado localmente, ignorado pelo Git, com TEST_DATABASE_URL exclusivamente para `/siscota_test`, TEST_DB_WRITES=authorized, PG_BIN e porta isolada 8081. Nenhuma credencial foi impressa.
- Ferramentas localizadas: `H:\Postgress\bin\pg_dump.exe` e `psql.exe`, ambas versão 18.6.
- Esquema real exportado por pg_dump, sem dados, para `scripts/siscota-test-schema.sql`. Não foi restaurado nem alterado manualmente.
- **Nenhum banco criado e nenhum registro inserido. IDs reais ainda não existem.**

## Plano para confirmação antes do seed

Plano completo editável: `scripts/demo-plan.json`. SHA256 atual: `fb55486751aed57006cce04500afacff24aafc2cb3015012863b5c1096b6663a`.

| Escala | Intervalo | Cotas/dia | Plantões por dia propostos |
| --- | --- | --- | --- |
| TESTE Novembro 2026 | 01–30/11/2026 | 4 | TESTE_D: 2 vagas; TESTE_N: 2 vagas |
| TESTE Dezembro 2026 | 01–31/12/2026 | 3 | TESTE_D: 1 vaga; TESTE_N: 2 vagas |
| TESTE Janeiro 2027 | 01–31/01/2027 | 5 | Nenhum; distribuição pendente, sem regra aprovada |

Períodos sintéticos propostos: TESTE_D 08:00–20:00 e TESTE_N 20:00–08:00. Os horários são dados de demonstração sujeitos à confirmação, não novas regras produtivas. TESTE_N representa o agregado noturno da demonstração; não divide N1/N2. A API continuará retornando nightPeriodAllocation=pending conforme o serviço existente.

Cotistas propostos: TESTE Cotista 01, 02, 03 e 04, sem vínculo a usuario (FK opcional). CPFs de teste, respectivamente `00000000001` a `00000000004`: valores sintéticos deliberadamente sem validade documental, aceitos pelas constraints físicas atuais, sem alegação de validade de dígitos verificadores. O backend analisado não implementa validação de CPF.

Participações manuais, todas pendentes, somente no primeiro dia de cada escala:

- 01/11: cotistas 01/02 em TESTE_D; 03/04 em TESTE_N.
- 01/12: cotista 01 em TESTE_D; 03/04 em TESTE_N.
- Janeiro: nenhuma participação.

Não serão criados registros de disponibilidade nem executado algoritmo de seleção de cotistas. As participações propostas são vínculos estruturais de demonstração; não representam uma regra aprovada de elegibilidade.

Totais propostos: **3 escalas, 92 dias, 2 períodos, 122 plantões, 4 cotistas e 7 participações**. Todos os registros com campo de nome/observação/descrição disponível recebem identificação TESTE. Dias são identificados pela escala de teste e respectiva FK. O estado persistente ainda depende da confirmação deste plano.

## Comandos PowerShell após desbloqueio e confirmação

Executar a partir de `backend`. Os comandos abaixo estão preparados; não comprovam execução.

```powershell
# Após informar conexão administrativa privada para /postgres no mesmo servidor:
npm.cmd run test:db:prepare

# Exibir proposta, sem conexão nem INSERT:
npm.cmd run demo:plan

# SOMENTE após confirmar os dados exatos do plano:
npm.cmd run demo:seed -- --confirm-plan=fb55486751aed57006cce04500afacff24aafc2cb3015012863b5c1096b6663a

# Fixtures transacionais separadas; não removem os dados persistentes do demo:
npm.cmd run test:integration

# Terminal 1, configuração isolada e imports após configurar DATABASE_URL:
npm.cmd run start:test

# Terminal 2: somente SELECTs e GETs, compara PostgreSQL e HTTP:
npm.cmd run demo:audit
```

O script de preparação cria o banco com proprietário igual ao usuário da conexão de origem; restaura somente o esquema via conexão de siscota_test. A conexão administrativa não é usada pela suíte ou API. Não concede novos privilégios ao banco principal. A identidade é consultada antes de CREATE DATABASE no banco administrativo postgres; nas escritas do destino, SELECT current_database() exige siscota_test. O banco inexistente não poderia ser a conexão da operação CREATE DATABASE.

O seed exige confirmação do hash do arquivo e autorização de escrita, verifica current_database() antes de cada INSERT e antes de COMMIT, e executa a carga inteira em transação. Colisões de mês/ano, código ou CPF não provocam sobrescrita. Uma demonstração já identificada com o mesmo hash não é reaplicada. Alterações manuais não são revertidas pelo seed. IDs só são retornados como PERSISTIDO após COMMIT; não foram antecipados como se já existissem.

## URLs propostas (respostas reais ainda não obtidas)

- http://127.0.0.1:8081/api/escalas/2026/11/calendario
- http://127.0.0.1:8081/api/escalas/2026/12/calendario
- http://127.0.0.1:8081/api/escalas/2027/1/calendario

## Testes executados nesta preparação

Somente grupo sem PostgreSQL real, usando filtro explícito para não antecipar a execução prevista após confirmação:

```powershell
node --test --test-isolation=none --test-skip-pattern='^PostgreSQL real:' test/*.test.js test/integration/*.test.js
```

Resultado: **32 casos individuais aprovados, zero falhas** (runner: 34 entradas aprovadas, incluindo 2 agrupamentos). O grupo real foi excluído pelo filtro, portanto não aparece como skip nesse resultado. Não houve conexão de escrita decorrente desses testes. Scripts novos verificados com node --check. Suíte completa, seed, API de teste e auditoria do demo ainda não executados.

## Auditoria preparada e limitações

`scripts/audit-demo.js` aceita apenas a conexão de siscota_test e executa transação somente de leitura. Verifica órfãos por todas as FKs reais, duplicações por PKs/UNIQUEs, dias fora do intervalo, quantidades de plantão não positivas, escalas/dias/plantões previstos e divergências de IDs/quantidades entre SELECTs e respostas HTTP. Não imprime senhas, tokens ou registros de autenticação. Falhas de dados e bloqueios de consulta HTTP são reportados separadamente.

5 cotas com distribuição não suportada e N1/N2 pendente são comportamentos intencionais. Horários de teste e vínculos de participação são propostas de dados, não requisitos de produção. Não se afirma que a ausência de constraint entre dia e intervalo de escala seja defeito sem requisito aprovado. Não existem resultados reais do demo para classificar como inconsistências neste momento.

## Modificar e repetir

Antes da primeira carga, editar meses, cotas, horários, cotistas e vínculos no JSON do plano; executar demo:plan; revisar e confirmar o novo hash antes do seed. Caso mude o plano, o hash antigo deixa de funcionar.

Depois da carga, selecionar explicitamente siscota_test no cliente SQL e confirmar `SELECT current_database()` antes de editar. Usar os IDs retornados pelo seed e transação com UPDATE parametrizado ou WHERE por ID. Manter meses únicos, datas coerentes e FKs existentes. Os códigos de demonstração não representam novos períodos produtivos.

Executar demo:audit para registrar divergências em relação ao plano e test:integration para verificar a suíte independente. O seed não é um reset nem migração: não apaga, não sobrescreve e recusa trocar um plano já persistido por outro. Restauração ou substituição de uma carga existente exige planejamento separado; nenhum DROP/TRUNCATE foi preparado.

## Arquivos desta etapa

Modificados: scripts/prepare-test-database.js, package.json, .env.test.example. Criados: .env.test (privado e ignorado), scripts/siscota-test-schema.sql (exportação real), scripts/demo-plan.json, scripts/seed-demo.js, scripts/start-test-api.js, scripts/audit-demo.js e test/SIMULACAO.md. Nenhum endpoint ou regra de negócio foi alterado.
