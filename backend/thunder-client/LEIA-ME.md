# Testes HTTP do backend SISCOTA

> Entrega atual: [coleção enxuta sem environments/scripts](siscota-free.postman_collection.json), [contrato do frontend](../docs/API_FRONTEND.md) e [resultados reais](../docs/STATUS_BACKEND.md). O conteúdo abaixo registra a preparação anterior de 26 casos.

1 endpoint implementado: GET http://localhost:8080/api/escalas/:ano/:mes/calendario.
Porta conferida em backend/.env (somente PORT lido), .env.example e server.js.
Sem headers obrigatórios, autenticação, query ou body; nenhum JSON de envio é necessário.
Todos os casos usam GET. Os detalhes por teste estão também em description na coleção.
As assertions importadas verificam status e Content-Type; conferir o corpo e as regras descritas manualmente.

## Importação e execução

No Thunder Client, Collections → menu → Import → siscota.postman_collection.json.
Em Env, importar siscota.postman_environment.json e ativar o ambiente SISCOTA Local.
baseUrl já contém http://localhost:8080, sem barra final.
Preencher variáveis de períodos SOMENTE com registros/ausências confirmados no banco.
Variáveis vazias não representam dados de teste válidos. Não executar a coleção inteira antes de preenchê-las.
Com o backend iniciado a partir de backend (npm.cmd start), executar primeiro a pasta de validações e depois os casos cujas pré-condições foram confirmadas.
Não foi feita validação da importação na interface do VS Code; JSON e estrutura foram verificados localmente.
Usar os novos arquivos Postman Collection v2.1 e Postman Environment. Os arquivos nativos anteriores foram mantidos para referencia; a importacao deles foi rejeitada na instalacao do usuario. As assertions de status e Content-Type foram convertidas para scripts Postman; confirmar sua conversao na aba Tests do Thunder Client.
Referência de importação: https://docs.thunderclient.com/features/import

## Dados necessários e regras

Não houve conexão direta, escrita ou alteração de estrutura no PostgreSQL. Existência de registros não foi confirmada.
Tabelas lidas pelo serviço: escala, dia (escala_id), periodo e plantao (dia_id, periodo_id).
Para 200, basta uma escala no período; dias e períodos podem estar vazios. Para testar vínculos, são necessários dias e plantões associados e períodos correspondentes.
Para 404 JSON, → necessário confirmar ausência de escala no período válido.
Cenários de distribuição exigem escalas com quantidade_cotas_padrao inteiro 4, 3 e 5 (este último exemplifica valor sem regra aprovada).
4 cotas: 2 diurnas + 2 noturnas; 3 cotas: 1 diurna + 2 noturnas. Cada cota tem 12 horas.
Outros valores: supported=false, contagens null e reason. Alocação N1/N2 permanece pending em todos os casos.
Não há campos obrigatórios de body; ano e mês são segmentos obrigatórios da rota.
Os exemplos usam marcadores estruturais, não registros reais. Tipos de IDs, datas e nulos devem seguir o retorno efetivo do PostgreSQL.

## Resultados reais em 04/11/2026

GET http://localhost:8080/api/escalas/2026/11/calendario → fetch failed / ECONNREFUSED, sem status HTTP.
GET http://localhost:8080/api/escalas/1999/11/calendario → fetch failed / ECONNREFUSED, sem status HTTP.
Demais requisições não executadas. Não foi iniciado um novo servidor.
npm.cmd test em backend: 4 testes existentes passaram; 0 falhas. Não comprovam integração real com banco/HTTP.
A primeira tentativa com npm test foi bloqueada pela política do PowerShell; npm.cmd test funcionou.

## Ausências e problemas observados

