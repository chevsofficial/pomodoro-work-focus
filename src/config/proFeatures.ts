import { TranslationKey } from '../i18n/translations';

export const PRO_BENEFITS: TranslationKey[] = [
  'paywall.benefits.premiumThemes',
  'paywall.benefits.advancedAnalytics',
  'paywall.benefits.unlimitedActivityTypes',
  'paywall.benefits.customDurations',
  'paywall.benefits.customDateRange',
  'paywall.benefits.cloudSync',
  'paywall.benefits.exportCsv',
];

export const PRO_PRICING = {
  monthly: {
    title: 'Monthly Plan',
    priceText: '$3.99 / month',
    description: 'Flexible • Cancel anytime',
  },
  annual: {
    title: 'Most Popular — Annual Plan',
    priceText: '$19.99 / year',
    description: '7-day free trial • Cancel anytime',
    savingsText: 'Save 58% compared to monthly',
  },
};

export const IAP_PRODUCT_IDS = {
  ios: 'pomodorofocus.pro.ios',
  android: 'pomodorofocus.pro.android',
};

export const PRO_DEV_UNLOCK_ENABLED = __DEV__;
