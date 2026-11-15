import test from 'node:test';

// O fluxo anterior criava usuarios com senha_hash e usava login HS256.
// Nao reaproveitar fixtures/credenciais antigas como identidades Better Auth.
test('PostgreSQL real: fluxo Better Auth e dominio', {
  skip:'PENDENTE: autorizar schema isolado, permissoes e provisionamento Better Auth; nao executar no banco principal'
}, () => {});