Não há rotas de usuários, CRUD de escalas, cotas ou distribuição independente. Não são propostos caminhos para funcionalidades ausentes.
Não há controllers ou validadores separados: a validação fica em escalaRoutes.js e a consulta em calendarService.js.
Não foram localizados backlog ou documento de requisitos no repositório; README descreve apenas o objetivo geral. Regras consultadas: código e testes existentes.
Risco de configuração: database.js → importado e cria o Pool antes de dotenv.config() no corpo de server.js. Variáveis definidas apenas no .env podem não configurar o Pool. Não corrigido nesta tarefa.
Se ocorrer erro de consulta, o código retorna 500 com {"error":"Não foi possível consultar o calendário."}. Não foi induzido erro no banco nem incluído teste que exija indisponibilizá-lo.
Ano/mês usam Number(): notação exponencial e zeros → esquerda podem ser aceitos. A coleção registra esse comportamento atual.
Se houver mais de uma escala no mesmo período, rows[0] → usado sem ORDER BY; não foi verificada restrição de unicidade no banco.
Serviço de e-mail usa require/module.exports em pacote type=module e não → importado por nenhuma rota; não há endpoint de envio para testar.

## Casos preparados

### 1. Ano inválido: 1999

GET `{{baseUrl}}/api/escalas/1999/11/calendario` → HTTP esperado **400**.

Objetivo: Rejeitar ano não inteiro ou fora de 2000–9999.

Pré-condição: Nenhum registro necessário.

Resposta esperada (não obtida):

```json
{
  "error": "Ano inválido. Informe um ano entre 2000 e 9999."
}
```

### 2. Ano inválido: 10000

GET `{{baseUrl}}/api/escalas/10000/11/calendario` → HTTP esperado **400**.

Objetivo: Rejeitar ano não inteiro ou fora de 2000–9999.

Pré-condição: Nenhum registro necessário.

Resposta esperada (não obtida):

```json
{
  "error": "Ano inválido. Informe um ano entre 2000 e 9999."
}
```

### 3. Ano inválido: 2026.5

GET `{{baseUrl}}/api/escalas/2026.5/11/calendario` → HTTP esperado **400**.

Objetivo: Rejeitar ano não inteiro ou fora de 2000–9999.

Pré-condição: Nenhum registro necessário.

Resposta esperada (não obtida):

```json
{
  "error": "Ano inválido. Informe um ano entre 2000 e 9999."
}
```

### 4. Ano inválido: abc

GET `{{baseUrl}}/api/escalas/abc/11/calendario` → HTTP esperado **400**.

Objetivo: Rejeitar ano não inteiro ou fora de 2000–9999.

Pré-condição: Nenhum registro necessário.

Resposta esperada (não obtida):

```json
{
  "error": "Ano inválido. Informe um ano entre 2000 e 9999."
}
```

### 5. Ano inválido: 0

GET `{{baseUrl}}/api/escalas/0/11/calendario` → HTTP esperado **400**.

Objetivo: Rejeitar ano não inteiro ou fora de 2000–9999.

Pré-condição: Nenhum registro necessário.

Resposta esperada (não obtida):

```json
{
  "error": "Ano inválido. Informe um ano entre 2000 e 9999."
}
```

### 6. Ano inválido: -1

GET `{{baseUrl}}/api/escalas/-1/11/calendario` → HTTP esperado **400**.

Objetivo: Rejeitar ano não inteiro ou fora de 2000–9999.

Pré-condição: Nenhum registro necessário.

Resposta esperada (não obtida):

```json
{
  "error": "Ano inválido. Informe um ano entre 2000 e 9999."
}
```

### 7. Ano inválido: Infinity

GET `{{baseUrl}}/api/escalas/Infinity/11/calendario` → HTTP esperado **400**.

Objetivo: Rejeitar ano não inteiro ou fora de 2000–9999.

Pré-condição: Nenhum registro necessário.

Resposta esperada (não obtida):

```json
{
  "error": "Ano inválido. Informe um ano entre 2000 e 9999."
}
```

### 8. Mês inválido: 0

GET `{{baseUrl}}/api/escalas/2026/0/calendario` → HTTP esperado **400**.

Objetivo: Rejeitar mês não inteiro ou fora de 1–12.

Pré-condição: Nenhum registro necessário.

Resposta esperada (não obtida):

```json
{
  "error": "Mês inválido. Informe um mês entre 1 e 12."
}
```

