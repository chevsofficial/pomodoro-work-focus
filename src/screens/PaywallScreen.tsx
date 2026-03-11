import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ScreenContainer } from '../components/ScreenContainer';
import {
  configureRevenueCat,
  fetchOfferings,
  getRevenueCatAvailability,
  isExpoGo,
  purchasePackage,
  restorePurchases,
} from '../services/revenuecat';
import useAppStore, { useIsPro, useProStatus } from '../store/appStore';
import { spacing } from '../theme/spacing';
import { useThemeColors } from '../theme/useThemeColors';
import { t, TranslationKey } from '../i18n/translations';
import {
  buildPaywallPricingFromOffering,
  PaywallPlanKey,
} from '../services/paywallPricing';
import { startStripeCheckout } from '../services/stripeWeb';
import { refreshWebProEntitlement } from '../services/webEntitlements';
import { trackEvent } from '../services/productEvents';

const PAYWALL_BENEFITS: TranslationKey[] = [
  'paywall.benefits.premiumThemes',
  'paywall.benefits.advancedAnalytics',
  'paywall.benefits.unlimitedActivityTypes',
  'paywall.benefits.customDurations',
  'paywall.benefits.customDateRange',
  'paywall.benefits.cloudSync',
  'paywall.benefits.exportCsv',
];

