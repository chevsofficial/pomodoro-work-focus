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
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { AdBanner } from '../components/AdBanner';
import { APP_LINKS } from '../config/links';
import { RootStackParamList } from '../navigation/RootNavigator';
import { navigateToProUpsell } from '../navigation/proNavigation';
import useAppStore, { STORAGE_KEY, useIsPro, useProStatus } from '../store/appStore';
import { spacing } from '../theme/spacing';
import { useThemeColors } from '../theme/useThemeColors';

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
  const [isRedeemModalVisible, setRedeemModalVisible] = useState(false);
  const [redeemCode, setRedeemCode] = useState('');
  const styles = useMemo(() => createStyles(colors), [colors]);

  const rateUrl =
    Platform.select({
      ios: APP_LINKS.appStore,
      android: APP_LINKS.playStore,
    }) ?? APP_LINKS.website;

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Open Link', 'Something went wrong while opening this link.');
    });
  };

  const handleRedeemPress = () => {
    setRedeemModalVisible(true);
  };

  const closeRedeemModal = () => {
    setRedeemModalVisible(false);
    setRedeemCode('');
  };

  const handleRedeemSubmit = () => {
    const normalizedCode = redeemCode.trim().toUpperCase();
    if (!normalizedCode) {
      Alert.alert('Redeem Code', 'Please enter a code to continue.');
      return;
    }

    if (normalizedCode === 'FOCUSPRO2023' || normalizedCode === 'TESTPRO' || normalizedCode === 'DEBUGPRO') {
      const appStore = useAppStore.getState();
      const timestamp = new Date().toISOString();
      appStore.setProStatus({
        isPro: true,
        source: 'redeem_code',
        productId: null,
        expiresAt: null,
        activatedAt: timestamp,
        lastVerifiedAt: timestamp,
      });
      Alert.alert('Success', 'Code applied! TomoFlow Pro is now unlocked.');
      closeRedeemModal();
      return;
    }

    Alert.alert('Invalid Code', 'That code was not recognized. Double-check and try again.');
  };

  const sections: InfoSection[] = [
    {
      title: 'Support',
      items: [
        {
          title: 'Contact Support',
          description: 'Email our team for help',
          onPress: () => openLink(`mailto:${APP_LINKS.supportEmail}`),
        },
        {
          title: 'Rate the App',
          description: 'Share feedback on the app store',
          onPress: () => openLink(rateUrl),
        },
      ],
    },
    {
      title: 'About',
      items: [
        {
          title: 'Help Center',
          description: 'Guides, FAQs, and feature highlights',
          onPress: () => openLink(APP_LINKS.website),
        },/* REMOVED FOR TOMOFLOW V1
        {
          title: 'News & Offers',
          description: 'Latest product updates and discounts',
          onPress: () => openLink(APP_LINKS.news),
        },*/
      ],
    },
    {
      title: 'Legal',
      items: [
        {
          title: 'Terms of Use',
          description: 'Understand the agreement for using the app',
          onPress: () => openLink(APP_LINKS.terms),
        },
        {
          title: 'Privacy Policy',
          description: 'See how we protect your data',
          onPress: () => openLink(APP_LINKS.privacy),
        },
      ],
    },
    {
      title: 'Pro & Codes',
      items: [
        {
          title: 'Redeem Code',
          description: 'Unlock special promos or betas',
          onPress: handleRedeemPress,
        },
        {
          title: 'Upgrade to Pro',
          description: 'See all premium focus perks',
          onPress: () => navigateToProUpsell(navigation),
        },
      ],
    },
    {
      title: 'Social',
      items: [
        {
          title: 'X',
          description: '@tomoflowapp',
          onPress: () => openLink(APP_LINKS.socials.twitter),
        },
        {
          title: 'Instagram',
          description: '@tomoflowapp',
          onPress: () => openLink(APP_LINKS.socials.instagram),
        },
        {
          title: 'Facebook',
          description: '@tomoflowapp',
          onPress: () => openLink(APP_LINKS.socials.facebook),
        },
      ],
    },
  ];

  const handleUpgradePress = () => {
    navigateToProUpsell(navigation);
  };

  const clearLocalData = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      Alert.alert('Cleared', 'Local state cleared. Restart the app.');
    } catch (error) {
      console.error('Failed to clear local data', error);
      Alert.alert('Clear Data', 'Something went wrong while clearing local data.');
    }
  };

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Info & Support</Text>
        <Text style={styles.subtitle}>
          Discover help resources, learn more about TomoFlow, and connect with our team.
        </Text>

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
            <Text style={styles.upgradeTitle}>Upgrade to Pro</Text>
            <Text style={styles.upgradeDescription}>
              Unlock unlimited activity types, richer insights, and more customization to keep
              your focus streak going.
            </Text>
          </View>
          <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgradePress}>
            <Text style={styles.upgradeButtonText}>View plans</Text>
          </TouchableOpacity>
        </View>

        {__DEV__ && (
          <View style={styles.debugCard}>
            <Text style={styles.debugTitle}>DEBUG PRO STATE</Text>
            <Text style={styles.debugText}>isProEffective: {String(isPro)}</Text>
            <Text style={styles.debugText}>proStatus.isPro: {String(proStatus.isPro)}</Text>
            <TouchableOpacity style={styles.clearButton} onPress={clearLocalData}>
              <Text style={styles.clearButtonText}>Clear Local App Data</Text>
            </TouchableOpacity>
          </View>
        )}

        <AdBanner />
      </ScrollView>

      <Modal
        animationType="fade"
        transparent
        visible={isRedeemModalVisible}
        onRequestClose={closeRedeemModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Redeem Code</Text>
            <Text style={styles.modalDescription}>Enter your promo or beta code below.</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. FOCUSPRO2023"
              placeholderTextColor={colors.textSecondary}
              value={redeemCode}
              onChangeText={setRedeemCode}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleRedeemSubmit}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalSecondaryButton} onPress={closeRedeemModal}>
                <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalPrimaryButton} onPress={handleRedeemSubmit}>
                <Text style={styles.modalPrimaryButtonText}>Redeem</Text>
              </TouchableOpacity>
            </View>
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
    modalPrimaryButtonText: {
      color: colors.textPrimary,
      fontWeight: '700',
      fontSize: 15,
      textTransform: 'uppercase',
    },
  });
}