### 9. Mês inválido: 13

GET `{{baseUrl}}/api/escalas/2026/13/calendario` → HTTP esperado **400**.

Objetivo: Rejeitar mês não inteiro ou fora de 1–12.

Pré-condição: Nenhum registro necessário.

Resposta esperada (não obtida):

```json
{
  "error": "Mês inválido. Informe um mês entre 1 e 12."
}
```

### 10. Mês inválido: 1.5

GET `{{baseUrl}}/api/escalas/2026/1.5/calendario` → HTTP esperado **400**.

Objetivo: Rejeitar mês não inteiro ou fora de 1–12.

Pré-condição: Nenhum registro necessário.

Resposta esperada (não obtida):

```json
{
  "error": "Mês inválido. Informe um mês entre 1 e 12."
}
```

### 11. Mês inválido: abc

GET `{{baseUrl}}/api/escalas/2026/abc/calendario` → HTTP esperado **400**.

Objetivo: Rejeitar mês não inteiro ou fora de 1–12.

Pré-condição: Nenhum registro necessário.

Resposta esperada (não obtida):

```json
{
  "error": "Mês inválido. Informe um mês entre 1 e 12."
}
```

### 12. Mês inválido: -1

GET `{{baseUrl}}/api/escalas/2026/-1/calendario` → HTTP esperado **400**.

Objetivo: Rejeitar mês não inteiro ou fora de 1–12.

Pré-condição: Nenhum registro necessário.

Resposta esperada (não obtida):

```json
{
  "error": "Mês inválido. Informe um mês entre 1 e 12."
}
```

### 13. Mês inválido: Infinity

GET `{{baseUrl}}/api/escalas/2026/Infinity/calendario` → HTTP esperado **400**.

Objetivo: Rejeitar mês não inteiro ou fora de 1–12.

Pré-condição: Nenhum registro necessário.

Resposta esperada (não obtida):

```json
{
  "error": "Mês inválido. Informe um mês entre 1 e 12."
}
```

### 14. Ano tem prioridade sobre mês

GET `{{baseUrl}}/api/escalas/abc/abc/calendario` → HTTP esperado **400**.

Objetivo: Confirmar ordem das validações.

Pré-condição: Nenhum registro necessário.

Resposta esperada (não obtida):

```json
{
  "error": "Ano inválido. Informe um ano entre 2000 e 9999."
}
```

### 15. Calendário existente

GET `{{baseUrl}}/api/escalas/{{anoExistente}}/{{mesExistente}}/calendario` → HTTP esperado **200**.

Objetivo: Consultar escala, dias, períodos e plantões associados.

Pré-condição: Confirmar escala existente e preencher anoExistente/mesExistente. Listas podem estar vazias. Exemplo de distribuição requer quantidade_cotas_padrao = 4; adaptar ao registro real.

Resposta esperada (não obtida):

```json
{
  "escala": {
    "id": "<valor retornado do banco>",
    "nome": "<valor retornado do banco>",
    "mes": "<valor retornado do banco>",
    "ano": "<valor retornado do banco>",
    "dataInicio": "<valor retornado do banco>",
    "dataFim": "<valor retornado do banco>",
    "status": "<valor retornado do banco>",
    "observacao": "<valor retornado do banco>",
    "criadaEm": "<valor retornado do banco>",
    "quantidadeCotasPadrao": "<valor retornado do banco>"
  },
  "dias": [
    {
      "id": "<dia.id>",
      "escalaId": "<escala.id>",
      "data": "<dia.data>",
      "plantoes": [
        {
          "id": "<valor retornado do banco>",
          "diaId": "<valor retornado do banco>",
          "periodoId": "<valor retornado do banco>",
          "quantidadeNecessaria": "<valor retornado do banco>",
          "status": "<valor retornado do banco>",
          "observacao": "<valor retornado do banco>",
          "criadoEm": "<valor retornado do banco>"
        }
      ]
    }
  ],
  "periodos": [
    {
      "id": "<valor retornado do banco>",
      "codigo": "<valor retornado do banco>",
      "nome": "<valor retornado do banco>",
      "descricao": "<valor retornado do banco>",
      "horaInicio": "<valor retornado do banco>",
      "horaFim": "<valor retornado do banco>",
      "status": "<valor retornado do banco>"
    }
  ],
  "distribuicaoDiariaPadrao": {
    "totalQuotas": 4,
    "hoursPerQuota": 12,
    "nightPeriodAllocation": "pending",
    "supported": true,
    "diurnalQuotas": 2,
    "nightQuotas": 2
  }
}
```

