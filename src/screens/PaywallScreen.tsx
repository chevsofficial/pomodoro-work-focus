import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export const PaywallScreen: React.FC = () => {
  return (
    <ScreenContainer>
      <View style={styles.content}>
        <Text style={styles.title}>Upgrade to Pro</Text>
        <Text style={styles.description}>
          Unlock unlimited activity types, advanced analytics, and more customization options. This is a placeholder for the
          full paywall experience.
        </Text>
        <Text style={styles.note}>In-app purchases coming soon!</Text>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  note: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