export const PaywallScreen: React.FC = () => {
  const colors = useThemeColors();
  const isPro = useIsPro();
  const proStatus = useProStatus();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation();
  const language = useAppStore((state) => state.language);
  const cloudUserId = useAppStore((state) => state.cloudSync.userId);
  const expoGo = isExpoGo();
  const [offering, setOffering] = useState<any>(null);
  const [loadingOfferings, setLoadingOfferings] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [revenueCatUnavailable, setRevenueCatUnavailable] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (cloudUserId) {
        refreshWebProEntitlement(cloudUserId);
      }
      return;
    }

    if (expoGo) return;

    const loadOfferings = async () => {
      setLoadingOfferings(true);
      setStoreError(null);
      setRevenueCatUnavailable(false);

      const availability = getRevenueCatAvailability();
      if (availability.status === 'unconfigured' || availability.status === 'configuring') {
        await configureRevenueCat();
      }

      const updatedAvailability = getRevenueCatAvailability();
      if (updatedAvailability.status === 'failed') {
        setOffering(null);
        setStoreError(
          updatedAvailability.error ?? t('paywall.errors.subscriptionsUnavailable'),
        );
        setRevenueCatUnavailable(true);
        setLoadingOfferings(false);
        return;
      }

      const result = await fetchOfferings();
      setOffering(result?.current ?? null);
      if (!result?.current) {
        setStoreError(t('paywall.errors.loadProductsLater'));
      }
      setLoadingOfferings(false);
    };

    loadOfferings();
  }, [expoGo, cloudUserId]);

  useEffect(() => {
    trackEvent('paywall_viewed');
  }, []);

  const pricing = buildPaywallPricingFromOffering(offering, t);

  const handlePurchase = async (planKey: PaywallPlanKey) => {
    trackEvent('paywall_purchase_clicked', { planKey, platform: Platform.OS });
    if (Platform.OS === 'web') {
      if (!cloudUserId) {
        Alert.alert('Create a free account first', 'Sign in before upgrading to Pro.');
        navigation.navigate('Auth' as never);
        return;
      }

      try {
        await startStripeCheckout(cloudUserId, planKey);
      } catch (error) {
        Alert.alert('Stripe checkout unavailable', 'Configure Stripe environment variables and API endpoint.');
      }
      return;
    }

    if (expoGo) {
      Alert.alert(
        t('paywall.alerts.expoGo.title'),
        t('paywall.alerts.expoGo.purchaseBody')
      );
      return;
    }

    if (revenueCatUnavailable) {
      Alert.alert(
        t('paywall.alerts.subscriptionsUnavailable.title'),
        t('paywall.alerts.subscriptionsUnavailable.body'),
      );
      return;
    }

    if (isPro) {
      Alert.alert(t('paywall.alerts.alreadyPro.title'), t('paywall.alerts.alreadyPro.body'));
      return;
    }

    const selectedPackage =
      planKey === 'annual' ? pricing.annual.rcPackage : pricing.monthly.rcPackage;

    if (!selectedPackage) {
      Alert.alert(
        t('paywall.alerts.storeUnavailableTitle'),
        t('paywall.alerts.storeUnavailableBody'),
      );
      return;
    }

    try {
      setIsPurchasing(true);
      await purchasePackage(selectedPackage);
    } catch (error: any) {
      if (!error?.userCancelled) {
        Alert.alert(
          t('paywall.alerts.purchaseFailed.title'),
          t('paywall.alerts.purchaseFailed.body'),
        );
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    if (expoGo) {
      Alert.alert(
        t('paywall.alerts.expoGo.title'),
        t('paywall.alerts.expoGo.restoreBody')
      );
      return;
    }

    if (revenueCatUnavailable) {
      Alert.alert(
        t('paywall.alerts.subscriptionsUnavailable.title'),
        t('paywall.alerts.subscriptionsUnavailable.body'),
      );
      return;
    }

    try {
      setIsRestoring(true);
      const info = await restorePurchases();
      const hasPro = Object.keys(info.entitlements.active).length > 0;

      if (hasPro) {
        Alert.alert(
          t('paywall.alerts.restoreSuccess.title'),
          t('paywall.alerts.restoreSuccess.body'),
        );
      } else {
        Alert.alert(
          t('paywall.alerts.restoreNone.title'),
          t('paywall.alerts.restoreNone.body'),
        );
      }
    } catch (error: any) {
      if (error?.userCancelled) return;
      Alert.alert(
        t('paywall.alerts.restoreFailed.title'),
        t('paywall.alerts.restoreFailed.body'),
      );
    } finally {
      setIsRestoring(false);
    }
  };

  // Always use translation-based labels; price is displayed above the button
  const annualButtonLabel = t('paywall.startTrial');
  const monthlyButtonLabel = t('paywall.chooseMonthly');
  useEffect(() => {
    navigation.setOptions({
      title: t('nav.upgrade'),
    });
  }, [language, navigation]);

  const isAnnualDisabled =
    isPro || isPurchasing || revenueCatUnavailable;

  const isMonthlyDisabled =
    isPro ||
    isPurchasing ||
    revenueCatUnavailable;

  if (expoGo) {
    return (
      <ScreenContainer withTopPadding={false}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.heroTitle}>{t('paywall.heroTitle')}</Text>
            <Text style={styles.heroBody}>{t('paywall.heroBody')}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('paywall.expoGo.title')}</Text>
            <Text style={styles.heroBody}>
              {t('paywall.expoGo.body')}
            </Text>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer withTopPadding={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if ((navigation as any).canGoBack?.()) (navigation as any).goBack();
            else (navigation as any).navigate('RootTabs');
          }}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.heroTitle}>{t('paywall.heroTitle')}</Text>
          <Text style={styles.heroBody}>{t('paywall.heroBody')}</Text>
          <Text style={styles.heroOutcome}>Most users recover 4-6 hours/week with structured focus + analytics.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('paywall.featuresTitle')}</Text>
          {PAYWALL_BENEFITS.map((benefit) => {
            const benefitRow = (
              <View key={benefit} style={styles.benefitRow}>
                <Text style={styles.benefitIcon}>✅</Text>
                <Text style={styles.benefitText}>{t(benefit)}</Text>
              </View>
            );

            return benefitRow;
          })}
        </View>

        <View style={styles.pricingWrapper}>
          <View style={[styles.pricingCard, styles.pricingCardHighlighted]}>
            <View style={styles.badgeWrapper}>
              <Text style={styles.badgeText}>{t('paywall.planBadge')}</Text>
            </View>
            <Text style={styles.planTitle}>{t('paywall.pricing.annual.title')}</Text>
            <Text style={styles.planPrice}>{pricing.annual.fullPriceLine}</Text>
            <Text style={styles.planDescription}>
              {t('paywall.pricing.annual.description')}
            </Text>
            <Text style={styles.planSavings}>{t('paywall.pricing.annual.savingsText')}</Text>
            <TouchableOpacity
              style={[
                styles.planButton,
                isAnnualDisabled ? styles.planButtonDisabled : undefined,
              ]}
              onPress={() => handlePurchase('annual')}
              disabled={isAnnualDisabled}
            >
              {isPurchasing ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={styles.planButtonText} numberOfLines={2} ellipsizeMode="tail">
                  {annualButtonLabel}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.pricingCard}>
            <Text style={styles.planTitle}>{t('paywall.pricing.monthly.title')}</Text>
            <Text style={styles.planPrice}>{pricing.monthly.fullPriceLine}</Text>
            <Text style={styles.planDescription}>
              {t('paywall.pricing.monthly.description')}
            </Text>
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                isMonthlyDisabled ? styles.secondaryButtonDisabled : undefined,
              ]}
              onPress={() => handlePurchase('monthly')}
              disabled={isMonthlyDisabled}
            >
              <Text style={styles.secondaryButtonText}>{monthlyButtonLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {storeError && <Text style={styles.secondaryText}>{storeError}</Text>}

        {loadingOfferings && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>{t('paywall.loadingPlans')}</Text>
          </View>
        )}

        {proStatus.isPro && (
          <Text style={styles.secondaryText}>
            {t('paywall.unlockedVia').replace('{source}', proStatus.source ?? 'iap')}
          </Text>
        )}

        <TouchableOpacity
          style={[styles.restoreButton, isRestoring && styles.restoreButtonDisabled]}
          onPress={handleRestore}
          disabled={isRestoring || revenueCatUnavailable}
        >
          {isRestoring ? (
            <ActivityIndicator color={colors.textSecondary} />
          ) : (
            <Text style={styles.restoreText}>{t('paywall.restore')}</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.legalText}>{t('paywall.legal')}</Text>

      </ScrollView>
    </ScreenContainer>
  );
};

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xl,
      gap: spacing.lg,
    },
    backButton: {
      alignSelf: 'flex-start',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    backButtonText: {
      color: colors.textPrimary,
      fontWeight: '700',
    },
    header: {
      alignItems: 'center',
      gap: spacing.sm,
    },
    logo: {
      fontSize: 16,
      color: colors.textSecondary,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    heroTitle: {
      fontSize: 30,
      fontWeight: '800',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    heroSubtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    heroBody: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    heroOutcome: {
      fontSize: 13,
      color: colors.accent,
      textAlign: 'center',
      fontWeight: '700',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
    card: {
      borderRadius: 16,
      backgroundColor: colors.surface,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.sm,
    },
    benefitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    benefitIcon: {
      fontSize: 16,
    },
    benefitText: {
      color: colors.textPrimary,
      flex: 1,
      fontSize: 15,
    },
    pricingWrapper: {
      gap: spacing.md,
    },
    pricingCard: {
      borderRadius: 16,
      backgroundColor: colors.surface,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.sm,
    },
    pricingCardHighlighted: {
      borderColor: colors.accent,
      shadowColor: colors.accent,
      shadowOpacity: 0.2,
      shadowOffset: { width: 0, height: 6 },
      shadowRadius: 12,
      elevation: 3,
    },
    badgeWrapper: {
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      backgroundColor: colors.accent,
      borderRadius: 999,
    },
    badgeText: {
      color: colors.background,
      fontWeight: '700',
      fontSize: 12,
      letterSpacing: 0.4,
    },
    planTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    planPrice: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    planDescription: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    planSavings: {
      fontSize: 13,
      color: colors.accent,
      fontWeight: '700',
    },
    planButton: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.sm,
    },
    planButtonDisabled: {
      backgroundColor: colors.border,
    },
    planButtonText: {
      color: colors.background,
      fontSize: 14,
      fontWeight: '700',
      textAlign: 'center',
      alignSelf: 'center',
      flexShrink: 1,
    },
    secondaryButton: {
      borderRadius: 14,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginTop: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    secondaryButtonDisabled: {
      opacity: 0.7,
    },
    secondaryButtonText: {
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: '700',
    },
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      alignSelf: 'center',
    },
    loadingText: {
      color: colors.textSecondary,
    },
    secondaryText: {
      textAlign: 'center',
      color: colors.textSecondary,
    },
    restoreButton: {
      alignItems: 'center',
      paddingVertical: spacing.md,
    },
    restoreButtonDisabled: {
      opacity: 0.7,
    },
    restoreText: {
      color: colors.textSecondary,
      fontSize: 15,
    },
    legalText: {
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 18,
      textAlign: 'center',
    },
  });
}
