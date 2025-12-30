import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { logger } from '../utils/logger';

const extras = (Constants.expoConfig?.extra ?? {}) as {
  EXPO_PUBLIC_SUPABASE_URL?: string;
  EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
};

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? extras.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? extras.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const CONFIG_MISSING_CODE = 'CONFIG_MISSING';
const MISSING_CONFIG_MESSAGE = 'Supabase credentials are not configured.';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const createMissingConfigError = () => {
  const error = new Error(MISSING_CONFIG_MESSAGE) as Error & { code?: string };
  error.code = CONFIG_MISSING_CODE;
  return error;
};

const createMissingConfigClient = () => {
  const error = createMissingConfigError();
  const query = {
    select: () => query,
    eq: () => query,
    upsert: () => query,
    single: async () => ({ data: null, error }),
  };

  return {
    auth: {
      signInWithPassword: async () => ({ data: null, error }),
      signUp: async () => ({ data: { user: null, session: null }, error }),
      signOut: async () => ({ error }),
      resetPasswordForEmail: async () => ({ data: null, error }),
      updateUser: async () => ({ data: null, error }),
      getSession: async () => ({ data: { session: null }, error }),
      setSession: async () => ({ data: { session: null }, error }),
      onAuthStateChange: () => ({
        data: {
          subscription: {
            unsubscribe: () => undefined,
          },
        },
      }),
    },
    from: () => query,
    rpc: async () => ({ data: null, error }),
  };
};

export const supabaseClient = isSupabaseConfigured
  ? createClient(SUPABASE_URL as string, SUPABASE_ANON_KEY as string)
  : (createMissingConfigClient() as ReturnType<typeof createClient>);

export const supabase = supabaseClient;

export const reportMissingSupabaseConfig = () => {
  if (isSupabaseConfigured) return;

  if (typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production') {
    logger.warn('[Supabase] Missing configuration. Cloud features are disabled.');
    return;
  }

  logger.error('[Supabase] Missing configuration. Cloud features are disabled.');
};

export const isMissingSupabaseConfigError = (error: unknown) => {
  return Boolean(
    error &&
      typeof error === 'object' &&
      (error as { code?: string }).code === CONFIG_MISSING_CODE,
  );
};
