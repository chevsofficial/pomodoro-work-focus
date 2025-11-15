import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import React, { useMemo } from 'react';
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { RootStackParamList } from '../navigation/RootNavigator';
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

const InfoRow: React.FC<InfoItem & { isLast?: boolean }> = ({ title, description, onPress, isLast }) => {
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

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Open Link', 'Something went wrong while opening this link.');
    });
  };

  const sections = useMemo<InfoSection[]>(() => {
    const rateUrl =
      Platform.select({
        ios: 'itms-apps://itunes.apple.com/app/id000000000?action=write-review',
        android: 'market://details?id=com.pomodorofocus',
      }) ?? 'https://pomodorofocus.app';

    return [
      {
        title: 'Support',
        items: [
          {
            title: 'Contact support',
            description: 'Email our team for help',
            onPress: () => openLink('mailto:support@pomodorofocus.app'),
          },
          {
            title: 'Rate Pomodoro Focus',
            description: 'Share feedback on the app store',
            onPress: () => openLink(rateUrl),
          },
          {
            title: 'Redeem a code',
            description: 'Unlock special promos or betas',
            onPress: () =>
              Alert.alert(
                'Redeem Code',
                'Code redemption will be available soon. Stay tuned for upcoming offers!',
              ),
          },
        ],
      },
      {
        title: 'About Pomodoro Focus',
        items: [
          {
            title: 'Official website',
            description: 'Guides, FAQs, and feature highlights',
            onPress: () => openLink('https://pomodorofocus.app'),
          },
          {
            title: 'News & offers',
            description: 'Latest product updates and discounts',
            onPress: () => openLink('https://pomodorofocus.app/news'),
          },
        ],
      },
      {
        title: 'Legal',
        items: [
          {
            title: 'Terms of Use',
            description: 'Understand the agreement for using the app',
            onPress: () => openLink('https://pomodorofocus.app/terms'),
          },
          {
            title: 'Privacy Policy',
            description: 'See how we protect your data',
            onPress: () => openLink('https://pomodorofocus.app/privacy'),
          },
        ],
      },
      {
        title: 'Social',
        items: [
          {
            title: 'Twitter',
            description: '@pomodorofocus',
            onPress: () => openLink('https://twitter.com/pomodorofocus'),
          },
          {
            title: 'Instagram',
            description: '@pomodorofocusapp',
            onPress: () => openLink('https://instagram.com/pomodorofocusapp'),
          },
          {
            title: 'YouTube',
            description: 'Tips and walkthroughs',
            onPress: () => openLink('https://youtube.com/@pomodorofocus'),
          },
        ],
      },
    ];
  }, []);

  const handleUpgradePress = () => {
    navigation.navigate('Paywall');
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Info & Support</Text>
        <Text style={styles.subtitle}>Discover more ways to get help and stay connected with Pomodoro Focus.</Text>

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
                />
              ))}
            </View>
          </View>
        ))}

        <View style={styles.upgradeCard}>
          <View style={styles.upgradeTextWrapper}>
            <Text style={styles.upgradeTitle}>Upgrade to Pro</Text>
            <Text style={styles.upgradeDescription}>
              Unlock unlimited activity types, richer insights, and more customization to keep your focus streak going.
            </Text>
          </View>
          <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgradePress}>
            <Text style={styles.upgradeButtonText}>View plans</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
});
