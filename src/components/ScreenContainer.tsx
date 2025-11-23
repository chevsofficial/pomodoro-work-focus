import React, { ReactNode } from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '../theme/useThemeColors';
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

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'right', 'bottom', 'left']}
    >
      <View
        style={[
          styles.content,
          { backgroundColor: colors.background },
          !withTopPadding && styles.noTopPadding,
          style,
        ]}
        {...rest}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  noTopPadding: {
    paddingTop: 0,
  },
});
