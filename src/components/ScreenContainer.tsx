import React, { ReactNode } from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppColors, useThemeColors } from '../theme/colors';
import { spacing } from '../theme/spacing';

type ScreenContainerProps = ViewProps & {
  children?: ReactNode;
  withTopPadding?: boolean;
};

export function ScreenContainer({
  children,
  style,
  withTopPadding = true,
  ...rest
}: ScreenContainerProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'right', 'bottom', 'left']}>
      <View
        style={[styles.content, !withTopPadding && styles.noTopPadding, style]}
        {...rest}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.lg,
      backgroundColor: colors.background,
    },
    noTopPadding: {
      paddingTop: 0,
    },
  });
