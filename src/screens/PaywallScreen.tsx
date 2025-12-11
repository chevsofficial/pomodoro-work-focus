import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Purchases, { Offerings, PurchasesPackage } from 'react-native-purchases';
import { useNavigation } from '@react-navigation/native';
import { ScreenContainer } from '../components/ScreenContainer';
import { PRO_BENEFITS, PRO_PRICING } from '../config/proFeatures';
import {
  isExpoGo,
  purchasePackage,
  restorePurchases,
} from '../services/revenuecat';
import useAppStore, { useIsPro, useProStatus } from '../store/appStore';
import { spacing } from '../theme/spacing';
import { useThemeColors } from '../theme/useThemeColors';
import { t } from '../i18n/translations';

const formatPriceText = (pkg: PurchasesPackage | null, fallback: string) =>
  pkg?.product?.priceString ?? fallback;

export const PaywallScreen: React.FC = () => {
  const colors = useThemeColors();
  const setProStatus = useAppStore((state) => state.setProStatus);
  const isPro = useIsPro();
  const proStatus = useProStatus();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation();
  const language = useAppStore((state) => state.language);
  const expoGo = isExpoGo();

  const [annualPackage, setAnnualPackage] = useState<PurchasesPackage | null>(null);
  const [monthlyPackage, setMonthlyPackage] = useState<PurchasesPackage | null>(null);
  const [loadingOfferings, setLoadingOfferings] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [offeringsUnavailable, setOfferingsUnavailable] = useState(false);
  const [offerings, setOfferings] = useState<Offerings | null>(null);
  const [storeError, setStoreError] = useState<string | null>(null);

  useEffect(() => {
    if (expoGo) return;

    const loadOfferings = async () => {
      setLoadingOfferings(true);
      setOfferingsUnavailable(false);
      setStoreError(null);

      try {
        const result: Offerings | null = await Purchases.getOfferings();

        if (!result || !result.current || Object.keys(result.all).length === 0) {
          console.warn('[RevenueCat] Offerings are empty (Test Store?)');
          setAnnualPackage(null);
          setMonthlyPackage(null);
          setOfferings(null);
          setStoreError('We could not load products. Please try again later.');
          setOfferingsUnavailable(true);
          return;
        }

        const current = result.current;
        console.log('[RevenueCat] Offerings loaded', Object.keys(result.all));

        let monthly: PurchasesPackage | null = current.monthly ?? null;
        let annual: PurchasesPackage | null = current.annual ?? null;

        // Fall back to availablePackages by identifier.
        if (!monthly && current.availablePackages) {
          monthly =
            current.availablePackages.find(
              (pkg: PurchasesPackage) => pkg.identifier === '$rc_monthly'
            ) ?? null;
        }
        if (!annual && current.availablePackages) {
          annual =
            current.availablePackages.find(
              (pkg: PurchasesPackage) => pkg.identifier === '$rc_annual'
            ) ?? null;
        }

        setAnnualPackage(annual);
        setMonthlyPackage(monthly);
        setOfferings(result);
        setStoreError(null);
      } catch (e: any) {
        console.error('[RevenueCat] Error fetching offerings', e);
        if (e?.userInfo?.underlyingErrorMessage) {
          console.error('[RevenueCat underlying]', e.userInfo.underlyingErrorMessage);
        }
        setAnnualPackage(null);
        setMonthlyPackage(null);
        setOfferings(null);
        setStoreError('We could not load products. Please try again later.');
        setOfferingsUnavailable(true);
      } finally {
        setLoadingOfferings(false);
      }
    };

    loadOfferings();
  }, [expoGo]);

  const handlePurchase = async (pkg: PurchasesPackage | null) => {
    if (expoGo) {
      Alert.alert(
        'Purchases unavailable in Expo Go',
        'To test subscriptions, install a development build created with EAS.'
      );
      return;
    }

    if (isPro) {
      Alert.alert('Already Pro', 'Thanks for supporting TomoFlow!');
      return;
    }

    if (!pkg) {
      Alert.alert('Store unavailable', 'We could not load products. Please try again shortly.');
      return;
    }

    try {
      setIsPurchasing(true);
      await purchasePackage(pkg);
    } catch (error: any) {
      if (!error?.userCancelled) {
        Alert.alert('Purchase failed', 'Something went wrong while starting your subscription.');
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    if (expoGo) {
      Alert.alert(
        'Purchases unavailable in Expo Go',
        'To restore purchases, install a development build created with EAS.'
      );
      return;
    }

    try {
      setIsRestoring(true);
      const info = await restorePurchases();
      const hasPro = Object.keys(info.entitlements.active).length > 0;

      if (hasPro) {
        Alert.alert('Restored', 'Your TomoFlow Pro access has been restored.');
      } else {
        Alert.alert('No purchases found', 'We did not find any previous purchases for this account.');
      }
    } catch (error: any) {
      if (error?.userCancelled) return;
      Alert.alert('Restore failed', 'We could not restore purchases. Please try again later.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDevUnlock = () => {
    if (__DEV__) {
      const timestamp = new Date().toISOString();
      setProStatus({
        isPro: true,
        source: 'promo',
        activatedAt: timestamp,
        lastVerifiedAt: timestamp,
      });
      Alert.alert('Dev unlock', 'Pro has been unlocked for development builds.');
    }
  };

  const annualPriceText = formatPriceText(annualPackage, PRO_PRICING.annual.priceText);
  const monthlyPriceText = formatPriceText(monthlyPackage, PRO_PRICING.monthly.priceText);
  const annualButtonLabel = annualPackage
    ? `Buy ${annualPackage.product.priceString}`
    : t('paywall.startTrial');
  const monthlyButtonLabel = monthlyPackage
    ? `Buy ${monthlyPackage.product.priceString}`
    : t('paywall.chooseMonthly');

  useEffect(() => {
    navigation.setOptions({
      title: t('nav.upgrade'),
    });
  }, [language, navigation]);

  const isAnnualDisabled = isPro || isPurchasing || !!storeError || !offerings?.current;

  const isMonthlyDisabled =
    isPro || isPurchasing || !!storeError || !offerings?.current || !monthlyPackage;

  if (expoGo) {
    return (
      <ScreenContainer withTopPadding={false}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.logo}>TomoFlow</Text>
            <Text style={styles.heroTitle}>{t('paywall.heroTitle')}</Text>
            <Text style={styles.heroSubtitle}>{t('paywall.heroSubtitle')}</Text>
            <Text style={styles.heroBody}>{t('paywall.heroBody')}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>TomoFlow Pro</Text>
            <Text style={styles.heroBody}>
              Subscription purchases can’t be tested inside Expo Go. Install a development build (EAS)
              to try the full upgrade flow.
            </Text>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer withTopPadding={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.logo}>TomoFlow</Text>
          <Text style={styles.heroTitle}>{t('paywall.heroTitle')}</Text>
          <Text style={styles.heroSubtitle}>{t('paywall.heroSubtitle')}</Text>
          <Text style={styles.heroBody}>{t('paywall.heroBody')}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t('paywall.featuresTitle')}</Text>
          {PRO_BENEFITS.map((benefit) => (
            <View key={benefit} style={styles.benefitRow}>
              <Text style={styles.benefitIcon}>✅</Text>
              <Text style={styles.benefitText}>{t(benefit)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.pricingWrapper}>
          <View style={[styles.pricingCard, styles.pricingCardHighlighted]}>
            <View style={styles.badgeWrapper}>
              <Text style={styles.badgeText}>{t('paywall.planBadge')}</Text>
            </View>
            <Text style={styles.planTitle}>{t('paywall.plans.annualTitle')}</Text>
            <Text style={styles.planPrice}>{annualPriceText}</Text>
            <Text style={styles.planDescription}>{t('paywall.plans.annualDescription')}</Text>
            <Text style={styles.planSavings}>{t('paywall.plans.annualSavings')}</Text>
            <TouchableOpacity
              style={[
                styles.planButton,
                isAnnualDisabled ? styles.planButtonDisabled : undefined,
              ]}
              onPress={() => handlePurchase(annualPackage)}
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
            <Text style={styles.planTitle}>{t('paywall.plans.monthlyTitle')}</Text>
            <Text style={styles.planPrice}>{monthlyPriceText}</Text>
            <Text style={styles.planDescription}>{t('paywall.plans.monthlyDescription')}</Text>
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                isMonthlyDisabled ? styles.secondaryButtonDisabled : undefined,
              ]}
              onPress={() => handlePurchase(monthlyPackage)}
              disabled={isMonthlyDisabled}
            >
              <Text style={styles.secondaryButtonText}>{monthlyButtonLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {storeError && <Text style={styles.secondaryText}>Store unavailable. Please try again later.</Text>}

        {loadingOfferings && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>{t('paywall.loadingPlans')}</Text>
          </View>
        )}

        {!loadingOfferings && offeringsUnavailable && !storeError && (
          <Text style={styles.secondaryText}>Plans are not available right now.</Text>
        )}

        {proStatus.isPro && (
          <Text style={styles.secondaryText}>
            {t('paywall.unlockedVia').replace('{source}', proStatus.source ?? 'iap')}
          </Text>
        )}

        <TouchableOpacity
          style={[styles.restoreButton, isRestoring && styles.restoreButtonDisabled]}
          onPress={handleRestore}
          disabled={isRestoring}
        >
          {isRestoring ? (
            <ActivityIndicator color={colors.textSecondary} />
          ) : (
            <Text style={styles.restoreText}>{t('paywall.restore')}</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.legalText}>{t('paywall.legal')}</Text>

        {__DEV__ && (
          <TouchableOpacity style={styles.devUnlock} onPress={handleDevUnlock}>
            <Text style={styles.devUnlockText}>DEV: Unlock Pro</Text>
          </TouchableOpacity>
        )}
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
    devUnlock: {
      alignSelf: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    devUnlockText: {
      color: colors.textSecondary,
    },
  });
}
