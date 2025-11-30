import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { AdMobBanner, setTestDeviceIDAsync } from 'expo-ads-admob';
import Constants from 'expo-constants';
import { useIsPro } from '../store/appStore';
import { useThemeColors } from '../theme/useThemeColors';

// Register the emulator for safe test requests in development
setTestDeviceIDAsync('EMULATOR').catch(() => undefined);

type AdmobExtras = {
  admob?: {
    androidBannerUnitId?: string;
    iosBannerUnitId?: string;
  };
};

const extras = (Constants.expoConfig?.extra ?? {}) as AdmobExtras;

const getBannerUnitId = () => {
  if (__DEV__) {
    return Platform.select({
      ios: 'ca-app-pub-3940256099942544/2934735716',
      android: 'ca-app-pub-3940256099942544/6300978111',
      default: '',
    });
  }

  return Platform.select({
    ios: extras.admob?.iosBannerUnitId ?? '',
    android: extras.admob?.androidBannerUnitId ?? '',
    default: '',
  });
};

export const AdBanner: React.FC = () => {
  const isPro = useIsPro();
  const colors = useThemeColors();

  if (isPro) {
    return null;
  }

  const unitId = getBannerUnitId();
  if (!unitId) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AdMobBanner
        bannerSize="smartBannerPortrait"
        adUnitID={unitId}
        servePersonalizedAds
        onDidFailToReceiveAdWithError={(err) => {
          if (__DEV__) {
            console.warn('Ad load error:', err);
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
    paddingBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
