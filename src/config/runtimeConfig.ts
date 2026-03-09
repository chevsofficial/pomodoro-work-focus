import Constants from 'expo-constants';

type Extra = Record<string, unknown>;

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

const PUBLIC_FALLBACKS: Record<string, string> = {
  EXPO_PUBLIC_SUPABASE_URL: 'https://zkstcywertzzooxefwuh.supabase.co',
  EXPO_PUBLIC_SUPABASE_ANON_KEY:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inprc3RjeXdlcnR6em9veGVmd3VoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxOTcwMjYsImV4cCI6MjA3OTc3MzAyNn0.ippeFJsR93VTUxgEA4wSrYxAlhKS4NzUPoDHd4VSbCk',
};

const read = (key: string): string => {
  const fromEnv = process.env[key];
  if (typeof fromEnv === 'string' && fromEnv.trim().length > 0) return fromEnv.trim();

  const fromExtra = extra[key];
  if (typeof fromExtra === 'string' && fromExtra.trim().length > 0) return fromExtra.trim();

  const fallback = PUBLIC_FALLBACKS[key];
  if (typeof fallback === 'string' && fallback.trim().length > 0) return fallback.trim();

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
