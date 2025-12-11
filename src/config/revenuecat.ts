import { Platform } from 'react-native';

const TEST_STORE_API_KEY = 'test_yJqPBZmtgMXRGbhwFXfCvEBEoIm'; // from Apps & providers

// Placeholder for future production keys
const ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';
const IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';

export function getRevenueCatApiKey() {
  if (__DEV__) {
    // Dev builds: use Test Store
    return TEST_STORE_API_KEY;
  }

  // Prod builds later: switch to platform-specific keys
  return Platform.select({
    android: ANDROID_API_KEY,
    ios: IOS_API_KEY,
  }) as string;
}
