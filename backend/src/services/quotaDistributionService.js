import { MAX_COTAS_POR_DIA, MAX_N2_POR_DIA } from './distributionEngine.js';

const HOURS_PER_QUOTA = 12;

const NIGHT_RULE = {
  nightPeriodAllocation: 'compartilhada',
  maxN2PerDay: MAX_N2_POR_DIA,
  maxQuotasPerDay: MAX_COTAS_POR_DIA,
  allowedNightCombinations: ['N1+N1', 'N1+N2']
};

export function getDailyQuotaDistribution(totalQuotas) {
  const base = {
    totalQuotas,
    hoursPerQuota: HOURS_PER_QUOTA,
    ...NIGHT_RULE
  };

  if (totalQuotas === 4) {
    return { ...base, supported: true, diurnalQuotas: 2, nightQuotas: 2 };
  }

  if (totalQuotas === 3) {
    return { ...base, supported: true, diurnalQuotas: 1, nightQuotas: 2 };
  }

  return {
    ...base,
    supported: false,
    diurnalQuotas: null,
    nightQuotas: null,
    reason: 'Quantidade de cotas sem regra de distribuição aprovada.'
  };
}
