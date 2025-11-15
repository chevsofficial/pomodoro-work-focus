import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { PRO_BENEFITS, PRO_DEV_UNLOCK_ENABLED, IAP_PRODUCT_IDS } from '../config/proFeatures';
import useAppStore, { useIsPro, useProStatus } from '../store/appStore';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export const PaywallScreen: React.FC = () => {
  const setProStatus = useAppStore((state) => state.setProStatus);
  const isPro = useIsPro();
  const proStatus = useProStatus();

  const handleContinue = () => {
    if (isPro) {
      Alert.alert('Already Pro', 'Thanks for supporting Pomodoro Focus!');
      return;
    }

    if (PRO_DEV_UNLOCK_ENABLED) {
      setProStatus({
        isPro: true,
        source: 'purchase',
        purchaseDate: new Date().toISOString(),
      });
      Alert.alert('Pro unlocked', 'DEV ONLY: Pro has been toggled on for testing.');
      return;
    }

    Alert.alert(
      'Coming soon',
      'In-app purchases are being integrated with react-native-iap. The continue button will trigger the platform purchase flow.',
    );
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Pomodoro Focus Pro</Text>
        <Text style={styles.description}>
          Go beyond the basics with more flexibility, detailed insights, and upcoming cloud sync.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>What you get</Text>
          {PRO_BENEFITS.map((benefit) => (
            <View key={benefit} style={styles.benefitRow}>
              <View style={styles.bullet} />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, isPro && styles.primaryButtonDisabled]}
          onPress={handleContinue}
          disabled={isPro}
        >
          <Text style={styles.primaryButtonText}>{isPro ? 'Already upgraded' : 'Continue'}</Text>
        </TouchableOpacity>

        {proStatus.source && (
          <Text style={styles.secondaryText}>Unlocked via {proStatus.source}.</Text>
        )}

        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>Implementation note</Text>
          <Text style={styles.noteBody}>
            Production builds will call react-native-iap with product IDs {IAP_PRODUCT_IDS.ios} (iOS) and
            {` ${IAP_PRODUCT_IDS.android}`} (Android), handle purchase updates, and validate receipts before unlocking Pro.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  card: {
    borderRadius: 16,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: spacing.md,
  },
  benefitText: {
    color: colors.textPrimary,
    flex: 1,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  primaryButtonDisabled: {
    backgroundColor: colors.border,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryText: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  noteCard: {
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  noteBody: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
