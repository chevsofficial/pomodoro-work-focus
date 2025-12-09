import Constants from 'expo-constants';
export function getRevenueCatApiKey() {
  return Constants.expoConfig?.extra?.revenuecatIosKey ?? '';
}
