import 'dotenv/config';

export default ({ config }: { config: Record<string, unknown> }) => {
  return {
    ...config,
    extra: {
      ...(config.extra ?? {}),
      // Supabase
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,

      // RevenueCat
      EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
      EXPO_PUBLIC_REVENUECAT_IOS_KEY: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
      EXPO_PUBLIC_REVENUECAT_TEST_STORE_KEY: process.env.EXPO_PUBLIC_REVENUECAT_TEST_STORE_KEY,

      // Auth links / misc
      EXPO_PUBLIC_AUTH_REDIRECT_BASE_URL: process.env.EXPO_PUBLIC_AUTH_REDIRECT_BASE_URL,
      EXPO_PUBLIC_APP_STORE_URL: process.env.EXPO_PUBLIC_APP_STORE_URL,
    },
  };
};
