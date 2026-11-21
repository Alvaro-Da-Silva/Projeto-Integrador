# Diagnóstico do cadastro na VM — 21/11/2026

O POST /api/usuarios falha porque o papel efetivo siscota não possui INSERT nas tabelas de provisionamento. O código trata SQLSTATE 42501 como HTTP 503. A correção proposta é a migração 008_user_provisioning_runtime.sql. Nenhuma alteração desta investigação foi aplicada ao banco ou aos serviços da VM.

## Evidências

- SSH configurado autenticou no IP atual 172.24.107.174. O endereço anterior 172.24.98.15 expirou. sudo exige senha no terminal.
- installed_id e installed_path, carregados de /usr/local/lib/siscota-cd/release-paths.sh, identificaram ambos os processos em /srv/siscota-cd/releases/06c11464f390bde9b9424bc93f06d48fdcb78da2. Backend e frontend ativos. A ponta remota deploy coincide com esse commit, merge do PR #85.
- Frontend remoto está em 383f77c24170ae7301b2f3732742b1d41ed21198. A implementação de cadastro foi adicionada por c84442560cfb014888b0b8c4168ebb3e05b056dd e está na release ativa. O backup não contém identificação Git. O commit exato e eventuais alterações locais testadas no PC de Álvaro exigem git rev-parse HEAD e git status --short nesse PC.
- PostgreSQL da VM 18.7. As consultas usaram BEGIN READ ONLY, banco siscota, papel siscota, sem superuser, CREATEDB, CREATEROLE ou BYPASSRLS. Existem os perfis admin e cotista. Nenhuma tabela pública de controle de migrações foi encontrada. A análise confirma efeitos estruturais, sem atribuir execução histórica de arquivos SQL.
- /var/log/postgresql/postgresql-18-main.log contém permission denied for table user em 21/11 às 17:17:25.573, 17:17:31.592, 17:17:42.238 e 17:18:12.702 UTC, equivalentes a 14h17–14h18 em Brasília.
- usuarioRoutes.js aplica authenticate e requireRole('admin') antes de postUsuario. usuarioService.js insere user, account, usuario e, para perfil cotista, cotista em uma única transação. erroDeBanco converte 42501 para 503 com a mensagem de permissões pendentes. A transação faz ROLLBACK em caso de falha.
- Consultas has_table_privilege confirmaram INSERT ausente nas quatro tabelas. has_sequence_privilege confirmou USAGE ausente em usuario_id_seq e cotista_id_seq. SELECT está presente. O script grant-user-provisioning.sql adicionado em c844425 aponta para siscota_codex e omite essas sequences. Os IDs são GENERATED ALWAYS AS IDENTITY, portanto dispensam USAGE explícito nesse INSERT. O destino incorreto dos grants não atende ao runtime da VM.
- Journald do backend/frontend no dia consultado registra inicialização, sem a exceção de cadastro. O handler converte a exceção sem registrá-la. Nginx usa access_log off no virtual host. Os erros de proxy às 16:43 UTC foram conexão recusada durante inicialização e não comprovam a origem do 503 de cadastro. A atribuição do 503 usa o erro PostgreSQL, os privilégios efetivos e reprodução isolada do mesmo fluxo.
- GET local via Nginx e Host teste.siscota.app.br retornou a mensagem Escala não encontrada para o período informado. A consulta read-only encontrou zero escalas de ano 2026 e mês 11. calendarService retorna null e escalaController devolve 404 nessa condição. É ausência de escala, independente das permissões do cadastro. Criar escala é operação funcional com dados próprios, fora desta correção.
- O timer siscota-cd estava active/enabled na inspeção. O estado foi apenas consultado. A aplicação administrativa futura deve adquirir o mesmo deploy.lock usado pelo CD.

## Backup e comparação

Arquivo H:\Downloads\dump-postgres-202611211516.sql, 190725 bytes. A assinatura PGDMP e pg_restore --list identificam formato CUSTOM 1.16-0, compressão gzip, 118 entradas, pg_dump e servidor de origem 18.1, criado em 21/11/2026 às 15:16:44 segundo o cabeçalho, sem fuso explícito. Banco postgres, esquema de aplicação public, UTF8 e locale Portuguese_Brazil.1252. O arquivo contém dados, mas somente --schema-only foi extraído e restaurado no cluster descartável local em 127.0.0.1:55439. Nenhum usuário, credencial, sessão ou dado de Álvaro foi restaurado.

A extração DDL da VM por pg_dump com o runtime não foi concluída por falta de privilégios suficientes. A comparação usou consultas read-only a pg_attribute, pg_attrdef, pg_constraint, pg_indexes, pg_proc, pg_class e pg_policies, incluindo tipos, defaults, nulabilidade, identidades, colunas geradas, constraints, índices, definições de funções e RLS. Os catálogos estruturais e o DDL extraído do backup estão nos artefatos locais da investigação.

