const HOURS_PER_QUOTA = 12;

/**
 * Expresses the approved daily quota split without assigning night quotas to
 * N1 or N2. That physical allocation remains a business-rule decision.
 */
export function getDailyQuotaDistribution(totalQuotas) {
  const base = {
    totalQuotas,
    hoursPerQuota: HOURS_PER_QUOTA,
    nightPeriodAllocation: 'pending'
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