### 16. Escala inexistente

GET `{{baseUrl}}/api/escalas/{{anoInexistente}}/{{mesInexistente}}/calendario` → HTTP esperado **404**.

Objetivo: Distinguir período válido sem escala de parâmetro inválido.

Pré-condição: Confirmar ausência de escala no período e preencher anoInexistente/mesInexistente válidos.

Resposta esperada (não obtida):

```json
{
  "error": "Escala não encontrada para o período informado."
}
```

### 17. Período válido - limite inferior

GET `{{baseUrl}}/api/escalas/2000/1/calendario` → HTTP esperado **404**.

Objetivo: Confirmar que passa pela validação e consulta o banco.

Pré-condição: Confirmar que o período não possui escala. Se existir, esperar 200 e estrutura do calendário; nunca 400. Banco deve estar acessível.

Resposta esperada (não obtida):

```json
{
  "error": "Escala não encontrada para o período informado."
}
```

### 18. Período válido - limite superior

GET `{{baseUrl}}/api/escalas/9999/12/calendario` → HTTP esperado **404**.

Objetivo: Confirmar que passa pela validação e consulta o banco.

Pré-condição: Confirmar que o período não possui escala. Se existir, esperar 200 e estrutura do calendário; nunca 400. Banco deve estar acessível.

Resposta esperada (não obtida):

```json
{
  "error": "Escala não encontrada para o período informado."
}
```

### 19. Período válido - notação numérica aceita por Number

GET `{{baseUrl}}/api/escalas/2e3/01/calendario` → HTTP esperado **404**.

Objetivo: Confirmar que passa pela validação e consulta o banco.

Pré-condição: Confirmar que o período não possui escala. Se existir, esperar 200 e estrutura do calendário; nunca 400. Banco deve estar acessível.

Resposta esperada (não obtida):

```json
{
  "error": "Escala não encontrada para o período informado."
}
```

### 20. Distribuição de 4 cotas

GET `{{baseUrl}}/api/escalas/{{anoCotas4}}/{{mesCotas4}}/calendario` → HTTP esperado **200**.

Objetivo: Conferir distribuição padrão e alocação noturna pendente, sem atribuir N1/N2.

Pré-condição: Confirmar escala com quantidade_cotas_padrao inteiro igual a 4; preencher anoCotas4/mesCotas4. Não cadastrar automaticamente.

Resposta esperada (não obtida):

```json
{
  "escala": {
    "id": "<valor retornado do banco>",
    "nome": "<valor retornado do banco>",
    "mes": "<valor retornado do banco>",
    "ano": "<valor retornado do banco>",
    "dataInicio": "<valor retornado do banco>",
    "dataFim": "<valor retornado do banco>",
    "status": "<valor retornado do banco>",
    "observacao": "<valor retornado do banco>",
    "criadaEm": "<valor retornado do banco>",
    "quantidadeCotasPadrao": 4
  },
  "dias": [
    {
      "id": "<dia.id>",
      "escalaId": "<escala.id>",
      "data": "<dia.data>",
      "plantoes": [
        {
          "id": "<valor retornado do banco>",
          "diaId": "<valor retornado do banco>",
          "periodoId": "<valor retornado do banco>",
          "quantidadeNecessaria": "<valor retornado do banco>",
          "status": "<valor retornado do banco>",
          "observacao": "<valor retornado do banco>",
          "criadoEm": "<valor retornado do banco>"
        }
      ]
    }
  ],
  "periodos": [
    {
      "id": "<valor retornado do banco>",
      "codigo": "<valor retornado do banco>",
      "nome": "<valor retornado do banco>",
      "descricao": "<valor retornado do banco>",
      "horaInicio": "<valor retornado do banco>",
      "horaFim": "<valor retornado do banco>",
      "status": "<valor retornado do banco>"
    }
  ],
  "distribuicaoDiariaPadrao": {
    "totalQuotas": 4,
    "hoursPerQuota": 12,
    "nightPeriodAllocation": "pending",
    "supported": true,
    "diurnalQuotas": 2,
    "nightQuotas": 2
  }
}
```

