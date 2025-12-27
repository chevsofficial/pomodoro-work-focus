import { Platform } from 'react-native';
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

const ANDROID_API_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? extra.revenuecatAndroidKey ?? '';
const IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? extra.revenuecatIosKey ?? '';
const DEV_API_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_TEST_STORE_KEY ?? extra.revenuecatTestKey ?? '';

export function getRevenueCatApiKey() {
  if (__DEV__) {
    return DEV_API_KEY;
  }

  // Prod builds later: switch to platform-specific keys
  return Platform.select({
    android: ANDROID_API_KEY,
    ios: IOS_API_KEY,
  }) as string;
}
