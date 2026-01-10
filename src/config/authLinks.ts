import Constants from 'expo-constants';

type Extra = {
  EXPO_PUBLIC_AUTH_REDIRECT_BASE_URL?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

/**
 * For email links, use an HTTPS universal link base in production.
 * Example prod: https://tomoflow.app
 * Example preview: https://staging.tomoflow.app (if you have it)
 */
const AUTH_REDIRECT_BASE_URL =
  process.env.EXPO_PUBLIC_AUTH_REDIRECT_BASE_URL ??
  extra.EXPO_PUBLIC_AUTH_REDIRECT_BASE_URL ??
  'https://tomoflow.app';

export function getAuthRedirectUrl(path: 'auth-callback' | 'auth-recovery') {
  // In dev you *can* use Linking.createURL, but email flows in Expo Go are unreliable anyway.
  // For consistency, always return the https universal link target.
  return `${AUTH_REDIRECT_BASE_URL}/${path}`;
}
