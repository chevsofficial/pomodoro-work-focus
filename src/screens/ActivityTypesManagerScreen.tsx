import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { RootStackParamList } from '../navigation/RootNavigator';
import { goToPaywall, navigateToProUpsell } from '../navigation/proNavigation';
import { ActivityType } from '../models';
import useAppStore, {
  FREE_ACTIVITY_TYPE_LIMIT,
  selectCanCreateActivityType,
  selectRemainingFreeActivityTypes,
  useActiveActivityTypes,
  useArchivedActivityTypes,
  useEffectiveSettings,
  useIsPro,
} from '../store/appStore';
import { OTHER_ACTIVITY_TYPE_ID } from '../config/activityTypeConstants';
import { spacing } from '../theme/spacing';
import { useThemeColors } from '../theme/useThemeColors';
import { ActivityTypeModal, ActivityTypeModalStyles } from './SettingsScreen';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { t } from '../i18n/translations';

export const ActivityTypesManagerScreen: React.FC = () => {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const language = useAppStore((state) => state.language);

  useEffect(() => {
    navigation.setOptions({ title: t('nav.activityTypes') });
  }, [navigation, language]);

  const activeTypes = useActiveActivityTypes();
  const archivedTypes = useArchivedActivityTypes();
  const isPro = useIsPro();
  const canCreateActivityType = useAppStore(selectCanCreateActivityType);
  const remainingActivityTypes = useAppStore(selectRemainingFreeActivityTypes);
  const settings = useEffectiveSettings();
  const addActivityType = useAppStore((s) => s.addActivityType);
  const updateActivityType = useAppStore((s) => s.updateActivityType);
  const archiveActivityType = useAppStore((s) => s.archiveActivityType);
  const unarchiveActivityType = useAppStore((s) => s.unarchiveActivityType);
  const deleteActivityType = useAppStore((s) => s.deleteActivityType);

  const [isModalVisible, setModalVisible] = useState(false);
  const [editingType, setEditingType] = useState<ActivityType | undefined>(undefined);

  const visibleActiveTypes = useMemo(
    () => activeTypes.filter((type) => type.id !== OTHER_ACTIVITY_TYPE_ID),
    [activeTypes],
  );

  const hasReachedFreeActivityLimit = !isPro && remainingActivityTypes === 0;

  const closeModal = () => {
    setModalVisible(false);
    setEditingType(undefined);
  };

  const handleLockedColorPress = () => {
    if (isPro) {
      return;
    }

    closeModal();
    setTimeout(() => navigateToProUpsell(navigation), 0);
  };

  const handleLockedIntervalPress = () => {
    if (isPro) {
      return;
    }

    closeModal();
    setTimeout(() => goToPaywall(navigation, 'activity_type_intervals'), 0);
  };

  const handleSubmitActivityType = (payload: Omit<ActivityType, 'id'>) => {
    if (editingType) {
      updateActivityType(editingType.id, payload);
    } else {
      addActivityType(payload);
    }
    closeModal();
  };

  const handleAddActivityTypePress = () => {
    if (!canCreateActivityType) {
      navigateToProUpsell(navigation);
      return;
    }
    setEditingType(undefined);
    setModalVisible(true);
  };

  const handleEditPress = (type: ActivityType) => {
    setEditingType(type);
    setModalVisible(true);
  };

  const handleArchivePress = (id: string) => {
    archiveActivityType(id);
  };

  const handleUnarchivePress = (id: string) => {
    unarchiveActivityType(id);
  };

  const renderTypeRow = (type: ActivityType, mode: 'active' | 'archived') => {
    const colorDot = type.color ?? (mode === 'active' ? colors.primary : colors.textSecondary);

    return (
      <View key={type.id} style={styles.typeRow}>
        <View style={styles.typeInfo}>
          <View style={[styles.colorDot, { backgroundColor: colorDot }]} />
          <View style={styles.typeTextContainer}>
            <Text style={styles.typeName} numberOfLines={1}>
              {type.name}
            </Text>
            <Text style={styles.typeMeta} numberOfLines={2}>
              {t('activityTypes.meta')
                .replace('{work}', type.workDurationMinutes.toString())
                .replace('{short}', type.shortBreakMinutes.toString())
                .replace('{long}', type.longBreakMinutes.toString())}
            </Text>
            {mode === 'archived' && type.archivedAt && (
              <Text style={styles.archivedLabel}>
                {t('activityTypes.archivedOn').replace(
                  '{date}',
                  new Date(type.archivedAt).toLocaleDateString(),
                )}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.typeActions}>
          {mode === 'active' ? (
            <>
              <TouchableOpacity style={styles.chipButton} onPress={() => handleEditPress(type)}>
                <Text style={styles.chipButtonText}>{t('activityTypes.editButton')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.chipButtonDanger}
                onPress={() => handleArchivePress(type.id)}
              >
                <Text style={styles.chipButtonDangerText}>{t('activityTypes.archiveButton')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.chipButton} onPress={() => handleUnarchivePress(type.id)}>
              <Text style={styles.chipButtonText}>{t('activityTypes.unarchiveButton')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>{t('activityTypes.header')}</Text>

        {!isPro && remainingActivityTypes !== Infinity && (
          <Text style={styles.limitHelper}>
            {remainingActivityTypes > 0
              ? remainingActivityTypes === 1
                ? t('activityTypes.limitHelperSingle')
                : t('activityTypes.limitHelperPlural').replace(
                    '{count}',
                    remainingActivityTypes.toString(),
                  )
              : t('activityTypes.limitHelperReached')}
          </Text>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t('activityTypes.activeLabel')}</Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddActivityTypePress}>
              <Text style={styles.addButtonText}>{t('activityTypes.addShort')}</Text>
            </TouchableOpacity>
          </View>

          {hasReachedFreeActivityLimit && (
            <View style={styles.proBanner}>
              <Text style={styles.proBannerTitle}>
                {t('activityTypes.freeLimitTitle').replace(
                  '{limit}',
                  FREE_ACTIVITY_TYPE_LIMIT.toString(),
                )}
              </Text>
              <TouchableOpacity onPress={() => navigateToProUpsell(navigation)}>
                <Text style={styles.proBannerAction}>{t('activityTypes.proUpgradeCta')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {visibleActiveTypes.length === 0 ? (
            <Text style={styles.emptyText}>{t('activityTypes.noActive')}</Text>
          ) : (
            visibleActiveTypes.map((type) => renderTypeRow(type, 'active'))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('activityTypes.archivedLabel')}</Text>
          {archivedTypes.length === 0 ? (
            <Text style={styles.emptyText}>{t('activityTypes.noArchived')}</Text>
          ) : (
            archivedTypes.map((type) => renderTypeRow(type, 'archived'))
          )}
        </View>
      </ScrollView>

      <ActivityTypeModal
        visible={isModalVisible}
        onClose={closeModal}
        defaults={{
          workDurationMinutes: settings.workDurationMinutes,
          shortBreakMinutes: settings.shortBreakMinutes,
          longBreakMinutes: settings.longBreakMinutes,
          intervalsBeforeLongBreak: settings.intervalsBeforeLongBreak,
        }}
        initialValues={editingType}
        onSubmit={handleSubmitActivityType}
        onDelete={
          editingType
            ? () => {
                deleteActivityType(editingType.id);
                closeModal();
              }
            : undefined
        }
        onLockedColorPress={handleLockedColorPress}
        onLockedIntervalPress={handleLockedIntervalPress}
        colors={{
          ...colors,
          background: colors.background,
          surface: colors.surface,
          textPrimary: colors.textPrimary,
          textSecondary: colors.textSecondary,
          border: colors.border,
          accent: colors.accent,
          primary: colors.primary,
        }}
        styles={createModalCompatStyles(colors)}
      />
    </ScreenContainer>
  );
};

const createModalCompatStyles = (
  colors: ReturnType<typeof useThemeColors>,
): ActivityTypeModalStyles =>
  StyleSheet.create({
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
    modalActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      marginTop: spacing.md,
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

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    scrollContent: {
      paddingBottom: spacing.xl,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: spacing.lg,
    },
    limitHelper: {
      color: colors.textSecondary,
      fontSize: 13,
      marginBottom: spacing.md,
    },
    section: {
      marginBottom: spacing.lg,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    addButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: 16,
      backgroundColor: colors.primary,
    },
    addButtonText: {
      color: colors.background,
      fontWeight: '600',
      fontSize: 13,
    },
    emptyText: {
      color: colors.textSecondary,
      fontStyle: 'italic',
    },
    typeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      padding: spacing.md,
      borderRadius: 12,
      backgroundColor: colors.surface,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    typeInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    typeTextContainer: {
      flex: 1,
      marginRight: spacing.sm,
      paddingRight: spacing.sm,
    },
    colorDot: {
      width: 16,
      height: 16,
      borderRadius: 8,
      marginRight: spacing.sm,
    },
    typeName: {
      fontWeight: '600',
      color: colors.textPrimary,
    },
    typeMeta: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 2,
      flexShrink: 1,
    },
    archivedLabel: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 2,
      fontStyle: 'italic',
    },
    typeActions: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 0,
    },
    chipButton: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.textSecondary,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      marginLeft: spacing.xs,
    },
    chipButtonText: {
      fontSize: 12,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    chipButtonDanger: {
      borderRadius: 16,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      marginLeft: spacing.xs,
      backgroundColor: colors.accent,
    },
    chipButtonDangerText: {
      fontSize: 12,
      color: colors.background,
      fontWeight: '600',
    },
    proBanner: {
      padding: spacing.md,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.sm,
    },
    proBannerTitle: {
      color: colors.textPrimary,
      fontWeight: '700',
      marginBottom: spacing.xs,
    },
    proBannerAction: {
      color: colors.primary,
      fontWeight: '600',
    },
  });
