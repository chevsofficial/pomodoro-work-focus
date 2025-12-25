import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { LockedMinuteInput } from '../components/LockedMinuteInput';
import { RootStackParamList } from '../navigation/RootNavigator';
import { goToPaywall, navigateToProUpsell } from '../navigation/proNavigation';
import { ActivityType, PomodoroSettings } from '../models';
import useAppStore, {
  FREE_ACTIVITY_TYPE_LIMIT,
  selectCanCreateActivityType,
  useActiveActivityTypes,
  useArchivedActivityTypes,
  useEffectiveSettings,
} from '../store/appStore';
import { useSubscriptionGate } from '../utils/subscriptionGate';
import { signOut } from '../services/authService';
import { spacing } from '../theme/spacing';
import { THEMES, ThemeId, useThemeColors } from '../theme/useThemeColors';
import {
  ACTIVITY_COLORS,
  DEFAULT_ACTIVITY_COLOR,
  FREE_COLOR_KEYS,
} from '../theme/activityColors';
import { OTHER_ACTIVITY_TYPE_ID } from '../config/activityTypeConstants';
import { requestNotificationPermissions } from '../utils/notificationService';
import { playIntervalEndSound } from '../utils/soundService';
import { exportAllUserDataToCsv } from '../utils/exportToCsv';
import { t, TranslationKey } from '../i18n/translations';

const parsePositiveInt = (value: string, fallback: number) => {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return Math.max(1, parsed);
};

const SOUND_OPTIONS: { key: string; labelKey: TranslationKey }[] = [
  { key: 'chime1', labelKey: 'settings.sounds.chime1' },
  { key: 'chime2', labelKey: 'settings.sounds.chime2' },
  { key: 'chime3', labelKey: 'settings.sounds.chime3' },
];

const themeDisplayOrder: ThemeId[] = [
  'light',
  'dark',
  'forest',
  'ocean',
  'sunset',
  'neon',
  'spring',
  'summer',
  'autumn',
  'winter',
];

type SettingsStyles = ReturnType<typeof createStyles>;

export type ActivityTypeModalStyles = Pick<
  SettingsStyles,
  | 'modalBackdrop'
  | 'modalContent'
  | 'modalTitle'
  | 'modalField'
  | 'input'
  | 'modalLabel'
  | 'modalHint'
  | 'modalSubLabel'
  | 'colorGrid'
  | 'colorSwatchWrapper'
  | 'colorSwatchWrapperSelected'
  | 'colorSwatch'
  | 'colorSwatchLocked'
  | 'colorLockIcon'
  | 'colorLabel'
  | 'colorLabelSelected'
  | 'modalRowGroup'
  | 'modalRowItem'
  | 'modalRowItemSpacing'
  | 'modalActions'
  | 'modalPrimaryActions'
  | 'modalButton'
  | 'modalButtonSecondary'
  | 'modalButtonText'
  | 'modalButtonPrimary'
  | 'modalButtonSpacing'
  | 'modalButtonPrimaryText'
  | 'modalDeleteButton'
  | 'modalDeleteButtonSpacing'
  | 'modalDeleteText'
>;

const SettingInputRow: React.FC<{
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  styles: SettingsStyles;
  placeholderColor: string;
  locked?: boolean;
  onPressLocked?: () => void;
}> = ({ label, value, onChangeText, styles, placeholderColor, locked, onPressLocked }) => {
  if (locked) {
    return (
      <TouchableOpacity style={styles.settingRow} onPress={onPressLocked} activeOpacity={0.7}>
        <Text style={styles.settingLabel}>{label}</Text>
        <LockedMinuteInput
          value={value}
          locked
          onPressLocked={onPressLocked ?? (() => {})}
          inputStyle={styles.input}
          placeholderTextColor={placeholderColor}
          pressable={false}
        />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <LockedMinuteInput
        value={value}
        locked={false}
        onPressLocked={() => {}}
        onChangeText={onChangeText}
        inputStyle={styles.input}
        placeholderTextColor={placeholderColor}
      />
    </View>
  );
};

const SettingToggleRow: React.FC<{
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  styles: SettingsStyles;
  colors: ReturnType<typeof useThemeColors>;
}> = ({ label, value, onValueChange, styles, colors }) => {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        thumbColor={value ? colors.primary : colors.surface}
        trackColor={{ false: colors.border, true: colors.primary }}
      />
    </View>
  );
};

