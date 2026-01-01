import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TooltipProps, useCopilot } from 'react-native-copilot';
import { spacing } from '../theme/spacing';
import { useThemeColors } from '../theme/useThemeColors';
import { t } from '../i18n/translations';
import { markTourCompleted } from './tourController';

export const TourTooltip: React.FC<TooltipProps> = ({ labels }) => {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { currentStep, isFirstStep, isLastStep, goToNext, goToPrev, stop } = useCopilot();
  const handleSkip = async () => {
    await markTourCompleted();
    await stop();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.stepText}>{currentStep?.text}</Text>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipLabel}>{labels?.skip ?? t('onboarding.skip')}</Text>
        </TouchableOpacity>

        <View style={styles.navActions}>
          {!isFirstStep && (
            <TouchableOpacity style={styles.secondaryButton} onPress={goToPrev}>
              <Text style={styles.secondaryLabel}>
                {labels?.previous ?? t('onboarding.previous')}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, isLastStep && styles.primaryButtonLast]}
            onPress={isLastStep ? stop : goToNext}
          >
            <Text style={styles.primaryLabel}>
              {isLastStep
                ? labels?.finish ?? t('onboarding.finish')
                : labels?.next ?? t('onboarding.next')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      maxWidth: 320,
    },
    stepText: {
      color: colors.textPrimary,
      fontSize: 14,
      lineHeight: 20,
    },
    actionsRow: {
      marginTop: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    skipButton: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
    },
    skipLabel: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    navActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    secondaryButton: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    secondaryLabel: {
      color: colors.textPrimary,
      fontWeight: '600',
      fontSize: 12,
    },
    primaryButton: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.lg,
      borderRadius: 12,
      backgroundColor: colors.primary,
    },
    primaryButtonLast: {
      backgroundColor: colors.accent,
    },
    primaryLabel: {
      color: colors.background,
      fontWeight: '700',
      fontSize: 12,
    },
  });
