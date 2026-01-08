export const PRO_FEATURES = [
  'cloudSync',
  'fullAnalytics',
  'themes',
] as const;

export type ProFeatureKey = (typeof PRO_FEATURES)[number];