type ActivityTypeFormValues = {
  name: string;
  color: string;
  workDurationMinutes: string;
  shortBreakMinutes: string;
  longBreakMinutes: string;
  intervalsBeforeLongBreak: string;
};

type ActivityTypeModalProps = {
  visible: boolean;
  onClose: () => void;
  defaults: Pick<
    ActivityType,
    'workDurationMinutes' | 'shortBreakMinutes' | 'longBreakMinutes' | 'intervalsBeforeLongBreak'
  >;
  initialValues?: ActivityType;
  onSubmit: (payload: Omit<ActivityType, 'id'>) => void;
  onDelete?: () => void;
  onLockedColorPress?: () => void;
  onLockedIntervalPress?: () => void;
  colors: ReturnType<typeof useThemeColors>;
  styles: ActivityTypeModalStyles;
};

const buildFormState = (
  defaults: ActivityTypeModalProps['defaults'],
  initialValues: ActivityType | undefined,
  canCustomizeActivityTypeIntervals: boolean,
): ActivityTypeFormValues => {
  const intervalDefaults = {
    workDurationMinutes: defaults.workDurationMinutes.toString(),
    shortBreakMinutes: defaults.shortBreakMinutes.toString(),
    longBreakMinutes: defaults.longBreakMinutes.toString(),
    intervalsBeforeLongBreak: defaults.intervalsBeforeLongBreak.toString(),
  };

  if (initialValues) {
    return {
      name: initialValues.name,
      color: initialValues.color ?? DEFAULT_ACTIVITY_COLOR,
      ...(canCustomizeActivityTypeIntervals
        ? {
            workDurationMinutes: initialValues.workDurationMinutes.toString(),
            shortBreakMinutes: initialValues.shortBreakMinutes.toString(),
            longBreakMinutes: initialValues.longBreakMinutes.toString(),
            intervalsBeforeLongBreak: initialValues.intervalsBeforeLongBreak.toString(),
          }
        : intervalDefaults),
    };
  }

  return {
    name: '',
    color: DEFAULT_ACTIVITY_COLOR,
    ...intervalDefaults,
  };
};

