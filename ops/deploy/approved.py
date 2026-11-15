import json
import re
import subprocess
import sys
import urllib.parse

REPO = 'Alvaro-Da-Silva/Projeto-Integrador'
BASE = 'https://api.github.com/repos/' + REPO
BRANCH = 'deploy'
MINIMUM_SOURCE = 'b88ed23bb3ed7ac103eb4fa2cbf03a33440f4fa9'
CONFIG = '/etc/siscota-cd/github.curl'

def request(path):
    response = subprocess.check_output([
        'curl', '--config', CONFIG, '--fail', '--silent', '--show-error',
        '--max-time', '25', '--header', 'Accept: application/vnd.github+json',
        BASE + path,
    ])
    return json.loads(response)

branch = request('/branches/' + BRANCH)
sha = branch['commit']['sha']
if not re.fullmatch('[0-9a-f]{40}', sha):
    sys.exit('SHA GitHub inválido')
if len(sys.argv) == 2 and sys.argv[1] == sha:
    sys.exit(0)
rules = request('/rules/branches/' + BRANCH)
reviews = [
    r for r in rules if r['type'] == 'pull_request'
    and r.get('parameters', {}).get('required_approving_review_count', 0) >= 1
    and r.get('parameters', {}).get('dismiss_stale_reviews_on_push', False)
]
if not branch['protected'] or not reviews or not any(r['type'] == 'non_fast_forward' for r in rules):
    sys.exit('Deploy exige ruleset ativo com revisão, invalidação de aprovações antigas e bloqueio de force-push')
if request('/compare/' + MINIMUM_SOURCE + '...' + sha + '?per_page=1')['status'] not in {'ahead', 'identical'}:
    sys.exit('Revisão anterior ou divergente da origem aprovada do Álvaro')
prs = request('/commits/' + sha + '/pulls')
if not any(p.get('merged_at') and p.get('merge_commit_sha') == sha and p['base']['ref'] == BRANCH for p in prs):
    sys.exit('Commit sem PR aprovado e mesclado na branch deploy')
query = urllib.parse.urlencode({'branch': BRANCH, 'event': 'push', 'head_sha': sha, 'per_page': 10})
runs = request('/actions/workflows/siscota-ci.yml/runs?' + query)['workflow_runs']
if not runs or runs[0].get('head_sha') != sha or runs[0].get('conclusion') != 'success':
    sys.exit('Aguardando CI bem-sucedido para o SHA exato')
print(sha)
