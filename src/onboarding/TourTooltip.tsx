import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { TooltipProps } from 'react-native-copilot';
import { spacing } from '../theme/spacing';
import { useThemeColors } from '../theme/useThemeColors';
import { t } from '../i18n/translations';
import { markTourCompleted } from './tourController';

type Props = TooltipProps & {
  currentStep?: { text?: string };
  isFirstStep?: boolean;
  isLastStep?: boolean;
  handleNext?: () => void;
  handlePrev?: () => void;
  handleStop?: () => void;
};

export const TourTooltip: React.FC<Props> = ({
  labels,
  currentStep,
  isFirstStep,
  isLastStep,
  handleNext,
  handlePrev,
  handleStop,
}) => {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const onSkip = async () => {
    await markTourCompleted();
    handleStop?.();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.stepText}>{currentStep?.text ?? ''}</Text>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
          <Text style={styles.skipLabel}>{labels?.skip ?? t('onboarding.skip')}</Text>
        </TouchableOpacity>

        <View style={styles.navActions}>
          {!isFirstStep && (
            <TouchableOpacity style={styles.secondaryButton} onPress={handlePrev}>
              <Text style={styles.secondaryLabel}>
                {labels?.previous ?? t('onboarding.previous')}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, isLastStep && styles.primaryButtonLast]}
            onPress={handleStop && isLastStep ? handleStop : handleNext}
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
      maxWidth: 280,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 8,
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
