import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { RootStackParamList } from '../navigation/RootNavigator';
import { ActivityType, IntervalSession } from '../models';
import useAppStore, {
  useActiveActivityTypes,
  useActivityTypes,
  useIntervalsByTask,
  useTasks,
} from '../store/appStore';
import { spacing } from '../theme/spacing';
import { useThemeColors } from '../theme/useThemeColors';
import { t } from '../i18n/translations';
import {
  getActiveDurationSeconds,
  getAnalyticsDurationSeconds,
  getWallDurationSeconds,
  MIN_ANALYTICS_INTERVAL_SECONDS,
} from '../utils/intervalUtils';

const formatDateTime = (value?: string) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString();
};

const formatDuration = (seconds: number) => {
  if (Number.isNaN(seconds) || seconds <= 0) {
    return t('taskDetail.duration.zero');
  }

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (mins > 0 && secs > 0) {
    return t('taskDetail.duration.minutesSeconds')
      .replace('{minutes}', String(mins))
      .replace('{seconds}', String(secs));
  }

  if (mins > 0) {
    return t('taskDetail.duration.minutesOnly').replace('{minutes}', String(mins));
  }

  return t('taskDetail.duration.secondsOnly').replace('{seconds}', String(secs));
};

export const TaskDetailScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'TaskDetail'>>();
  const route = useRoute<RouteProp<RootStackParamList, 'TaskDetail'>>();
  const { taskId } = route.params;

  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const language = useAppStore((state) => state.language);

  useEffect(() => {
    navigation.setOptions({ title: t('nav.taskDetail') });
  }, [navigation, language]);

  const tasks = useTasks();
  const task = tasks.find((item) => item.id === taskId);
  const intervals = useIntervalsByTask(taskId);
  const activeActivityTypes = useActiveActivityTypes();
  const activityTypes = useActivityTypes();

  const updateTask = useAppStore((state) => state.updateTask);
  const deleteTaskSoft = useAppStore((state) => state.deleteTaskSoft);

  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [activityTypeId, setActivityTypeId] = useState<string | undefined>(task?.activityTypeId);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? '');
      setActivityTypeId(task.activityTypeId);
    }
  }, [task]);

  const sortedIntervals = useMemo(() => {
    return [...intervals].sort((a, b) => {
      const aTime = new Date(a.startedAt).getTime();
      const bTime = new Date(b.startedAt).getTime();
      return bTime - aTime;
    });
  }, [intervals]);

  const activityTypeMap = useMemo(() => {
    const entries = activityTypes.map((type) => [type.id, type] as const);
    return Object.fromEntries(entries) as Record<string, ActivityType>;
  }, [activityTypes]);

  const handleSaveChanges = () => {
    if (!task) {
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle) {
      Alert.alert(t('taskDetail.update.title'), t('taskDetail.update.requiredTitle'));
      return;
    }

    updateTask(task.id, {
      title: trimmedTitle,
      description: trimmedDescription.length > 0 ? trimmedDescription : undefined,
      activityTypeId,
    });

    Alert.alert(t('taskDetail.update.successTitle'), t('taskDetail.update.successBody'));
  };

  const handleDeleteTask = () => {
    if (!task) {
      return;
    }

    Alert.alert(t('taskDetail.actions.delete'), t('taskDetail.actions.confirmDelete'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          deleteTaskSoft(task.id);
          navigation.goBack();
        },
      },
    ]);
  };

  const handleStartFocus = () => {
    if (!task) {
      return;
    }

    navigation.navigate('RootTabs', {
      screen: 'Pomodoro',
      params: { taskId: task.id },
    });
  };

  if (!task || task.deletedAt) {
    return (
      <ScreenContainer withTopPadding={false}>
        <View style={styles.missingTaskContainer}>
          <Text style={styles.missingTaskTitle}>{t('taskDetail.missing.title')}</Text>
          <Text style={styles.missingTaskSubtitle}>{t('taskDetail.missing.subtitle')}</Text>
          <TouchableOpacity style={styles.modalButtonPrimary} onPress={() => navigation.goBack()}>
            <Text style={[styles.modalButtonText, styles.modalButtonPrimaryText]}>
              {t('taskDetail.missing.back')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  const selectedActivityType = activityTypeId ? activityTypeMap[activityTypeId] : undefined;

  const renderInterval = (interval: IntervalSession) => {
    const plannedSeconds = interval.durationSeconds;
    const activeSeconds = interval.endedAt
      ? getActiveDurationSeconds(interval)
      : interval.durationSeconds;

    let focusSeconds = interval.analyticsDurationSeconds ?? getAnalyticsDurationSeconds(interval);
    if (!interval.endedAt) {
      focusSeconds = Math.min(activeSeconds, plannedSeconds);
    }

    // If the interval was completed normally (not skipped), and focus is just slightly
    // less than planned, snap it up so small drift doesn't show in history.
    if (!interval.wasSkipped && interval.endedAt) {
      const diff = plannedSeconds - focusSeconds;
      if (diff > 0 && diff <= 5) {
        focusSeconds = plannedSeconds;
      }
    }

    const wallSeconds = interval.endedAt ? getWallDurationSeconds(interval) : 0;
    const isShort = interval.endedAt ? focusSeconds < MIN_ANALYTICS_INTERVAL_SECONDS : false;

    const intervalTypeLabels = {
      work: t('taskDetail.intervals.types.work'),
      short_break: t('taskDetail.intervals.types.short_break'),
      long_break: t('taskDetail.intervals.types.long_break'),
    } as const;

    let statusLabel: string;
    if (!interval.endedAt) {
      statusLabel = t('taskDetail.intervals.status.inProgress');
    } else if (interval.wasSkipped) {
      statusLabel = isShort
        ? t('taskDetail.intervals.status.cancelledShort')
        : t('taskDetail.intervals.status.skipped');
    } else {
      statusLabel = isShort
        ? t('taskDetail.intervals.status.completedShort')
        : t('taskDetail.intervals.status.completed');
    }

    return (
      <View key={interval.id} style={styles.intervalRow}>
        <View style={styles.intervalHeader}>
          <Text style={styles.intervalType}>
            {intervalTypeLabels[interval.type as keyof typeof intervalTypeLabels] ?? interval.type}
          </Text>
          <Text style={styles.intervalStatus}>
            {statusLabel}
          </Text>
        </View>
        <Text style={styles.intervalDetail}>
          {t('taskDetail.intervals.fields.start')}: <Text style={styles.intervalValue}>{formatDateTime(interval.startedAt)}</Text>
        </Text>
        <Text style={styles.intervalDetail}>
          {t('taskDetail.intervals.fields.end')}: <Text style={styles.intervalValue}>{formatDateTime(interval.endedAt)}</Text>
        </Text>
        <Text style={styles.intervalDetail}>
          {t('taskDetail.intervals.fields.planned')}:{' '}
          <Text style={styles.intervalValue}>{formatDuration(plannedSeconds)}</Text>
        </Text>
        <Text style={styles.intervalDetail}>
          {t('taskDetail.intervals.fields.focus')}: <Text style={styles.intervalValue}>{formatDuration(focusSeconds)}</Text>
        </Text>
        <Text style={styles.intervalDetail}>
          {t('taskDetail.intervals.fields.elapsed')}:{' '}
          <Text style={styles.intervalValue}>{formatDuration(wallSeconds)}</Text>
        </Text>
      </View>
    );
  };

  return (
    <ScreenContainer withTopPadding={false}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>{t('taskDetail.header')}</Text>
        <TouchableOpacity style={styles.focusButton} onPress={handleStartFocus}>
          <Text style={styles.focusButtonText}>{t('taskDetail.focus.cta')}</Text>
          <Text style={styles.focusButtonSubtitle}>{t('taskDetail.focus.subtitle')}</Text>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('taskDetail.fields.title')}</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            style={styles.input}
            placeholder={t('taskDetail.placeholders.title')}
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('taskDetail.fields.description')}</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            style={[styles.input, styles.inputMultiline]}
            placeholder={t('taskDetail.placeholders.description')}
            placeholderTextColor={colors.textSecondary}
            multiline
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('taskDetail.fields.activityType')}</Text>
          <View style={styles.activityTypeList}>
            <TouchableOpacity
              style={[styles.activityTypeOption, !activityTypeId && styles.activityTypeOptionSelected]}
              onPress={() => setActivityTypeId(undefined)}
            >
              <Text style={styles.activityTypeOptionText}>{t('taskDetail.fields.none')}</Text>
            </TouchableOpacity>
            {activeActivityTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.activityTypeOption,
                  activityTypeId === type.id && {
                    backgroundColor: type.color ?? colors.accent,
                    borderColor: type.color ?? colors.accent,
                  },
                ]}
                onPress={() => setActivityTypeId(type.id)}
              >
                <View
                  style={[
                    styles.activityTypeColorDot,
                    { backgroundColor: type.color ?? colors.primary },
                  ]}
                />
                <Text
                  style={[
                    styles.activityTypeOptionText,
                    activityTypeId === type.id && styles.activityTypeOptionTextSelected,
                  ]}
                >
                  {type.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {selectedActivityType && (
            <View style={styles.selectedActivityTypeRow}>
              <View
                style={[
                  styles.selectedActivityTypePill,
                  { backgroundColor: selectedActivityType.color ?? colors.accent },
                ]}
              >
                <Text style={styles.selectedActivityTypeText}>{selectedActivityType.name}</Text>
              </View>
              <Text style={styles.activityTypeDescription}>
                {t('taskDetail.activityTypeSummary')
                  .replace('{work}', String(selectedActivityType.workDurationMinutes))
                  .replace('{short}', String(selectedActivityType.shortBreakMinutes))
                  .replace('{long}', String(selectedActivityType.longBreakMinutes))}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('taskDetail.fields.created')}</Text>
          <Text style={styles.sectionValue}>{formatDateTime(task.createdAt)}</Text>
        </View>

        {task.completedAt && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('taskDetail.fields.completed')}</Text>
            <Text style={styles.sectionValue}>{formatDateTime(task.completedAt)}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('taskDetail.intervals.title')}</Text>
          {sortedIntervals.length === 0 ? (
            <Text style={styles.emptyIntervals}>{t('taskDetail.intervals.empty')}</Text>
          ) : (
            <View style={styles.intervalList}>{sortedIntervals.map(renderInterval)}</View>
          )}
          <Text style={styles.intervalsFootnote}>{t('taskDetail.intervals.footnote')}</Text>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.modalButton, styles.modalButtonSecondary]} onPress={handleDeleteTask}>
            <Text style={styles.modalButtonText}>{t('taskDetail.actions.delete')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modalButton, styles.modalButtonPrimary]} onPress={handleSaveChanges}>
            <Text style={[styles.modalButtonText, styles.modalButtonPrimaryText]}>{t('taskDetail.actions.save')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    scrollContent: {
      paddingBottom: spacing.xl,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: spacing.lg,
    },
    section: {
      marginBottom: spacing.lg,
    },
    sectionLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    input: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.textSecondary,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      color: colors.textPrimary,
      backgroundColor: colors.background,
    },
    inputMultiline: {
      minHeight: 120,
      textAlignVertical: 'top',
    },
    activityTypeList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -spacing.xs,
    },
    activityTypeOption: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 16,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderWidth: 1,
      borderColor: colors.textSecondary,
      marginHorizontal: spacing.xs,
      marginVertical: spacing.xs,
    },
    activityTypeOptionSelected: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    activityTypeColorDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: spacing.xs,
    },
    activityTypeOptionText: {
      color: colors.textPrimary,
      fontWeight: '600',
      fontSize: 12,
    },
    activityTypeOptionTextSelected: {
      color: colors.background,
    },
    activityTypeDescription: {
      marginTop: spacing.sm,
      color: colors.textSecondary,
      fontSize: 12,
    },
    selectedActivityTypeRow: {
      marginTop: spacing.sm,
    },
    selectedActivityTypePill: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      marginBottom: spacing.xs,
    },
    selectedActivityTypeText: {
      color: colors.background,
      fontWeight: '700',
      fontSize: 12,
    },
    sectionValue: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '500',
    },
    actionsRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    focusButton: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      marginBottom: spacing.lg,
    },
    focusButtonText: {
      color: colors.background,
      fontWeight: '700',
      fontSize: 16,
    },
    focusButtonSubtitle: {
      marginTop: spacing.xs,
      color: colors.background,
      fontSize: 13,
    },
    modalButton: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: 12,
      marginLeft: spacing.sm,
    },
    modalButtonSecondary: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.textSecondary,
    },
    modalButtonPrimary: {
      backgroundColor: colors.primary,
    },
    modalButtonText: {
      fontWeight: '600',
      color: colors.textPrimary,
    },
    modalButtonPrimaryText: {
      color: colors.background,
    },
    intervalList: {
      marginTop: spacing.sm,
    },
    intervalsFootnote: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: spacing.xs,
      fontStyle: 'italic',
    },
    intervalRow: {
      borderRadius: 12,
      padding: spacing.md,
      backgroundColor: colors.surface,
      marginBottom: spacing.sm,
    },
    intervalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    intervalType: {
      fontWeight: '700',
      color: colors.textPrimary,
    },
    intervalStatus: {
      color: colors.textSecondary,
      fontWeight: '600',
    },
    intervalDetail: {
      color: colors.textSecondary,
      marginTop: spacing.xs,
      fontSize: 13,
    },
    intervalValue: {
      color: colors.textPrimary,
      fontWeight: '600',
    },
    emptyIntervals: {
      color: colors.textSecondary,
      fontStyle: 'italic',
    },
    missingTaskContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    missingTaskTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
    missingTaskSubtitle: {
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
  });
}

export default TaskDetailScreen;
