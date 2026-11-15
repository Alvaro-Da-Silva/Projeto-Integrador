from pathlib import Path

for p in sorted(Path('backend').rglob('*')):
    if p.is_file() and 'node_modules' not in p.parts and (
        p.suffix == '.sql' or p.name in {'package.json', 'package-lock.json'}
        or any(word in part.lower() for part in p.parts
               for word in ('migration', 'schema', 'repositor', 'model', 'entit', 'config', 'auth'))
    ):
        print(p.as_posix())

for file in ('build-release.sh', 'check-db.sh', 'runtime.sql', 'smoke-db.mjs',
             'check-lint.mjs', 'lint-baseline.json'):
    print('ops/deploy/' + file)
for p in sorted(Path('frontend').rglob('*.sql')):
    if 'node_modules' not in p.parts:
        print(p.as_posix())
print('.github/workflows/siscota-ci.yml')