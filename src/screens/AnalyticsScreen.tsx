import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useIsPro } from '../store/appStore';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

// Loosen typing so we can safely use `key` on these elements without TS complaining
const AnyView = View as any;
const AnyTouchableOpacity = TouchableOpacity as any;

// IMPORTANT: named export must be called AnalyticsScreen
export const AnalyticsScreen: React.FC = () => {
  const isPro = useIsPro();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleUpgradePress = () => {
    navigation.navigate('Paywall');
  };

  const baseRanges = ['Last 7 days', 'Last 30 days'];
  const advancedRanges = ['Last 90 days', 'Custom range'];

  return (
    <ScreenContainer>
      <Text style={styles.title}>Analytics</Text>
      <Text style={styles.subtitle}>
        Your focus analytics will appear here once you start using the app.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Date range</Text>
        <View style={styles.rangePills}>
          {baseRanges.map((label) => (
            <AnyView key={label} style={styles.rangePill}>
              <Text style={styles.rangePillText}>{label}</Text>
            </AnyView>
          ))}

          {isPro
            ? advancedRanges.map((label) => (
                <AnyView
                  key={label}
                  style={[styles.rangePill, styles.rangePillPro]}
                >
                  <Text style={[styles.rangePillText, styles.rangePillTextPro]}>
                    {label}
                  </Text>
                </AnyView>
              ))
            : (
                <AnyTouchableOpacity
                  key="pro-lock"
                  style={[styles.rangePill, styles.rangePillLocked]}
                  onPress={handleUpgradePress}
                >
                  <Text
                    style={[styles.rangePillText, styles.rangePillTextLocked]}
                  >
                    Custom range · Pro
                  </Text>
                </AnyTouchableOpacity>
              )}
        </View>
        {!isPro && (
          <Text style={styles.proHint}>
            Unlock advanced date ranges and more insights with Pomodoro Focus Pro.
          </Text>
        )}
      </View>

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
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  rangePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  rangePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rangePillPro: {
    borderColor: colors.primary,
  },
  rangePillLocked: {
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  rangePillText: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  rangePillTextPro: {
    color: colors.primary,
  },
  rangePillTextLocked: {
    color: colors.textSecondary,
  },
  proHint: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: 13,
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
