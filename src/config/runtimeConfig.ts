import Constants from 'expo-constants';

type Extra = Record<string, unknown>;

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

const read = (key: string): string => {
  const fromEnv = process.env[key];
  if (typeof fromEnv === 'string' && fromEnv.trim().length > 0) return fromEnv.trim();

  const fromExtra = extra[key];
  if (typeof fromExtra === 'string' && fromExtra.trim().length > 0) return fromExtra.trim();

  return '';
};

export const RuntimeConfig = {
  supabaseUrl: read('EXPO_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: read('EXPO_PUBLIC_SUPABASE_ANON_KEY'),

  revenueCatAndroidKey: read('EXPO_PUBLIC_REVENUECAT_ANDROID_KEY'),
  revenueCatIosKey: read('EXPO_PUBLIC_REVENUECAT_IOS_KEY'),
  revenueCatDevTestKey: read('EXPO_PUBLIC_REVENUECAT_TEST_STORE_KEY'),

  stripePublishableKey: read('EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY'),
  stripePriceId: read('EXPO_PUBLIC_STRIPE_PRICE_ID'),
  stripeSuccessUrl: read('EXPO_PUBLIC_STRIPE_SUCCESS_URL'),
  stripeCancelUrl: read('EXPO_PUBLIC_STRIPE_CANCEL_URL'),
  stripeCheckoutApiUrl: read('EXPO_PUBLIC_STRIPE_CHECKOUT_API_URL'),
};

export const MissingConfig = {
  supabase: !RuntimeConfig.supabaseUrl || !RuntimeConfig.supabaseAnonKey,
  revenueCatProd: !RuntimeConfig.revenueCatAndroidKey || !RuntimeConfig.revenueCatIosKey,
  revenueCatDev: !RuntimeConfig.revenueCatDevTestKey,
};