### 21. Distribuição de 3 cotas

GET `{{baseUrl}}/api/escalas/{{anoCotas3}}/{{mesCotas3}}/calendario` → HTTP esperado **200**.

Objetivo: Conferir distribuição padrão e alocação noturna pendente, sem atribuir N1/N2.

Pré-condição: Confirmar escala com quantidade_cotas_padrao inteiro igual a 3; preencher anoCotas3/mesCotas3. Não cadastrar automaticamente.

Resposta esperada (não obtida):

```json
{
  "escala": {
    "id": "<valor retornado do banco>",
    "nome": "<valor retornado do banco>",
    "mes": "<valor retornado do banco>",
    "ano": "<valor retornado do banco>",
    "dataInicio": "<valor retornado do banco>",
    "dataFim": "<valor retornado do banco>",
    "status": "<valor retornado do banco>",
    "observacao": "<valor retornado do banco>",
    "criadaEm": "<valor retornado do banco>",
    "quantidadeCotasPadrao": 3
  },
  "dias": [
    {
      "id": "<dia.id>",
      "escalaId": "<escala.id>",
      "data": "<dia.data>",
      "plantoes": [
        {
          "id": "<valor retornado do banco>",
          "diaId": "<valor retornado do banco>",
          "periodoId": "<valor retornado do banco>",
          "quantidadeNecessaria": "<valor retornado do banco>",
          "status": "<valor retornado do banco>",
          "observacao": "<valor retornado do banco>",
          "criadoEm": "<valor retornado do banco>"
        }
      ]
    }
  ],
  "periodos": [
    {
      "id": "<valor retornado do banco>",
      "codigo": "<valor retornado do banco>",
      "nome": "<valor retornado do banco>",
      "descricao": "<valor retornado do banco>",
      "horaInicio": "<valor retornado do banco>",
      "horaFim": "<valor retornado do banco>",
      "status": "<valor retornado do banco>"
    }
  ],
  "distribuicaoDiariaPadrao": {
    "totalQuotas": 3,
    "hoursPerQuota": 12,
    "nightPeriodAllocation": "pending",
    "supported": true,
    "diurnalQuotas": 1,
    "nightQuotas": 2
  }
}
```

### 22. Distribuição de 5 cotas

GET `{{baseUrl}}/api/escalas/{{anoCotas5}}/{{mesCotas5}}/calendario` → HTTP esperado **200**.

Objetivo: Conferir distribuição padrão e alocação noturna pendente, sem atribuir N1/N2.

Pré-condição: Confirmar escala com quantidade_cotas_padrao inteiro igual a 5; preencher anoCotas5/mesCotas5. Não cadastrar automaticamente.

Resposta esperada (não obtida):