export const ActivityTypeModal: React.FC<ActivityTypeModalProps> = ({
  visible,
  onClose,
  defaults,
  initialValues,
  onSubmit,
  onDelete,
  onLockedColorPress,
  onLockedIntervalPress,
  colors,
  styles,
}) => {
  const { isPro, canCustomizeActivityTypeIntervals } = useSubscriptionGate();
  const [formValues, setFormValues] = useState<ActivityTypeFormValues>(() =>
    buildFormState(defaults, initialValues, canCustomizeActivityTypeIntervals),
  );

  useEffect(() => {
    if (visible) {
      setFormValues(buildFormState(defaults, initialValues, canCustomizeActivityTypeIntervals));
    }
  }, [visible, defaults, initialValues, canCustomizeActivityTypeIntervals]);

  const handleChange = (key: keyof ActivityTypeFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const setColor = (value: string) => handleChange('color', value);

  const handleSubmit = () => {
    const trimmedName = formValues.name.trim();
    if (!trimmedName) {
      Alert.alert(
        t('settings.activityModal.nameAlertTitle'),
        t('settings.activityModal.nameAlertBody'),
      );
      return;
    }

    const intervalPayload = canCustomizeActivityTypeIntervals
      ? {
          workDurationMinutes: parsePositiveInt(
            formValues.workDurationMinutes,
            defaults.workDurationMinutes,
          ),
          shortBreakMinutes: parsePositiveInt(
            formValues.shortBreakMinutes,
            defaults.shortBreakMinutes,
          ),
          longBreakMinutes: parsePositiveInt(
            formValues.longBreakMinutes,
            defaults.longBreakMinutes,
          ),
          intervalsBeforeLongBreak: parsePositiveInt(
            formValues.intervalsBeforeLongBreak,
            defaults.intervalsBeforeLongBreak,
          ),
        }
      : {
          workDurationMinutes: defaults.workDurationMinutes,
          shortBreakMinutes: defaults.shortBreakMinutes,
          longBreakMinutes: defaults.longBreakMinutes,
          intervalsBeforeLongBreak: defaults.intervalsBeforeLongBreak,
        };

    const payload: Omit<ActivityType, 'id'> = {
      name: trimmedName,
      color: formValues.color.trim() ? formValues.color.trim() : undefined,
      ...intervalPayload,
    };

    onSubmit(payload);
    onClose();
  };

  const handleDelete = () => {
    if (!onDelete) {
      return;
    }

    Alert.alert(t('settings.activityModal.deleteTitle'), t('settings.activityModal.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          onDelete();
          onClose();
        },
      },
    ]);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onDismiss={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {initialValues ? t('settings.activityModal.editTitle') : t('settings.activityModal.addTitle')}
          </Text>
          <View style={styles.modalField}>
            <TextInput
              style={styles.input}
              placeholder={t('settings.activityModal.namePlaceholder')}
              placeholderTextColor={colors.textSecondary}
              value={formValues.name}
              onChangeText={(text) => handleChange('name', text)}
            />
          </View>
          <View style={styles.modalField}>
            <Text style={styles.modalLabel}>{t('settings.activityModal.colorLabel')}</Text>
            <Text style={styles.modalHint}>{t('settings.activityModal.colorHint')}</Text>

            <View style={styles.colorGrid}>
              {ACTIVITY_COLORS.map((c) => {
                const isSelected = formValues.color?.toLowerCase() === c.value.toLowerCase();
                const isFreeColor = FREE_COLOR_KEYS.includes(c.key);
                const isLocked = !isPro && !isFreeColor;

                const handlePress = () => {
                  if (isLocked) {
                    onLockedColorPress?.();
                    return;
                  }

                  setColor(c.value);
                };

                return (
                  <TouchableOpacity
                    key={c.key}
                    style={[
                      styles.colorSwatchWrapper,
                      isSelected && styles.colorSwatchWrapperSelected,
                    ]}
                    onPress={handlePress}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: c.value },
                        isLocked && styles.colorSwatchLocked,
                      ]}
                    >
                      {isLocked && <Text style={styles.colorLockIcon}>🔒</Text>}
                    </View>
                    <Text
                      style={[
                        styles.colorLabel,
                        isSelected && styles.colorLabelSelected,
                      ]}
                    >
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {isPro && (
            <View style={styles.modalField}>
              <Text style={styles.modalSubLabel}>{t('settings.activityModal.hexLabel')}</Text>
              <TextInput
                style={styles.input}
                placeholder={DEFAULT_ACTIVITY_COLOR}
                placeholderTextColor={colors.textSecondary}
                value={formValues.color}
                onChangeText={(text) => handleChange('color', text)}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}
          <View style={styles.modalRowGroup}>
            <View style={[styles.modalRowItem, styles.modalRowItemSpacing]}>
              <Text style={styles.modalLabel}>{t('settings.activityModal.workLabel')}</Text>
              <LockedMinuteInput
                value={formValues.workDurationMinutes}
                locked={!canCustomizeActivityTypeIntervals}
                onPressLocked={() => onLockedIntervalPress?.()}
                onChangeText={(text) => handleChange('workDurationMinutes', text)}
                inputStyle={styles.input}
              />
            </View>
            <View style={styles.modalRowItem}>
              <Text style={styles.modalLabel}>{t('settings.activityModal.shortBreakLabel')}</Text>
              <LockedMinuteInput
                value={formValues.shortBreakMinutes}
                locked={!canCustomizeActivityTypeIntervals}
                onPressLocked={() => onLockedIntervalPress?.()}
                onChangeText={(text) => handleChange('shortBreakMinutes', text)}
                inputStyle={styles.input}
              />
            </View>
          </View>
          <View style={styles.modalRowGroup}>
            <View style={[styles.modalRowItem, styles.modalRowItemSpacing]}>
              <Text style={styles.modalLabel}>{t('settings.activityModal.longBreakLabel')}</Text>
              <LockedMinuteInput
                value={formValues.longBreakMinutes}
                locked={!canCustomizeActivityTypeIntervals}
                onPressLocked={() => onLockedIntervalPress?.()}
                onChangeText={(text) => handleChange('longBreakMinutes', text)}
                inputStyle={styles.input}
              />
            </View>
            <View style={styles.modalRowItem}>
              <Text style={styles.modalLabel}>{t('settings.activityModal.intervalsLabel')}</Text>
              <LockedMinuteInput
                value={formValues.intervalsBeforeLongBreak}
                locked={!canCustomizeActivityTypeIntervals}
                onPressLocked={() => onLockedIntervalPress?.()}
                onChangeText={(text) => handleChange('intervalsBeforeLongBreak', text)}
                inputStyle={styles.input}
              />
            </View>
          </View>
          <View style={styles.modalActions}>
            {initialValues && (
              <TouchableOpacity
                style={[styles.modalDeleteButton, styles.modalDeleteButtonSpacing]}
                onPress={handleDelete}
              >
                <Text style={styles.modalDeleteText}>{t('common.delete')}</Text>
              </TouchableOpacity>
            )}
            <View style={styles.modalPrimaryActions}>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonSecondary]} onPress={onClose}>
                <Text style={styles.modalButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary, styles.modalButtonSpacing]}
                onPress={handleSubmit}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonPrimaryText]}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

