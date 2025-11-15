import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
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
import { RootStackParamList } from '../navigation/RootNavigator';
import { ActivityType, PomodoroSettings } from '../models';
import useAppStore, { useActivityTypes, useSettings } from '../store/appStore';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

const parsePositiveInt = (value: string, fallback: number) => {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return Math.max(1, parsed);
};

const SettingInputRow: React.FC<{
  label: string;
  value: string;
  onChangeText: (text: string) => void;
}> = ({ label, value, onChangeText }) => {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        placeholderTextColor={colors.textSecondary}
      />
    </View>
  );
};

const SettingToggleRow: React.FC<{
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}> = ({ label, value, onValueChange }) => {
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

const ActivityTypeRow: React.FC<{
  type: ActivityType;
  onPress: () => void;
}> = ({ type, onPress }) => {
  return (
    <TouchableOpacity style={styles.activityTypeRow} onPress={onPress}>
      <View style={styles.activityTypeColorWrapper}>
        <View
          style={[
            styles.activityTypeColor,
            {
              backgroundColor: type.color ?? colors.border,
              opacity: type.color ? 1 : 0.5,
            },
          ]}
        />
      </View>
      <View style={styles.activityTypeContent}>
        <Text style={styles.activityTypeName}>{type.name}</Text>
        <Text style={styles.activityTypeMeta}>
          {`${type.workDurationMinutes}m work · ${type.shortBreakMinutes}m short · ${type.longBreakMinutes}m long · ${type.intervalsBeforeLongBreak} intervals`}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const AnyActivityTypeRow = ActivityTypeRow as any;

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
};

const buildFormState = (
  defaults: ActivityTypeModalProps['defaults'],
  initialValues?: ActivityType,
): ActivityTypeFormValues => {
  if (initialValues) {
    return {
      name: initialValues.name,
      color: initialValues.color ?? '',
      workDurationMinutes: initialValues.workDurationMinutes.toString(),
      shortBreakMinutes: initialValues.shortBreakMinutes.toString(),
      longBreakMinutes: initialValues.longBreakMinutes.toString(),
      intervalsBeforeLongBreak: initialValues.intervalsBeforeLongBreak.toString(),
    };
  }

  return {
    name: '',
    color: '',
    workDurationMinutes: defaults.workDurationMinutes.toString(),
    shortBreakMinutes: defaults.shortBreakMinutes.toString(),
    longBreakMinutes: defaults.longBreakMinutes.toString(),
    intervalsBeforeLongBreak: defaults.intervalsBeforeLongBreak.toString(),
  };
};

const ActivityTypeModal: React.FC<ActivityTypeModalProps> = ({
  visible,
  onClose,
  defaults,
  initialValues,
  onSubmit,
  onDelete,
}) => {
  const [formValues, setFormValues] = useState<ActivityTypeFormValues>(() => buildFormState(defaults, initialValues));

  useEffect(() => {
    if (visible) {
      setFormValues(buildFormState(defaults, initialValues));
    }
  }, [visible, defaults, initialValues]);

  const handleChange = (key: keyof ActivityTypeFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    const trimmedName = formValues.name.trim();
    if (!trimmedName) {
      Alert.alert('Activity Type', 'Please enter a name.');
      return;
    }

    const payload: Omit<ActivityType, 'id'> = {
      name: trimmedName,
      color: formValues.color.trim() ? formValues.color.trim() : undefined,
      workDurationMinutes: parsePositiveInt(formValues.workDurationMinutes, defaults.workDurationMinutes),
      shortBreakMinutes: parsePositiveInt(formValues.shortBreakMinutes, defaults.shortBreakMinutes),
      longBreakMinutes: parsePositiveInt(formValues.longBreakMinutes, defaults.longBreakMinutes),
      intervalsBeforeLongBreak: parsePositiveInt(
        formValues.intervalsBeforeLongBreak,
        defaults.intervalsBeforeLongBreak,
      ),
    };

    onSubmit(payload);
    onClose();
  };

  const handleDelete = () => {
    if (!onDelete) {
      return;
    }

    Alert.alert('Delete Activity Type', 'Are you sure you want to delete this activity type?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          onDelete();
          onClose();
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{initialValues ? 'Edit Activity Type' : 'Add Activity Type'}</Text>
          <TextInput
            style={styles.input}
            placeholder="Name"
            placeholderTextColor={colors.textSecondary}
            value={formValues.name}
            onChangeText={(text) => handleChange('name', text)}
          />
          <TextInput
            style={styles.input}
            placeholder="Color (hex or name)"
            placeholderTextColor={colors.textSecondary}
            value={formValues.color}
            onChangeText={(text) => handleChange('color', text)}
          />
          <View style={styles.modalRowGroup}>
            <View style={[styles.modalRowItem, styles.modalRowItemSpacing]}>
              <Text style={styles.modalLabel}>Work (min)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={formValues.workDurationMinutes}
                onChangeText={(text) => handleChange('workDurationMinutes', text)}
              />
            </View>
            <View style={styles.modalRowItem}>
              <Text style={styles.modalLabel}>Short Break</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={formValues.shortBreakMinutes}
                onChangeText={(text) => handleChange('shortBreakMinutes', text)}
              />
            </View>
          </View>
          <View style={styles.modalRowGroup}>
            <View style={[styles.modalRowItem, styles.modalRowItemSpacing]}>
              <Text style={styles.modalLabel}>Long Break</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={formValues.longBreakMinutes}
                onChangeText={(text) => handleChange('longBreakMinutes', text)}
              />
            </View>
            <View style={styles.modalRowItem}>
              <Text style={styles.modalLabel}>Intervals Before Long</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={formValues.intervalsBeforeLongBreak}
                onChangeText={(text) => handleChange('intervalsBeforeLongBreak', text)}
              />
            </View>
          </View>
          <View style={styles.modalActions}>
            {initialValues && (
              <TouchableOpacity
                style={[styles.modalDeleteButton, styles.modalDeleteButtonSpacing]}
                onPress={handleDelete}
              >
                <Text style={styles.modalDeleteText}>Delete</Text>
              </TouchableOpacity>
            )}
            <View style={styles.modalPrimaryActions}>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonSecondary]} onPress={onClose}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary, styles.modalButtonSpacing]}
                onPress={handleSubmit}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonPrimaryText]}>Save</Text>
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
  const settings = useSettings();
  const activityTypes = useActivityTypes();
  const updateSettings = useAppStore((state) => state.updateSettings);
  const addActivityType = useAppStore((state) => state.addActivityType);
  const updateActivityType = useAppStore((state) => state.updateActivityType);
  const deleteActivityType = useAppStore((state) => state.deleteActivityType);
  const navigation = useNavigation<SettingsNavigation>();

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
    setNumericValues((prev) => ({ ...prev, [key]: value }));
    const parsed = parseInt(value, 10);
    if (!Number.isNaN(parsed)) {
      updateSettings({ [key]: Math.max(1, parsed) } as Partial<PomodoroSettings>);
    }
  };

  const handleToggleChange = (key: keyof Pick<
    PomodoroSettings,
    'autoStartNextInterval' | 'soundEnabled' | 'vibrationEnabled' | 'notificationsEnabled'
  >) => {
    return (value: boolean) => updateSettings({ [key]: value });
  };

  const [isModalVisible, setModalVisible] = useState(false);
  const [editingType, setEditingType] = useState<ActivityType | undefined>(undefined);

  const durationDefaults = useMemo(
    () => ({
      workDurationMinutes: settings.workDurationMinutes,
      shortBreakMinutes: settings.shortBreakMinutes,
      longBreakMinutes: settings.longBreakMinutes,
      intervalsBeforeLongBreak: settings.intervalsBeforeLongBreak,
    }),
    [
      settings.workDurationMinutes,
      settings.shortBreakMinutes,
      settings.longBreakMinutes,
      settings.intervalsBeforeLongBreak,
    ],
  );

  const openAddModal = () => {
    setEditingType(undefined);
    setModalVisible(true);
  };

  const handleSelectActivityType = (type: ActivityType) => {
    setEditingType(type);
    setModalVisible(true);
  };

  const handleSubmitActivityType = (payload: Omit<ActivityType, 'id'>) => {
    if (editingType) {
      updateActivityType(editingType.id, payload);
    } else {
      addActivityType(payload);
    }
  };

  const handleDeleteActivityType = () => {
    if (editingType) {
      deleteActivityType(editingType.id);
    }
  };

  const handleUpgradePress = () => {
    navigation.navigate('Paywall');
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Customize your Pomodoro workflow.</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Durations</Text>
          <SettingInputRow
            label="Work Duration (minutes)"
            value={numericValues.workDurationMinutes}
            onChangeText={(text) => handleNumericChange('workDurationMinutes', text)}
          />
          <SettingInputRow
            label="Short Break Duration (minutes)"
            value={numericValues.shortBreakMinutes}
            onChangeText={(text) => handleNumericChange('shortBreakMinutes', text)}
          />
          <SettingInputRow
            label="Long Break Duration (minutes)"
            value={numericValues.longBreakMinutes}
            onChangeText={(text) => handleNumericChange('longBreakMinutes', text)}
          />
          <SettingInputRow
            label="Intervals Before Long Break"
            value={numericValues.intervalsBeforeLongBreak}
            onChangeText={(text) => handleNumericChange('intervalsBeforeLongBreak', text)}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Automation & Notifications</Text>
          <SettingToggleRow
            label="Auto-start next interval"
            value={settings.autoStartNextInterval}
            onValueChange={handleToggleChange('autoStartNextInterval')}
          />
          <SettingToggleRow
            label="Sound enabled"
            value={settings.soundEnabled}
            onValueChange={handleToggleChange('soundEnabled')}
          />
          <SettingToggleRow
            label="Vibration enabled"
            value={settings.vibrationEnabled}
            onValueChange={handleToggleChange('vibrationEnabled')}
          />
          <SettingToggleRow
            label="Notifications enabled"
            value={settings.notificationsEnabled}
            onValueChange={handleToggleChange('notificationsEnabled')}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Activity Types</Text>
            <TouchableOpacity onPress={openAddModal}>
              <Text style={styles.sectionAction}>+ Add Activity Type</Text>
            </TouchableOpacity>
          </View>
          {activityTypes.length === 0 && (
            <Text style={styles.emptyStateText}>No custom activity types yet.</Text>
          )}
          {activityTypes.map((type) => (
            <AnyActivityTypeRow key={type.id} type={type} onPress={() => handleSelectActivityType(type)} />
          ))}
        </View>

        <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgradePress}>
          <Text style={styles.upgradeText}>Upgrade to Pro</Text>
        </TouchableOpacity>
      </ScrollView>

      <ActivityTypeModal
        visible={isModalVisible}
        onClose={() => setModalVisible(false)}
        defaults={durationDefaults}
        initialValues={editingType}
        onSubmit={handleSubmitActivityType}
        onDelete={editingType ? handleDeleteActivityType : undefined}
      />
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
  upgradeButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  upgradeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
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
    color: '#fff',
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
    color: '#FF6B6B',
    fontWeight: '600',
  },
});