```json
{
  "escala": {
    "id": "<valor retornado do banco>",
    "nome": "<valor retornado do banco>",
    "mes": "<valor retornado do banco>",
    "ano": "<valor retornado do banco>",
    "dataInicio": "<valor retornado do banco>",
    "dataFim": "<valor retornado do banco>",
    "status": "<valor retornado do banco>",
    "observacao": "<valor retornado do banco>",
    "criadaEm": "<valor retornado do banco>",
    "quantidadeCotasPadrao": 5
  },
  "dias": [
    {
      "id": "<dia.id>",
      "escalaId": "<escala.id>",
      "data": "<dia.data>",
      "plantoes": [
        {
          "id": "<valor retornado do banco>",
          "diaId": "<valor retornado do banco>",
          "periodoId": "<valor retornado do banco>",
          "quantidadeNecessaria": "<valor retornado do banco>",
          "status": "<valor retornado do banco>",
          "observacao": "<valor retornado do banco>",
          "criadoEm": "<valor retornado do banco>"
        }
      ]
    }
  ],
  "periodos": [
    {
      "id": "<valor retornado do banco>",
      "codigo": "<valor retornado do banco>",
      "nome": "<valor retornado do banco>",
      "descricao": "<valor retornado do banco>",
      "horaInicio": "<valor retornado do banco>",
      "horaFim": "<valor retornado do banco>",
      "status": "<valor retornado do banco>"
    }
  ],
  "distribuicaoDiariaPadrao": {
    "totalQuotas": 5,
    "hoursPerQuota": 12,
    "nightPeriodAllocation": "pending",
    "supported": false,
    "diurnalQuotas": null,
    "nightQuotas": null,
    "reason": "Quantidade de cotas sem regra de distribuição aprovada."
  }
}
```

### 23. Escala sem dias

GET `{{baseUrl}}/api/escalas/{{anoSemDias}}/{{mesSemDias}}/calendario` → HTTP esperado **200**.

Objetivo: Confirmar retorno de dias vazio, mantendo períodos e distribuição.

Pré-condição: Confirmar escala existente sem registros em dia; preencher anoSemDias/mesSemDias. Distribuição depende da quantidade real.

Resposta esperada (não obtida):

```json
{
  "escala": {
    "id": "<valor retornado do banco>",
    "nome": "<valor retornado do banco>",
    "mes": "<valor retornado do banco>",
    "ano": "<valor retornado do banco>",
    "dataInicio": "<valor retornado do banco>",
    "dataFim": "<valor retornado do banco>",
    "status": "<valor retornado do banco>",
    "observacao": "<valor retornado do banco>",
    "criadaEm": "<valor retornado do banco>",
    "quantidadeCotasPadrao": "<valor retornado do banco>"
  },
  "dias": [],
  "periodos": [
    {
      "id": "<valor retornado do banco>",
      "codigo": "<valor retornado do banco>",
      "nome": "<valor retornado do banco>",
      "descricao": "<valor retornado do banco>",
      "horaInicio": "<valor retornado do banco>",
      "horaFim": "<valor retornado do banco>",
      "status": "<valor retornado do banco>"
    }
  ],
  "distribuicaoDiariaPadrao": {
    "totalQuotas": 4,
    "hoursPerQuota": 12,
    "nightPeriodAllocation": "pending",
    "supported": true,
    "diurnalQuotas": 2,
    "nightQuotas": 2
  }
}
```

### 24. Mês ausente

GET `{{baseUrl}}/api/escalas/2026/calendario` → HTTP esperado **404**.

Objetivo: Confirmar que rota incompleta não corresponde ao endpoint (404 HTML, não erro JSON de validação).

Pré-condição: Nenhum registro necessário.

Resposta esperada (não obtida):

```json
"<!DOCTYPE html> ... <pre>Cannot GET /api/escalas/2026/calendario</pre> ..."
```

### 25. Ano ausente

GET `{{baseUrl}}/api/escalas//11/calendario` → HTTP esperado **404**.

Objetivo: Confirmar que rota incompleta não corresponde ao endpoint (404 HTML, não erro JSON de validação).

Pré-condição: Nenhum registro necessário.

Resposta esperada (não obtida):

```json
"<!DOCTYPE html> ... <pre>Cannot GET /api/escalas//11/calendario</pre> ..."
```

### 26. Ano e mês ausentes

GET `{{baseUrl}}/api/escalas/calendario` → HTTP esperado **404**.

Objetivo: Confirmar que rota incompleta não corresponde ao endpoint (404 HTML, não erro JSON de validação).

Pré-condição: Nenhum registro necessário.

Resposta esperada (não obtida):

```json
"<!DOCTYPE html> ... <pre>Cannot GET /api/escalas/calendario</pre> ..."
```