type SettingsNavigation = NativeStackNavigationProp<RootStackParamList>;

type NumericSettingKey =
  | 'workDurationMinutes'
  | 'shortBreakMinutes'
  | 'longBreakMinutes'
  | 'intervalsBeforeLongBreak';

export const SettingsScreen: React.FC = () => {
  const settings = useEffectiveSettings();
  const storeSettings = useAppStore((state) => state.settings);
  const activeActivityTypes = useActiveActivityTypes();
  const archivedActivityTypes = useArchivedActivityTypes();
  const canCreateActivityType = useAppStore(selectCanCreateActivityType);
  const visibleActiveActivityTypes = useMemo(
    () => activeActivityTypes.filter((type) => type.id !== OTHER_ACTIVITY_TYPE_ID),
    [activeActivityTypes],
  );
  const { isPro, canCustomizeIntervals } = useSubscriptionGate();
  const cloudSync = useAppStore((state) => state.cloudSync);
  useAppStore((state) => state.language);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const setCloudSyncEnabled = useAppStore((state) => state.setCloudSyncEnabled);
  const deleteAllUserData = useAppStore((state) => state.deleteAllUserData);
  const navigation = useNavigation<SettingsNavigation>();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const goToPro = () => navigateToProUpsell(navigation);
  const goToIntervalsPaywall = () => goToPaywall(navigation, 'settings_intervals');
  const currentThemeId: ThemeId = storeSettings.themeId ?? 'dark';
  const currentTheme = useMemo(() => {
    const requested = THEMES[currentThemeId] ?? THEMES.dark;
    if (!isPro && requested.isProOnly) {
      return THEMES.dark;
    }

    return requested;
  }, [currentThemeId, isPro]);
  const currentThemeName = t(`themes.${currentTheme.id}` as any);
  const handleUpgradePress = () => {
    goToPro();
  };

  const hasReachedFreeActivityLimit = !isPro && !canCreateActivityType;

  const [numericValues, setNumericValues] = useState<Record<NumericSettingKey, string>>({
    workDurationMinutes: settings.workDurationMinutes.toString(),
    shortBreakMinutes: settings.shortBreakMinutes.toString(),
    longBreakMinutes: settings.longBreakMinutes.toString(),
    intervalsBeforeLongBreak: settings.intervalsBeforeLongBreak.toString(),
  });

  useEffect(() => {
    setNumericValues({
      workDurationMinutes: settings.workDurationMinutes.toString(),
      shortBreakMinutes: settings.shortBreakMinutes.toString(),
      longBreakMinutes: settings.longBreakMinutes.toString(),
      intervalsBeforeLongBreak: settings.intervalsBeforeLongBreak.toString(),
    });
  }, [
    settings.workDurationMinutes,
    settings.shortBreakMinutes,
    settings.longBreakMinutes,
    settings.intervalsBeforeLongBreak,
  ]);

  const handleNumericChange = (key: NumericSettingKey, value: string) => {
    if (!canCustomizeIntervals) {
      goToIntervalsPaywall();
      return;
    }

    setNumericValues((prev) => ({ ...prev, [key]: value }));
    const parsed = parseInt(value, 10);
    if (!Number.isNaN(parsed)) {
      updateSettings({ [key]: Math.max(1, parsed) } as Partial<PomodoroSettings>);
    }
  };

  const handleToggleChange = (key: keyof Pick<PomodoroSettings, 'soundEnabled' | 'vibrationEnabled'>) => {
    return (value: boolean) => updateSettings({ [key]: value });
  };

  const handleToggleAutoStart = (value: boolean) => {
    if (!isPro) {
      goToPro();
      return;
    }

    updateSettings({ autoStartNextInterval: value });
  };

  const handleToggleNotifications = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        updateSettings({ notificationsEnabled: false });
        Alert.alert(
          t('settings.alerts.notificationsDisabledTitle'),
          t('settings.alerts.notificationsDisabledBody'),
        );
        return;
      }
    }

    updateSettings({ notificationsEnabled: enabled });
  };

  const handleGoToSignIn = () => {
    navigation.navigate('Auth');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Auth: sign out failed', error);
      Alert.alert(t('settings.alerts.signOutFailedTitle'), t('settings.alerts.signOutFailedBody'));
    }
  };

  const handleCloudSyncToggle = (value: boolean) => {
    if (!cloudSync.userId) {
      handleGoToSignIn();
      return;
    }

    setCloudSyncEnabled(value);
  };

  const handleManageActivityTypes = () => {
    navigation.navigate('ActivityTypesManager');
  };

  const handleExportAllData = () => {
    if (!isPro) {
      handleUpgradePress();
      return;
    }

    exportAllUserDataToCsv();
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteAllUserData();
      setShowDeleteAllModal(false);
      Alert.alert(
        t('settings.alerts.deleteAllTitle'),
        t('settings.alerts.deleteAllBody'),
      );
    } catch (error) {
      console.error('Delete all data failed', error);
      Alert.alert(t('settings.alerts.deleteFailedTitle'), t('settings.alerts.deleteFailedBody'));
    }
  };

  const [isThemeModalVisible, setThemeModalVisible] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);

  const lastSyncedText = cloudSync.lastSyncedAt
    ? `${t('settings.cloud.lastSyncedPrefix')}: ${new Date(cloudSync.lastSyncedAt).toLocaleString()}`
    : t('settings.cloud.notSynced');

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{t('settings.title')}</Text>
        <Text style={styles.subtitle}>{t('settings.subtitle')}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.durations.title')}</Text>
          <SettingInputRow
            label={t('settings.durations.work')}
            value={numericValues.workDurationMinutes}
            onChangeText={(text) => handleNumericChange('workDurationMinutes', text)}
            styles={styles}
            placeholderColor={colors.textSecondary}
            locked={!canCustomizeIntervals}
            onPressLocked={goToIntervalsPaywall}
          />
          <SettingInputRow
            label={t('settings.durations.shortBreak')}
            value={numericValues.shortBreakMinutes}
            onChangeText={(text) => handleNumericChange('shortBreakMinutes', text)}
            styles={styles}
            placeholderColor={colors.textSecondary}
            locked={!canCustomizeIntervals}
            onPressLocked={goToIntervalsPaywall}
          />
          <SettingInputRow
            label={t('settings.durations.longBreak')}
            value={numericValues.longBreakMinutes}
            onChangeText={(text) => handleNumericChange('longBreakMinutes', text)}
            styles={styles}
            placeholderColor={colors.textSecondary}
            locked={!canCustomizeIntervals}
            onPressLocked={goToIntervalsPaywall}
          />
          <SettingInputRow
            label={t('settings.durations.intervalsBeforeLong')}
            value={numericValues.intervalsBeforeLongBreak}
            onChangeText={(text) => handleNumericChange('intervalsBeforeLongBreak', text)}
            styles={styles}
            placeholderColor={colors.textSecondary}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.automation.title')}</Text>
          <SettingToggleRow
            label={t('settings.automation.autoStart')}
            value={settings.autoStartNextInterval}
            onValueChange={handleToggleAutoStart}
            styles={styles}
            colors={colors}
          />
          <View style={styles.soundSectionHeader}>
            <Text style={styles.settingLabel}>{t('settings.automation.notificationSound')}</Text>
            <TouchableOpacity style={styles.testSoundButton} onPress={() => playIntervalEndSound()}>
              <Text style={styles.testSoundButtonLabel}>{t('settings.automation.testSound')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.soundOptionsRow}>
            {SOUND_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.soundOption,
                  settings.notificationSoundKey === option.key && styles.soundOptionActive,
                ]}
                onPress={() => updateSettings({ notificationSoundKey: option.key })}
              >
                <Text
                  style={[
                    styles.soundOptionLabel,
                    settings.notificationSoundKey === option.key && styles.soundOptionLabelActive,
                  ]}
                >
                  {t(option.labelKey)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <SettingToggleRow
            label={t('settings.automation.soundEnabled')}
            value={settings.soundEnabled}
            onValueChange={handleToggleChange('soundEnabled')}
            styles={styles}
            colors={colors}
          />
          <SettingToggleRow
            label={t('settings.automation.vibrationEnabled')}
            value={settings.vibrationEnabled}
            onValueChange={handleToggleChange('vibrationEnabled')}
            styles={styles}
            colors={colors}
          />
          <SettingToggleRow
            label={t('settings.automation.notificationsEnabled')}
            value={settings.notificationsEnabled}
            onValueChange={handleToggleNotifications}
            styles={styles}
            colors={colors}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('settings.activityTypes.title')}</Text>
            <TouchableOpacity onPress={handleManageActivityTypes}>
              <Text style={styles.sectionAction}>{t('common.manage')}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionHint}>
            {visibleActiveActivityTypes.length} {t('settings.activityTypes.activeLabel')} ·{' '}
            {archivedActivityTypes.length} {t('settings.activityTypes.archivedLabel')}
          </Text>
          {hasReachedFreeActivityLimit && (
            <View style={[styles.proBanner, styles.activityTypeUpsell]}>
              <Text style={styles.proBannerTitle}>
                {t('settings.activityTypes.freeLimitTitle').replace(
                  '{limit}',
                  FREE_ACTIVITY_TYPE_LIMIT.toString(),
                )}
              </Text>
              <TouchableOpacity onPress={handleUpgradePress}>
                <Text style={styles.proBannerAction}>{t('settings.activityTypes.proUpgradeCta')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.theme.title')}</Text>

          <TouchableOpacity
            style={styles.themeRow}
            onPress={() => {
              setThemeModalVisible(true);
            }}
          >
            <View>
              <Text style={styles.themeRowTitle}>{t('settings.theme.rowTitle')}</Text>
              <Text style={styles.themeRowValue}>{currentThemeName}</Text>
            </View>

            <View style={styles.themeRowPreview}>
              <View
                style={[styles.themeRowColorDot, { backgroundColor: currentTheme.colors.primary }]}
              />
              <View style={[styles.themeRowColorDot, { backgroundColor: currentTheme.colors.accent }]} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('settings.cloud.title')}</Text>
            {isPro && cloudSync.userId && (
              <TouchableOpacity onPress={handleSignOut}>
                <Text style={styles.sectionAction}>{t('common.signOut')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {isPro ? (
            <>
              <View style={styles.cloudSettings}>
                {!cloudSync.userId ? (
                  <>
                    <Text style={styles.sectionHint}>{t('settings.cloud.signInPrompt')}</Text>
                    <TouchableOpacity style={styles.authButton} onPress={handleGoToSignIn}>
                      <Text style={styles.authButtonLabel}>{t('common.signIn')}</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View style={styles.settingRow}>
                      <Text style={styles.settingLabel}>{t('settings.cloud.cloudSyncEnabled')}</Text>
                      <Switch
                        value={cloudSync.cloudSyncEnabled}
                        onValueChange={handleCloudSyncToggle}
                        thumbColor={cloudSync.cloudSyncEnabled ? colors.primary : colors.surface}
                        trackColor={{ false: colors.border, true: colors.primary }}
                      />
                    </View>
                    <Text style={styles.sectionHint}>{lastSyncedText}</Text>
                  </>
                )}
              </View>

              <View style={styles.cloudExportSection}>
                <Text style={styles.sectionHint}>
                  {t('settings.cloud.exportDescription')}
                </Text>
                <TouchableOpacity style={styles.secondaryActionButton} onPress={handleExportAllData}>
                  <Text style={styles.secondaryActionButtonText}>{t('settings.cloud.exportButton')}</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.proBox}>
              <Text style={styles.proBoxText}>{t('settings.cloud.proUpsell')}</Text>
              <TouchableOpacity style={styles.proUpsellButton} onPress={handleUpgradePress}>
                <Text style={styles.proUpsellButtonText}>{t('common.viewProPlans')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.dangerZoneContainer}>
          <Text style={styles.dangerZoneTitle}>{t('settings.danger.title')}</Text>
          <Text style={styles.dangerZoneDescription}>{t('settings.danger.description')}</Text>

          <TouchableOpacity
            style={styles.dangerZoneButton}
            onPress={() => setShowDeleteAllModal(true)}
          >
            <Text style={styles.dangerZoneButtonText}>{t('settings.danger.deleteButton')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showDeleteAllModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDeleteAllModal(false)}
      >
        <View style={styles.dangerModalBackdrop}>
          <View style={styles.dangerModalContent}>
            <Text style={styles.dangerModalTitle}>{t('settings.danger.modalTitle')}</Text>
            <Text style={styles.dangerModalBody}>{t('settings.danger.modalBody')}</Text>

            {isPro ? (
              <TouchableOpacity style={styles.secondaryButton} onPress={handleExportAllData}>
                <Text style={styles.secondaryButtonText}>{t('settings.danger.exportButton')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                  setShowDeleteAllModal(false);
                  handleUpgradePress();
                }}
              >
                <Text style={styles.secondaryButtonText}>{t('common.upgradeForExport')}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.dangerConfirmButton} onPress={handleConfirmDelete}>
              <Text style={styles.dangerConfirmButtonText}>{t('common.yesDeleteEverything')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dangerCancelButton}
              onPress={() => setShowDeleteAllModal(false)}
            >
              <Text style={styles.dangerCancelButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isThemeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setThemeModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.themeModalBackdrop}
          onPress={() => setThemeModalVisible(false)}
        >
          <View style={styles.themeModalCard}>
            <Text style={styles.themeModalTitle}>{t('settings.theme.chooseTitle')}</Text>

            <ScrollView style={styles.themeModalList}>
              {themeDisplayOrder.map((themeId) => {
                const theme = THEMES[themeId];
                const isSelected = theme.id === currentTheme.id;
                const isLocked = theme.isProOnly && !isPro;

                return (
                  <TouchableOpacity
                    key={theme.id}
                    style={[styles.themeOption, isSelected && styles.themeOptionSelected]}
                    onPress={() => {
                      // use the isLocked from the outer scope (avoid redeclaring)
                      if (isLocked) {
                        setThemeModalVisible(false);
                        navigateToProUpsell(navigation);
                        return;
                      }

                      updateSettings({ themeId: theme.id });
                      setThemeModalVisible(false);
                    }}
                  >
                    <View
                      style={[
                        styles.themePreview,
                        {
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.themePreviewSwatch,
                          styles.themePreviewSwatchSpacing,
                          { backgroundColor: theme.colors.primary },
                        ]}
                      />
                      <View
                        style={[
                          styles.themePreviewSwatch,
                          { backgroundColor: theme.colors.accent },
                        ]}
                      />
                    </View>

                <View style={styles.themeTextContainer}>
                  <Text style={styles.themeName}>
                    {t(`themes.${theme.id}` as any)}
                  </Text>

                  {isLocked && <Text style={styles.themeLockLabel}>{t('settings.theme.proLabel')}</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
            </ScrollView>
          </View>
        </TouchableOpacity>
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
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionAction: {
    color: colors.accent,
    fontWeight: '600',
  },
  sectionActionDisabled: {
    color: colors.textSecondary,
    opacity: 0.5,
  },
  sectionHint: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  settingLabel: {
    color: colors.textPrimary,
    fontSize: 16,
    flex: 1,
    paddingRight: spacing.md,
  },
  settingValue: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  soundSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  soundOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
    marginBottom: spacing.md,
  },
  soundOption: {
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.textSecondary,
    marginHorizontal: spacing.xs,
    marginVertical: spacing.xs,
  },
  soundOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  soundOptionLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  soundOptionLabelActive: {
    color: colors.background,
    fontWeight: '600',
  },
  testSoundButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  testSoundButtonLabel: {
    color: colors.background,
    fontWeight: '600',
    fontSize: 12,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    minWidth: 80,
  },
  activityTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  activityTypeColorWrapper: {
    paddingRight: spacing.md,
  },
  activityTypeColor: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  activityTypeColorEnabled: {
    opacity: 1,
  },
  activityTypeColorDisabled: {
    opacity: 0.5,
  },
  activityTypeContent: {
    flex: 1,
  },
  activityTypeName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  activityTypeMeta: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  emptyStateText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  proBanner: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.background,
  },
  activityTypeUpsell: {
    marginTop: spacing.sm,
  },
  proBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  cloudSettings: {
    gap: spacing.xs,
  },
  cloudExportSection: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  proBoxText: {
    color: colors.textPrimary,
    fontSize: 14,
  },
  proUpsellButton: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  proUpsellButtonText: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  authButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  authButtonLabel: {
    color: colors.surface,
    fontWeight: '700',
    fontSize: 15,
  },
  proBannerTitle: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  proBannerAction: {
    color: colors.primary,
    fontWeight: '600',
  },
  secondaryActionButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  secondaryActionButtonText: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  dangerZoneContainer: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d12b2b33',
    backgroundColor: colors.background,
  },
  dangerZoneTitle: {
    fontWeight: '700',
    fontSize: 16,
    marginBottom: spacing.xs,
    color: '#d12b2b',
  },
  dangerZoneDescription: {
    fontSize: 13,
    marginBottom: spacing.md,
    color: colors.textSecondary,
  },
  dangerZoneButton: {
    paddingVertical: spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d12b2b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerZoneButtonText: {
    color: '#d12b2b',
    fontWeight: '700',
  },
  themeRow: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  themeRowTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  themeRowValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  themeRowPreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeRowColorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: 6,
  },
  themeModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  themeModalCard: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: '70%',
  },
  themeModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: colors.textPrimary,
  },
  themeModalList: {
    maxHeight: '100%',
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  themeOptionSelected: {
    borderColor: colors.primary,
  },
  themePreview: {
    width: 40,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 10,
    overflow: 'hidden',
  },
  themePreviewSwatch: {
    flex: 1,
    borderRadius: 6,
  },
  themePreviewSwatchSpacing: {
    marginBottom: 2,
  },
  themeTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  themeName: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  themeLockLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF5A5F',
  },
  dangerModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  dangerModalContent: {
    borderRadius: 16,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dangerModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.sm,
    color: colors.textPrimary,
  },
  dangerModalBody: {
    fontSize: 14,
    marginBottom: spacing.md,
    color: colors.textSecondary,
  },
  secondaryButton: {
    paddingVertical: spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    marginBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  secondaryButtonText: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  dangerConfirmButton: {
    paddingVertical: spacing.sm,
    borderRadius: 10,
    backgroundColor: '#d12b2b',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dangerConfirmButtonText: {
    color: colors.surface,
    fontWeight: '700',
  },
  dangerCancelButton: {
    paddingVertical: spacing.sm,
    borderRadius: 10,
    alignItems: 'center',
  },
  dangerCancelButtonText: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: `${colors.background}99`,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    width: '100%',
    borderColor: colors.border,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  modalField: {
    marginBottom: spacing.md,
  },
  modalRowGroup: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  modalRowItem: {
    flex: 1,
  },
  modalRowItemSpacing: {
    marginRight: spacing.md,
  },
  modalLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: spacing.xs,
  },
  modalHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalSubLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs / 2,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xs,
    marginHorizontal: -spacing.xs,
  },
  colorSwatchWrapper: {
    width: '30%',
    alignItems: 'center',
    marginHorizontal: spacing.xs,
    marginVertical: spacing.xs,
  },
  colorSwatchWrapperSelected: {
    borderRadius: 16,
    padding: 2,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${colors.textPrimary}4d`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchLocked: {
    opacity: 0.5,
  },
  colorLockIcon: {
    fontSize: 14,
  },
  colorLabel: {
    marginTop: 4,
    fontSize: 11,
    color: colors.textSecondary,
  },
  colorLabelSelected: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  modalActions: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  modalPrimaryActions: {
    flexDirection: 'row',
  },
  modalButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalButtonText: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  modalButtonPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modalButtonPrimaryText: {
    color: colors.textPrimary,
  },
  modalButtonSecondary: {
    backgroundColor: 'transparent',
  },
  modalButtonSpacing: {
    marginLeft: spacing.sm,
  },
  modalDeleteButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  modalDeleteButtonSpacing: {
    marginRight: 'auto',
  },
  modalDeleteText: {
    color: colors.primary,
    fontWeight: '600',
  },
  });
}
