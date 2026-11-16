# Adoção da release manual pelo CD

A release manual tem identidade `manual-bf7d837b0504682f67fc259f36e74c85e079cab892dcc19da159e3a12777cd2e`, derivada do SHA-256 do manifesto de build. O commit `485367520d213713325583755d9ddbf199dcda16` identifica a origem do frontend. O commit `babb91d5be3344a1748a235532ad942297dac66e` identifica a base Git anterior. Ambos são referências de ancestralidade para a primeira candidata.

## Operação administrativa de adoção

No diretório de staging, conferir o SHA-256 de `SHA256SUMS` contra o valor entregue na conversa. Verificar os arquivos e executar `sudo bash ./adopt-manual.sh HASH_DO_MANIFESTO`. O comando confirma timer desativado, ausência do marcador enabled, os dois PIDs na release manual e o manifesto do artefato. Cria uma cópia de rollback em `/srv/siscota-cd/releases`, sob controle de root, instala os scripts revisados e cria o link `/var/lib/siscota-cd/current` apontando para a cópia. Os drop-ins novos mudam somente WorkingDirectory para a próxima inicialização e mantêm os drop-ins atuais de HTTPS. A operação recarrega as definições do systemd e verifica que os PIDs e os diretórios atuais permaneceram iguais. Se essa verificação falhar, restaura os scripts e remove os drop-ins novos e o link. A cópia verificada pode permanecer no armazenamento de releases nesse caso.

Caso precise desfazer apenas a adoção antes do primeiro ciclo, remova os dois drop-ins `99-siscota-cd.conf`, remova o link `/var/lib/siscota-cd/current`, restaure os scripts originais do diretório de backup impresso e execute `sudo systemctl daemon-reload`. Depois de uma promoção, o rollback operacional usa `sudo bash /usr/local/lib/siscota-cd/recover-release.sh` em janela autorizada. O teste em staging simulou a troca e falha de health, sem reiniciar processos reais. A cópia de rollback mantém o mesmo artefato e regenera somente o cache Next.

## Credencial e GitHub

No terminal administrativo, conferir presença e permissões sem ler o conteúdo:

```bash
sudo stat -c '%n %U %a' /etc/siscota-cd/repository /etc/siscota-cd/github.token
sudo python3 /usr/local/lib/siscota-cd/approved.py --check-private
```

`repository` deve conter o identificador OWNER/REPO e `github.token` deve conter a credencial restrita ao repositório. Ambos root:0600. O token deve ter acesso de leitura a Metadata, Contents, Pull Requests, Actions e Administration, inclusive proteção da branch e permissões de revisores. Provisionar por canal administrativo privado. A consulta pública de metadados autenticada com a credencial existente do repositório marcou `deploy` protegida, mas encontrou lista vazia de regras aplicáveis e HTTP 404 para a proteção clássica. É necessário comprovar a política efetiva com o token destinado à VM. O gate exige PR, revisão válida, check estrito do GitHub Actions, regras aplicadas a administradores e bloqueio de force push e exclusão. Uma política exclusiva de rulesets requer adaptação explícita e validada.

A ponta `98bb762` é anterior às bases integradas na cópia manual. O PR #81 continua aberto; o SHA base da release anterior não pôde ser comparado no GitHub (404). Publicar por processo autorizado uma candidata que preserve as duas ancestralidades, o delta integrado e as URLs públicas. Confirmar PR aprovado e CI bem-sucedido no SHA do push em deploy. A primeira candidata precisa de revisão administrativa do diff completo contra a release manual. Para as próximas, alterações exclusivamente em documentação Markdown, CSS e imagens raster estáticas passam sem autorização administrativa adicional quando toda a evidência normal de GitHub e esquema estiver válida. Código, SVG, dependências, persistência e configuração exigem autorização exata.

## PostgreSQL e build

Com autorização administrativa específica para leitura estrutural, coletar em diretório privado. Os comandos usam socket Unix e transação read-only:

```bash
sudo bash -c 'umask 077; install -d -m 0700 /root/siscota-schema; cd /root/siscota-schema; bash /usr/local/lib/siscota-cd/snapshot-schema.sh --ddl > public.ddl && bash /usr/local/lib/siscota-cd/snapshot-schema.sh --privileges > privileges.txt && sha256sum public.ddl privileges.txt'
```

Comparar DDL e privilégios efetivos com a fixture 003–007 e revisar dependências fora de public. Depois de aprovado, guardar o hash correspondente em `/etc/siscota-cd/live-ddl.sha256` e `/etc/siscota-cd/live-privileges.sha256`, root:0600, apenas um hash em cada arquivo. Ainda não houve snapshot, comparação ou migração no PostgreSQL definitivo.

Verificar a conta de build `siscota-build`, os binários Node/pnpm em `/usr/local/lib/siscota-cd/tools/bin` e caches offline em `/var/lib/siscota-build/cache/{npm,pnpm}`. Provisionar o que estiver ausente. Exercitar o build isolado com a árvore Git integrada e o baseline de lint revisto antes da primeira implantação.

## Primeiro ciclo e timer

Só depois de adoção, credencial, política efetiva, PR, CI, banco e cache verificados, registrar a transição a partir dos PIDs:

```bash
sudo bash /usr/local/lib/siscota-cd/review-transition.sh
```

O helper mostra o PR e o diff, exige confirmação e grava um par `identidade_atual SHA_candidato` atrelado ao estado verificado. O operador deve revisar também as alterações manuais da configuração pública, que não pertencem necessariamente ao diff Git da base anterior.

Somente em janela com autorização específica para promoção, executar `sudo bash /usr/local/lib/siscota-cd/arm-cd.sh --first-cycle`. O helper verifica os pré-requisitos antes de criar o marcador operacional, usa o serviço uma vez com timer desativado e remove o marcador se o ciclo falhar. Confirmar os PIDs, o SHA Git real, o login HTTPS, JWT, JWKS interno e a API autenticada. Caso a promoção falhe, conferir o rollback e o registro `failed` antes de rearmar.

Depois da confirmação do primeiro ciclo e autorização para automação, executar `sudo bash /usr/local/lib/siscota-cd/arm-cd.sh --timer`. O helper exige uma release Git em execução, o registro do primeiro ciclo, integridade estrutural e a proteção do GitHub antes de habilitar e iniciar o timer.
