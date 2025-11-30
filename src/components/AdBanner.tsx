import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useIsPro } from '../store/appStore';
import { useThemeColors } from '../theme/useThemeColors';

export const AdBanner: React.FC = () => {
  const isPro = useIsPro();
  const colors = useThemeColors();

  if (isPro) {
    return null;
  }

  return <View style={[styles.placeholder, { backgroundColor: colors.background }]} />;
};

const styles = StyleSheet.create({
  placeholder: {
    height: 0,
  },
});
