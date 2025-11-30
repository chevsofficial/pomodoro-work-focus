import Constants from 'expo-constants';
import { Platform } from 'react-native';

const extras = (Constants.expoConfig?.extra ?? {}) as {
  revenuecatIosKey?: string;
  revenuecatAndroidKey?: string;
};

export const REVENUECAT_KEYS = {
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? extras.revenuecatIosKey ?? '',
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? extras.revenuecatAndroidKey ?? '',
};

export const getRevenueCatApiKey = (): string | null => {
  const key = Platform.select({ ios: REVENUECAT_KEYS.ios, android: REVENUECAT_KEYS.android });
  return key && key.length > 0 ? key : null;
};
