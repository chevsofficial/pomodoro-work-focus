import React, { useMemo } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import Constants from 'expo-constants';

type Extras = {
  admob?: {
    androidBannerUnitId?: string;
    iosBannerUnitId?: string;
  };
};

function getUnitId() {
  const extras = (Constants.expoConfig?.extra ?? {}) as Extras;

  const androidId = extras.admob?.androidBannerUnitId;
  const iosId = extras.admob?.iosBannerUnitId;

  // ✅ Use Google test IDs in dev to avoid policy violations
  if (__DEV__) return TestIds.BANNER;

  return Platform.OS === 'android' ? androidId : iosId;
}

export const AdFooterBanner: React.FC = () => {
  const unitId = useMemo(getUnitId, []);

  // If not configured, render nothing (avoids crashes)
  if (!unitId) return null;

  return (
    <View style={styles.wrap}>
      <BannerAd unitId={unitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
  },
});
