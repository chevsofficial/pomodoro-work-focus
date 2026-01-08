import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

const isMonthly = (p: PurchasesPackage) =>
  p.packageType === 'MONTHLY' || p.identifier.toLowerCase().includes('month');

const isAnnual = (p: PurchasesPackage) =>
  p.packageType === 'ANNUAL' ||
  p.identifier.toLowerCase().includes('annual') ||
  p.identifier.toLowerCase().includes('year');

export type PaywallPlanKey = 'monthly' | 'annual';

export type PaywallPlanDisplay = {
  key: PaywallPlanKey;
  rcPackage?: PurchasesPackage;
  priceText: string;
  periodText: string;
  fullPriceLine: string;
};

export function buildPaywallPricingFromOffering(
  offering: PurchasesOffering | null,
  t: (key: string) => string
): Record<PaywallPlanKey, PaywallPlanDisplay> {
  const monthlyFallback: PaywallPlanDisplay = {
    key: 'monthly',
    rcPackage: undefined,
    priceText: t('paywall.pricing.monthly.priceText'),
    periodText: '',
    fullPriceLine: t('paywall.pricing.monthly.priceText'),
  };

  const annualFallback: PaywallPlanDisplay = {
    key: 'annual',
    rcPackage: undefined,
    priceText: t('paywall.pricing.annual.priceText'),
    periodText: '',
    fullPriceLine: t('paywall.pricing.annual.priceText'),
  };

  if (!offering?.availablePackages?.length) {
    return { monthly: monthlyFallback, annual: annualFallback };
  }

  const monthlyPkg = offering.availablePackages.find(isMonthly);
  const annualPkg = offering.availablePackages.find(isAnnual);

  const monthly = monthlyPkg
    ? {
        key: 'monthly' as const,
        rcPackage: monthlyPkg,
        priceText: monthlyPkg.product.priceString,
        periodText: t('paywall.period.month'),
        fullPriceLine: `${monthlyPkg.product.priceString} ${t('paywall.period.month')}`,
      }
    : monthlyFallback;

  const annual = annualPkg
    ? {
        key: 'annual' as const,
        rcPackage: annualPkg,
        priceText: annualPkg.product.priceString,
        periodText: t('paywall.period.year'),
        fullPriceLine: `${annualPkg.product.priceString} ${t('paywall.period.year')}`,
      }
    : annualFallback;

  return { monthly, annual };
}
