import React, { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import mobileAds, {
  BannerAd,
  BannerAdSize,
  TestIds,
} from 'react-native-google-mobile-ads';
import Constants from 'expo-constants';
import { useIsPro } from '../store/appStore';
import { useThemeColors } from '../theme/useThemeColors';

type AdmobExtras = {
  admob?: {
    androidBannerUnitId?: string;
    iosBannerUnitId?: string;
  };
};

const extras = (Constants.expoConfig?.extra ?? {}) as AdmobExtras;

const isExpoGo = Constants.appOwnership === 'expo';

const getBannerUnitId = () => {
  if (__DEV__) {
    return TestIds.BANNER;
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

  const unitId = getBannerUnitId();

  useEffect(() => {
    if (isPro || isExpoGo || !unitId) {
      return;
    }

    mobileAds()
      .initialize()
      .catch((err) => {
        if (__DEV__) {
          console.warn('mobileAds init error', err);
        }
      });
  }, [isPro, unitId]);

  if (isPro || isExpoGo || !unitId) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdFailedToLoad={(err) => {
          if (__DEV__) {
            console.warn('Banner ad error:', err);
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
