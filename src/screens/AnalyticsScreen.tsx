import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

// IMPORTANT: named export must be called AnalyticsScreen
export const AnalyticsScreen: React.FC = () => {
  return (
    <ScreenContainer>
      <Text style={styles.title}>Analytics</Text>
      <Text style={styles.subtitle}>
        Your focus analytics will appear here once you start using the app.
      </Text>

      <View style={styles.placeholderCard}>
        <Text style={styles.placeholderTitle}>No data yet</Text>
        <Text style={styles.placeholderText}>
          Complete a few pomodoro sessions and check back to see your productivity stats.
        </Text>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  placeholderCard: {
    borderRadius: 16,
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  placeholderText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