| Item | VM | Backup | Relação com cadastro |
| --- | --- | --- | --- |
| Tabelas e sequences | 17 tabelas, 12 sequences | Mesmos objetos | Nenhuma tabela faltante |
| Colunas | 137 | 137 | Tipos, defaults e demais atributos coincidem, exceto nulabilidade de contato |
| Contato de cotista | nascimento, telefone e email NOT NULL, checks de texto não vazio | Três colunas nullable e sem os dois checks | VM é mais restrita, compatível com validação já feita pelo serviço |
| Índices | 34 | Mesmas definições | Sem divergência de índice no fluxo de identidade |
| Constraints | 162 | 157 | Diferença líquida de três NOT NULL e dois checks de contato. Há também nomes diferentes de FKs/checks e formas diferentes de casts em expressões de enumeração |
| user/account/session | Estruturas e constraints coincidem | Estruturas e constraints coincidem | Falta de permissão, sem indicação de coluna ausente |
| Vínculo usuario/better-auth | Coluna, UNIQUE e FK presentes | Presentes | Efeito estrutural da 004 presente nos dois |
| Campos de administração e escala definitiva | Presentes | Presentes | Efeitos relevantes de 005–007 presentes, sem exigir reaplicação |
| Funções | 41 funções da extensão dblink 1.2 em public | Nenhuma função em public | Fora do fluxo de provisionamento inspecionado |
| RLS | Sem políticas nas tabelas comparadas | Mesmo estado | Não explica o erro |
| Proprietário | postgres | postgres | O proprietário não identifica a conexão utilizada pelo aplicativo de Álvaro |
| ACLs | Papel siscota com grants restritos | Sem GRANT/REVOKE explícitos no DDL extraído | Dump de banco não inclui configuração global completa de roles. Não comprova os privilégios efetivos do aplicativo no PC |

## Correção preparada

Branch local fix/cadastro-permissoes, baseada em 06c11464. A migração 008 concede apenas INSERT em user/account/usuario/cotista sem expandir privilégios das sequences IDENTITY. BEGIN/COMMIT tornam a mudança atômica, com timeouts, conferência de destino, runtime restrito e colunas IDENTITY, mais pós-condições. Não altera tabelas ou registros existentes. A autorização HTTP continua com os mesmos middlewares. Permissões adicionais de edição e suspensão de contas não fazem parte da 008.

O CI em ops/deploy/check-db.sh continua validando o baseline anterior, depois aplica a 008 e verifica o novo contrato. O script de recuperação revoga os quatro grants ausentes na inspeção inicial e preserva contas criadas. Revalidar esse estado inicial antes de aplicar a recuperação em outra instalação.

## Validação realizada

PostgreSQL 18 local isolado, apenas esquema do backup e dados sintéticos. Foram acrescentadas as três exigências NOT NULL e os dois checks de contato da VM. Os grants relevantes do runtime foram reproduzidos, inclusive default_transaction_read_only=on e UPDATE(id) preexistente em cotista. O teste usa o Express e o PostgreSQL reais. O provedor de sessão é injetado com identidades sintéticas para testar autenticação/autorização do backend, sem navegador, login Better Auth externo ou emissão JWT real.

Dez testes passaram, incluindo o teste agregador. Os nove cenários cobrem reprodução do 503 antes da migração e ausência de conta parcial, aplicação repetível, cadastro de administrador com credencial e vínculo, rollback completo por falha no último INSERT, cadastro de cotista com contato, duplicidade de email com normalização de caixa, 401 anônimo, 403 cotista e origem indevida, privilégios administrativos e DELETE preservados, além da recuperação com revogação e preservação das contas. As rejeições de acesso foram exercitadas após a expansão de privilégios.

Também foram aplicados em cluster isolado a fixture versionada, migrações 003–007, runtime.sql, smoke-schema.sql e 008. O teste explícito está em backend/scripts/test-user-provisioning.mjs e exige SISCOTA_PROVISIONING_TEST=isolated-55439. O cluster precisa ser descartável, com o esquema e dados sintéticos descritos acima. O build de frontend e o CI remoto do candidato ainda não foram executados nesta branch.

## Aplicação após aprovação

1. Revisar o diff e o SQL da 008. Integrar a branch por PR para deploy, com revisão e siscota-validate no SHA final. A mudança de permissões exige revisão administrativa e atualização revisada do baseline. A implantação automática de código não executa essa migração.
2. Conferir novamente installed_id e a ponta deploy. Adquirir /var/lib/siscota-cd/deploy.lock, confirmar ausência de pending/failed e obter snapshots estruturais e de privilégios pré-mudança em diretório root:0700. Conferir que os quatro grants continuam ausentes e comparar com a evidência desta investigação.
3. Copiar somente a migração revisada para /tmp/siscota-008-reviewed.sql e conferir seu conteúdo contra o commit aprovado. Executar no Ubuntu, após a autorização administrativa, o comando abaixo. O operador fornece a senha do sudo no terminal.

```bash
sudo flock -n /var/lib/siscota-cd/deploy.lock runuser -u postgres -- env -i PATH=/usr/bin:/bin /usr/lib/postgresql/18/bin/psql -X --no-password -v ON_ERROR_STOP=1 --host=/var/run/postgresql --port=5432 --dbname=siscota --file=/tmp/siscota-008-reviewed.sql
```

4. Sob o mesmo procedimento de exclusão mútua, comparar o pós-estado com o pré-estado. Somente os quatro grants devem mudar. Confirmar duas projeções consecutivas estáveis de DDL e privilégios e comparar com a fixture aprovada acrescida da 008. Só então registrar os baselines root:0600 e executar check-live-schema.sh. O validador antigo de /tmp desta conversa contém a fixture anterior sem a 008 e exige atualização revisada antes desse uso.
5. Executar o fluxo administrativo no site com uma conta de validação autorizada, confirmar 201, login e vínculo esperado. Confirmar 401/403 e 409 sem registros parciais. O teste no site permanece pendente de autorização e aplicação. Não é necessário reiniciar os serviços para que PostgreSQL reconheça os novos grants.
6. Se falhar, preservar a evidência e executar o SQL de recuperação revisado com o mesmo lock e conexão administrativa. Conferir os privilégios contra o snapshot pré-mudança. Reconciliar os baselines pela mesma revisão, sem ignorar divergências. A recuperação mantém os registros e volta a impedir novos cadastros.

Nenhum deploy, merge, GRANT, migração, reinício ou alteração de timer foi efetuado na VM nesta investigação. A correção está preparada e testada em isolamento, aguardando aprovação para aplicação.
