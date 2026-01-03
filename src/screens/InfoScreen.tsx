import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { APP_LINKS } from '../config/links';
import { RootStackParamList } from '../navigation/RootNavigator';
import { navigateToProUpsell } from '../navigation/proNavigation';
import { STORAGE_KEY, useIsPro, useLanguage, useProStatus } from '../store/appStore';
import { spacing } from '../theme/spacing';
import { useThemeColors } from '../theme/useThemeColors';
import { Language } from '../models';
import { saveLanguage } from '../i18n/language';
import { setAppLanguage } from '../i18n';
import { t } from '../i18n/translations';
import { logger } from '../utils/logger';

type InfoItem = {
  title: string;
  description?: string;
  onPress: () => void;
};

type InfoSection = {
  title: string;
  items: InfoItem[];
};

type InfoStyles = ReturnType<typeof createStyles>;

type InfoRowProps = InfoItem & {
  isLast?: boolean;
  styles: InfoStyles;
};

const InfoRow: React.FC<InfoRowProps> = ({
  title,
  description,
  onPress,
  isLast,
  styles,
}) => {
  return (
    <TouchableOpacity style={[styles.row, !isLast && styles.rowDivider]} onPress={onPress}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        {description ? <Text style={styles.rowDescription}>{description}</Text> : null}
      </View>
      <Text style={styles.rowAction}>›</Text>
    </TouchableOpacity>
  );
};

