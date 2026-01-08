import { Platform } from 'react-native';
import { RuntimeConfig } from './runtimeConfig';

export function getRevenueCatApiKey() {
  if (__DEV__) {
    return RuntimeConfig.revenueCatDevTestKey;
  }

  return Platform.select({
    android: RuntimeConfig.revenueCatAndroidKey,
    ios: RuntimeConfig.revenueCatIosKey,
  }) as string;
}
