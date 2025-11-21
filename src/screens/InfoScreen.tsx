import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
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
import { APP_LINKS } from '../config/links';
import { RootStackParamList } from '../navigation/RootNavigator';
import useAppStore, { useIsPro } from '../store/appStore';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

type InfoItem = {
  title: string;
  description?: string;
  onPress: () => void;
};

type InfoSection = {
  title: string;
  items: InfoItem[];
};

const InfoRow: React.FC<InfoItem & { isLast?: boolean }> = ({
  title,
  description,
  onPress,
  isLast,
}) => {
  return (
    <TouchableOpacity
      style={[styles.row, !isLast && styles.rowDivider]}
      onPress={onPress}
    >
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        {description ? <Text style={styles.rowDescription}>{description}</Text> : null}
      </View>
      <Text style={styles.rowAction}>›</Text>
    </TouchableOpacity>
  );
};

// Relax typing so we can safely pass `key` in JSX without TS complaining
const AnyInfoRow = InfoRow as any;
const AnyView = View as any;

export const InfoScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const setProStatus = useAppStore((state) => state.setProStatus);
  const setPro = useAppStore((state) => state.setPro);
  const isPro = useIsPro();
  const [isRedeemModalVisible, setRedeemModalVisible] = useState(false);
  const [redeemCode, setRedeemCode] = useState('');

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
      setProStatus({ isPro: true });
      Alert.alert('Success', 'Code applied! Pomodoro Focus Pro is now unlocked.');
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
          title: 'Website',
          description: 'Guides, FAQs, and feature highlights',
          onPress: () => openLink(APP_LINKS.website),
        },
        {
          title: 'News & Offers',
          description: 'Latest product updates and discounts',
          onPress: () => openLink(APP_LINKS.news),
        },
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
          onPress: () => navigation.navigate('Paywall'),
        },
      ],
    },
    {
      title: 'Social',
      items: [
        {
          title: 'Twitter',
          description: '@pomodorofocus',
          onPress: () => openLink(APP_LINKS.socials.twitter),
        },
        {
          title: 'Instagram',
          description: '@pomodorofocusapp',
          onPress: () => openLink(APP_LINKS.socials.instagram),
        },
        {
          title: 'YouTube',
          description: 'Tips and walkthroughs',
          onPress: () => openLink(APP_LINKS.socials.youtube),
        },
      ],
    },
  ];

  const handleUpgradePress = () => {
    navigation.navigate('Paywall');
  };

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Info & Support</Text>
        <Text style={styles.subtitle}>
          Discover help resources, learn more about Pomodoro Focus, and connect with our team.
        </Text>

        {sections.map((section) => (
          <AnyView key={section.title} style={styles.section}>
            <Text style={styles.sectionLabel}>{section.title}</Text>
            <View style={styles.card}>
              {section.items.map((item, index) => (
                <AnyInfoRow
                  key={item.title}
                  title={item.title}
                  description={item.description}
                  onPress={item.onPress}
                  isLast={index === section.items.length - 1}
                />
              ))}
            </View>
          </AnyView>
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
          <TouchableOpacity
            style={styles.debugToggle}
            onPress={() => setPro(!isPro)}
          >
            <Text style={styles.debugToggleText}>Toggle Pro (now: {isPro ? 'Pro' : 'Free'})</Text>
          </TouchableOpacity>
        )}
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

const styles = StyleSheet.create({
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
  debugToggle: {
    marginTop: spacing.md,
    backgroundColor: '#333',
    padding: spacing.md,
    borderRadius: 10,
  },
  debugToggleText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
