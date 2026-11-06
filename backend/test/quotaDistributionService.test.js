import test from 'node:test';
import assert from 'node:assert/strict';
import { getDailyQuotaDistribution } from '../src/services/quotaDistributionService.js';
import { parsePeriodParams } from '../src/routes/escalaRoutes.js';

test('distribui quatro cotas entre dia e noite sem dividir N1/N2', () => {
  assert.deepEqual(getDailyQuotaDistribution(4), {
    totalQuotas: 4,
    hoursPerQuota: 12,
    nightPeriodAllocation: 'pending',
    supported: true,
    diurnalQuotas: 2,
    nightQuotas: 2
  });
});

test('prioriza noite para três cotas', () => {
  const distribution = getDailyQuotaDistribution(3);
  assert.equal(distribution.diurnalQuotas, 1);
  assert.equal(distribution.nightQuotas, 2);
  assert.equal(distribution.supported, true);
});

test('não distribui automaticamente quantidades sem regra aprovada', () => {
  const distribution = getDailyQuotaDistribution(5);
  assert.equal(distribution.supported, false);
  assert.equal(distribution.diurnalQuotas, null);
  assert.equal(distribution.nightQuotas, null);
});

test('valida ano e mês do endpoint', () => {
  assert.deepEqual(parsePeriodParams('2026', '10'), { year: 2026, month: 10 });
  assert.match(parsePeriodParams('1999', '10').error, /Ano inválido/);
  assert.match(parsePeriodParams('2026', '13').error, /Mês inválido/);
});