export const InfoScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const colors = useThemeColors();
  const proStatus = useProStatus();
  const isPro = useIsPro();
  const language = useLanguage();
  const [isLanguageModalVisible, setLanguageModalVisible] = useState(false);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const rateUrl =
    Platform.select({
      ios: APP_LINKS.appStore,
      android: APP_LINKS.playStore,
    }) ?? APP_LINKS.website;

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert(t('info.alerts.openLinkTitle'), t('info.alerts.openLinkBody'));
    });
  };

  const handleLanguagePress = () => {
    setLanguageModalVisible(true);
  };

  const closeLanguageModal = () => {
    setLanguageModalVisible(false);
  };

  const handleLanguageSelect = async (nextLanguage: Language) => {
    await saveLanguage(nextLanguage);
    await setAppLanguage(nextLanguage);
    setLanguageModalVisible(false);
  };

  const sections: InfoSection[] = [
    {
      title: t('info.sections.support.title'),
      items: [
        {
          title: t('info.sections.about.helpCenter.title'),
          description: t('info.sections.about.helpCenter.description'),
          onPress: () => openLink(APP_LINKS.website),
        },
        {
          title: t('info.sections.support.contact.title'),
          description: t('info.sections.support.contact.description'),
          onPress: () => openLink(`mailto:${APP_LINKS.supportEmail}`),
        },
        {
          title: t('info.sections.support.rate.title'),
          description: t('info.sections.support.rate.description'),
          onPress: () => openLink(rateUrl),
        },
      ],
    },
    {
      title: t('info.sections.legal.title'),
      items: [
        {
          title: t('info.sections.legal.terms.title'),
          description: t('info.sections.legal.terms.description'),
          onPress: () => openLink(APP_LINKS.terms),
        },
        {
          title: t('info.sections.legal.privacy.title'),
          description: t('info.sections.legal.privacy.description'),
          onPress: () => openLink(APP_LINKS.privacy),
        },
      ],
    },
    {
      title: t('info.sections.social.title'),
      items: [
        {
          title: t('info.sections.social.x.title'),
          description: t('info.sections.social.x.description'),
          onPress: () => openLink(APP_LINKS.socials.twitter),
        },
        {
          title: t('info.sections.social.instagram.title'),
          description: t('info.sections.social.instagram.description'),
          onPress: () => openLink(APP_LINKS.socials.instagram),
        },
        {
          title: t('info.sections.social.facebook.title'),
          description: t('info.sections.social.facebook.description'),
          onPress: () => openLink(APP_LINKS.socials.facebook),
        },
      ],
    },
  ];

  const currentLanguageLabel =
    language === 'es' ? t('common.spanish') : t('common.english');

  const handleUpgradePress = () => {
    navigateToProUpsell(navigation);
  };

  const clearLocalData = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      Alert.alert(t('info.alerts.clearedTitle'), t('info.alerts.clearedBody'));
    } catch (error) {
      logger.error('Failed to clear local data', error);
      Alert.alert(t('info.alerts.clearFailedTitle'), t('info.alerts.clearFailedBody'));
    }
  };

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{t('info.title')}</Text>
        <Text style={styles.subtitle}>{t('info.subtitle')}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('info.languageLabel')}</Text>
          <View style={styles.card}>
            <InfoRow
              title={t('info.languageLabel')}
              description={currentLanguageLabel}
              onPress={handleLanguagePress}
              isLast
              styles={styles}
            />
          </View>
        </View>

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionLabel}>{section.title}</Text>
            <View style={styles.card}>
              {section.items.map((item, index) => (
                <InfoRow
                  key={item.title}
                  title={item.title}
                  description={item.description}
                  onPress={item.onPress}
                  isLast={index === section.items.length - 1}
                  styles={styles}
                />
              ))}
            </View>
          </View>
        ))}

        <View style={styles.upgradeCard}>
          <View style={styles.upgradeTextWrapper}>
            <Text style={styles.upgradeTitle}>{t('common.upgradeToPro')}</Text>
            <Text style={styles.upgradeDescription}>{t('info.upgradeDescription')}</Text>
          </View>
          <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgradePress}>
            <Text style={styles.upgradeButtonText}>{t('common.viewProPlans')}</Text>
          </TouchableOpacity>
        </View>

        {__DEV__ && (
          <View style={styles.debugCard}>
            <Text style={styles.debugTitle}>{t('info.debug.title')}</Text>
            <Text style={styles.debugText}>
              {t('info.debug.isPro').replace('{value}', String(isPro))}
            </Text>
            <Text style={styles.debugText}>
              {t('info.debug.proStatus').replace('{value}', String(proStatus.isPro))}
            </Text>
            <TouchableOpacity style={styles.clearButton} onPress={clearLocalData}>
              <Text style={styles.clearButtonText}>{t('info.debug.clearLocalData')}</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      <Modal
        animationType="fade"
        transparent
        visible={isLanguageModalVisible}
        onRequestClose={closeLanguageModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('info.languageModalTitle')}</Text>
            <Text style={styles.modalDescription}>{t('info.languageModalDescription')}</Text>
            <View style={styles.modalActionsColumn}>
              <TouchableOpacity
                style={[styles.modalPrimaryButton, styles.modalLanguageButton]}
                onPress={() => handleLanguageSelect('en')}
              >
                <Text style={styles.modalPrimaryButtonText}>{t('info.optionEnglish')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalPrimaryButton, styles.modalLanguageButton]}
                onPress={() => handleLanguageSelect('es')}
              >
                <Text style={styles.modalPrimaryButtonText}>{t('info.optionSpanish')}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.modalSecondaryButton} onPress={closeLanguageModal}>
              <Text style={styles.modalSecondaryButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    scrollContent: {
      paddingBottom: spacing.xl,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: spacing.lg,
    },
    section: {
      marginBottom: spacing.xl,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '600',
      textTransform: 'uppercase',
      color: colors.textSecondary,
      marginBottom: spacing.sm,
      letterSpacing: 0.6,
    },
    card: {
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    rowDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowText: {
      flex: 1,
    },
    rowTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    rowDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    rowAction: {
      fontSize: 20,
      color: colors.textSecondary,
      marginLeft: spacing.sm,
    },
    upgradeCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
    },
    upgradeTextWrapper: {
      marginBottom: spacing.md,
    },
    upgradeTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    upgradeDescription: {
      fontSize: 15,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    upgradeButton: {
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: 999,
      backgroundColor: colors.primary,
    },
    upgradeButtonText: {
      color: colors.textPrimary,
      fontWeight: '600',
      fontSize: 15,
      textTransform: 'uppercase',
    },
    debugCard: {
      marginTop: spacing.xl,
      padding: spacing.lg,
      borderRadius: 12,
      backgroundColor: colors.surface,
    },
    debugTitle: {
      color: colors.textPrimary,
      fontWeight: '700',
      marginBottom: spacing.xs,
    },
    debugText: {
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    clearButton: {
      marginTop: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: 8,
      backgroundColor: colors.primary,
      alignSelf: 'flex-start',
    },
    clearButtonText: {
      color: colors.textPrimary,
      fontWeight: '700',
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: `${colors.background}CC`,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    modalCard: {
      width: '100%',
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    modalDescription: {
      fontSize: 15,
      color: colors.textSecondary,
      marginBottom: spacing.md,
    },
    modalInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      color: colors.textPrimary,
      fontSize: 16,
      marginBottom: spacing.lg,
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    modalSecondaryButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    modalSecondaryButtonText: {
      color: colors.textSecondary,
      fontWeight: '600',
      fontSize: 15,
    },
    modalPrimaryButton: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: 999,
      backgroundColor: colors.primary,
      marginLeft: spacing.sm,
    },
    modalLanguageButton: {
      width: '100%',
      marginBottom: spacing.sm,
    },
    modalActionsColumn: {
      width: '100%',
      marginBottom: spacing.md,
    },
    modalPrimaryButtonText: {
      color: colors.textPrimary,
      fontWeight: '700',
      fontSize: 15,
      textTransform: 'uppercase',
    },
  });
}
