import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  AppState,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { RootStackParamList, RootTabParamList } from '../navigation/RootNavigator';
import { IntervalType, Task } from '../models';
import useAppStore, { useEffectiveSettings, useTasks } from '../store/appStore';
import { useTimerStore } from '../store/useTimerStore';
import { useThemeColors } from '../theme/useThemeColors';
import { spacing } from '../theme/spacing';
import { t } from '../i18n/translations';
import { trackEvent } from '../services/productEvents';
import { useSubscriptionGate } from '../utils/subscriptionGate';
import { navigateToProUpsell } from '../navigation/proNavigation';
import { ProBadge } from '../components/ProBadge';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

const formatTime = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = (safeSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${secs}`;
};

const POMODORO_PRESETS = [
  { id: 'classic', label: 'Classic 25/5', work: 25, shortBreak: 5, longBreak: 15, rounds: 4 },
  { id: 'deep', label: 'Deep 50/10', work: 50, shortBreak: 10, longBreak: 20, rounds: 3 },
  { id: 'sprint', label: 'Sprint 15/3', work: 15, shortBreak: 3, longBreak: 10, rounds: 4 },
] as const;

const TaskPickerModal: React.FC<{
  visible: boolean;
  tasks: Task[];
  selectedTaskId?: string;
  onSelect: (taskId?: string) => void;
  onClose: () => void;
  styles: ReturnType<typeof createStyles>;
}> = ({ visible, tasks, selectedTaskId, onSelect, onClose, styles }) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{t('pomodoro.taskPickerTitle')}</Text>
          <ScrollView style={styles.modalList}>
            <TouchableOpacity
              style={[styles.modalTaskRow, !selectedTaskId && styles.modalTaskRowSelected]}
              onPress={() => {
                onSelect(undefined);
                onClose();
              }}
            >
              <Text style={styles.modalTaskTitle}>{t('pomodoro.noTaskSelected')}</Text>
              <Text style={styles.modalTaskSubtitle}>
                {t('pomodoro.taskPickerNoTaskBody')}
              </Text>
            </TouchableOpacity>

            {tasks.map((task) => (
              <React.Fragment key={task.id}>
                <TouchableOpacity
                  style={[
                    styles.modalTaskRow,
                    selectedTaskId === task.id && styles.modalTaskRowSelected,
                  ]}
                  onPress={() => {
                    onSelect(task.id);
                    onClose();
                  }}
                >
                  <Text style={styles.modalTaskTitle}>{task.title}</Text>
                  {task.description && (
                    <Text style={styles.modalTaskSubtitle} numberOfLines={2}>
                      {task.description}
                    </Text>
                  )}
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={[styles.modalButton, styles.modalCloseButton]}
            onPress={onClose}
          >
            <Text style={styles.modalButtonText}>{t('pomodoro.close')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export const PomodoroScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootTabParamList, 'Pomodoro'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const colors = useThemeColors();
  const tasks = useTasks();
  const visibleTasks = useMemo(
    () => tasks.filter((task) => !task.deletedAt && !task.completedAt),
    [tasks],
  );
  const styles = useMemo(() => createStyles(colors), [colors]);

  const {
    currentIntervalType,
    setIntervalType,
    currentTaskId,
    setCurrentTask,
    remainingSeconds,
    isRunning,
    startTimer,
    pauseTimer,
    tick,
    handleIntervalCompletion,
    skipCurrentInterval,
    completedWorkIntervals,
    syncWithCurrentTime,
    activeIntervalId,
    endIntervalNow,
  } = useTimerStore((state) => state);

  const [isTaskPickerVisible, setTaskPickerVisible] = useState(false);
  const [onboardingVisible, setOnboardingVisible] = useState(false);
  const [weeklyRecapVisible, setWeeklyRecapVisible] = useState(false);
  const intervals = useAppStore((state) => state.intervals);
  const earlySkipInfoVisible = useAppStore((state) => state.earlySkipInfoVisible);
  const hideEarlySkipInfo = useAppStore((state) => state.hideEarlySkipInfo);
  const setShowEarlySkipInfoModal = useAppStore((state) => state.setShowEarlySkipInfoModal);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const effectiveSettings = useEffectiveSettings();
  const { isPro } = useSubscriptionGate();
  useAppStore((state) => state.language);
  const intervalLabels: Record<string, string> = {
    work: t('pomodoro.workLabel'),
    short_break: t('pomodoro.shortBreakLabel'),
    long_break: t('pomodoro.longBreakLabel'),
  };

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const timer = setInterval(() => {
      tick();
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, tick]);

  useEffect(() => {
    syncWithCurrentTime();
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') {
        syncWithCurrentTime();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [syncWithCurrentTime]);

  useEffect(() => {
    if (isRunning && remainingSeconds <= 0) {
      handleIntervalCompletion();
    }
  }, [isRunning, remainingSeconds, handleIntervalCompletion]);

  useEffect(() => {
    const incomingTaskId = route.params?.taskId;

    // If we were navigated here with a taskId, use it once.
    // After that, the user can freely change the task via the picker.
    if (incomingTaskId) {
      setCurrentTask(incomingTaskId);
    }
  }, [route.params?.taskId, setCurrentTask]);

  const getWeekKey = (d: Date) => {
    const copy = new Date(d);
    const day = copy.getDay();
    const diffSinceMonday = (day + 6) % 7;
    copy.setDate(copy.getDate() - diffSinceMonday);
    copy.setHours(0, 0, 0, 0);
    return copy.toISOString().slice(0, 10);
  };

  useEffect(() => {
    if (!effectiveSettings.onboardingCompleted) {
      setOnboardingVisible(true);
      trackEvent('onboarding_shown');
    }
  }, [effectiveSettings.onboardingCompleted]);

  useEffect(() => {
    const now = new Date();
    const isMonday = now.getDay() === 1;
    const weekKey = getWeekKey(now);
    if (isMonday && effectiveSettings.lastWeeklyRecapWeek !== weekKey && effectiveSettings.onboardingCompleted) {
      setWeeklyRecapVisible(true);
      trackEvent('weekly_recap_shown', { weekKey });
      updateSettings({ lastWeeklyRecapWeek: weekKey });
    }
  }, [effectiveSettings.lastWeeklyRecapWeek, effectiveSettings.onboardingCompleted, updateSettings]);

  const selectedTask = useMemo(
    () => visibleTasks.find((task) => task.id === currentTaskId),
    [visibleTasks, currentTaskId],
  );

  const intervalOptions = [
    { label: t('pomodoro.workLabel'), value: 'work' as IntervalType },
    { label: t('pomodoro.shortBreakLabel'), value: 'short_break' as IntervalType },
    { label: t('pomodoro.longBreakLabel'), value: 'long_break' as IntervalType },
  ];

  const currentPresetId = useMemo(() => {
    const found = POMODORO_PRESETS.find(
      (p) =>
        p.work === effectiveSettings.workDurationMinutes &&
        p.shortBreak === effectiveSettings.shortBreakMinutes &&
        p.longBreak === effectiveSettings.longBreakMinutes &&
        p.rounds === effectiveSettings.intervalsBeforeLongBreak,
    );
    return found?.id;
  }, [effectiveSettings]);

  const applyPreset = (presetId: (typeof POMODORO_PRESETS)[number]['id']) => {
    const preset = POMODORO_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    const isFreePreset = preset.id === 'classic';
    if (!isFreePreset && !isPro) {
      trackEvent('preset_locked_clicked', { presetId });
      navigateToProUpsell(navigation);
      return;
    }

    updateSettings({
      workDurationMinutes: preset.work,
      shortBreakMinutes: preset.shortBreak,
      longBreakMinutes: preset.longBreak,
      intervalsBeforeLongBreak: preset.rounds,
    });
    trackEvent('preset_applied', { presetId });
    setIntervalType('work');
  };

  const intervalLabel = intervalLabels[currentIntervalType];
  const formattedTime = formatTime(remainingSeconds);
  const focusCount =
    currentIntervalType === 'work'
      ? completedWorkIntervals + 1
      : completedWorkIntervals;

  const weeklyRecap = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    const day = weekStart.getDay();
    const diffSinceMonday = (day + 6) % 7;
    weekStart.setDate(weekStart.getDate() - diffSinceMonday);
    weekStart.setHours(0, 0, 0, 0);

    const completedThisWeek = intervals.filter((i) => {
      if (i.type !== 'work' || i.wasSkipped || !i.endedAt) return false;
      return new Date(i.startedAt) >= weekStart;
    });

    const focusedHours =
      completedThisWeek.reduce((sum, i) => sum + ((i.analyticsDurationSeconds ?? i.durationSeconds) / 3600), 0);

    return {
      completedCount: completedThisWeek.length,
      focusedHours,
    };
  }, [intervals]);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('pomodoro.title')}</Text>
          <Text style={styles.subtitle}>{t('pomodoro.subtitle')}</Text>
        </View>

        <View style={styles.segmentedControl}>
          {intervalOptions.map((option) => (
            <React.Fragment key={option.value}>
              <TouchableOpacity
                style={[
                  styles.segment,
                  currentIntervalType === option.value && styles.segmentActive,
                ]}
                onPress={() => setIntervalType(option.value)}
              >
                <Text
                  style={[
                    styles.segmentLabel,
                    currentIntervalType === option.value && styles.segmentLabelActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>

        <View style={styles.presetsCard}>
          <Text style={styles.taskSelectorLabel}>Session presets</Text>
          <View style={styles.presetRow}>
            {POMODORO_PRESETS.map((preset) => {
              const isFreePreset = preset.id === 'classic';
              const isLocked = !isFreePreset && !isPro;
              return (
                <TouchableOpacity
                  key={preset.id}
                  style={[styles.presetChip, currentPresetId === preset.id && styles.presetChipActive]}
                  onPress={() => applyPreset(preset.id)}
                >
                  <View style={styles.presetChipContent}>
                    <Text style={[styles.presetChipLabel, currentPresetId === preset.id && styles.presetChipLabelActive]}>
                      {preset.label}
                    </Text>
                    {isLocked && (
                      <View style={styles.proBadge}>
                        <ProBadge
                          style={
                            currentPresetId === preset.id
                              ? styles.proBadgeTextActive
                              : styles.proBadgeText
                          }
                        />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={[styles.flowToggle, effectiveSettings.flowModeEnabled && styles.flowToggleActive]}
            onPress={() => {
              if (!isPro) {
                trackEvent('flow_mode_locked_clicked');
                navigateToProUpsell(navigation);
                return;
              }
              const next = !effectiveSettings.flowModeEnabled;
              updateSettings({ flowModeEnabled: next });
              trackEvent('flow_mode_toggled', { enabled: next });
            }}
          >
            <View style={styles.flowToggleContent}>
              <Text style={[styles.flowToggleText, effectiveSettings.flowModeEnabled && styles.flowToggleTextActive]}>
                {effectiveSettings.flowModeEnabled ? 'Flow mode: ON (continuous focus)' : 'Flow mode: OFF'}
              </Text>
              {!isPro && (
                <View style={styles.proBadge}>
                  <ProBadge />
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.timerCard}>
          <Text style={styles.intervalName}>{intervalLabel}</Text>
          <Text style={styles.timerValue}>{formattedTime}</Text>
          <Text style={styles.intervalCounter}>
            {currentIntervalType === 'work'
              ? t('pomodoro.focusCount').replace('{count}', String(focusCount))
              : currentIntervalType === 'short_break'
              ? t('pomodoro.shortBreakLabel')
              : t('pomodoro.longBreakLabel')}
          </Text>
        </View>

        <View style={styles.taskSelector}>
          <Text style={styles.taskSelectorLabel}>{t('pomodoro.linkedTask')}</Text>
          <TouchableOpacity
            style={styles.taskSelectorButton}
            onPress={() => setTaskPickerVisible(true)}
          >
            <View style={styles.taskSelectorContent}>
              <Text style={styles.taskSelectorValue} numberOfLines={1}>
                {selectedTask ? selectedTask.title : t('pomodoro.noTaskSelected')}
              </Text>
              <Text style={styles.taskSelectorHint}>{t('pomodoro.chooseTaskHint')}</Text>
            </View>
            <Text style={styles.taskSelectorAction}>{t('pomodoro.changeTask')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              isRunning ? styles.pauseButton : styles.startButton,
            ]}
            onPress={() => {
              if (isRunning) {
                pauseTimer();
                return;
              }
              trackEvent('timer_started', { intervalType: currentIntervalType, hasTask: Boolean(currentTaskId) });
              startTimer();
            }}
          >
            <Text style={styles.primaryButtonText}>
              {isRunning ? t('pomodoro.pause') : t('pomodoro.start')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.secondaryControls}>
          {activeIntervalId && (
            <>
              <TouchableOpacity
                style={[styles.secondaryButton, styles.endNowButton]}
                onPress={endIntervalNow}
              >
                <Text style={[styles.secondaryButtonText, styles.endNowButtonText]}>
                  {t('pomodoro.endAndSave')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryButton, styles.skipButton]}
                onPress={skipCurrentInterval}
              >
                <Text style={styles.secondaryButtonText}>{t('pomodoro.skip')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>

      <TaskPickerModal
        visible={isTaskPickerVisible}
        tasks={visibleTasks}
        selectedTaskId={currentTaskId}
        onSelect={setCurrentTask}
        onClose={() => setTaskPickerVisible(false)}
        styles={styles}
      />

      <Modal
        visible={earlySkipInfoVisible}
        transparent
            animationType="fade"
            onRequestClose={hideEarlySkipInfo}
          >
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>{t('pomodoro.earlySkipTitle')}</Text>
                <Text style={styles.modalBody}>{t('pomodoro.earlySkipBody')}</Text>

                <View style={styles.modalButtonsRow}>
                  <TouchableOpacity
                    style={[styles.modalInfoButton, styles.modalInfoButtonSecondary]}
                    onPress={() => {
                      setShowEarlySkipInfoModal(false);
                      hideEarlySkipInfo();
                    }}
                  >
                    <Text style={styles.modalInfoButtonText}>{t('pomodoro.earlySkipDismiss')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalInfoButton, styles.modalInfoButtonPrimary]}
                    onPress={hideEarlySkipInfo}
                  >
                    <Text style={[styles.modalInfoButtonText, styles.modalInfoButtonPrimaryText]}>
                      {t('pomodoro.earlySkipOk')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
        </View>
      </Modal>

      <Modal visible={onboardingVisible} transparent animationType="fade" onRequestClose={() => setOnboardingVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Welcome to TomoFlow</Text>
            <Text style={styles.modalBody}>Pick a preset and start your first focus session in under a minute.</Text>
            <View style={styles.presetRow}>
              {POMODORO_PRESETS.map((preset) => (
                <TouchableOpacity key={preset.id} style={styles.presetChip} onPress={() => applyPreset(preset.id)}>
                  <Text style={styles.presetChipLabel}>{preset.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalCloseButton]}
              onPress={() => {
                updateSettings({ onboardingCompleted: true });
                setOnboardingVisible(false);
                trackEvent('onboarding_completed');
              }}
            >
              <Text style={styles.modalButtonText}>Let’s go</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={weeklyRecapVisible} transparent animationType="fade" onRequestClose={() => setWeeklyRecapVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Weekly recap</Text>
            <Text style={styles.modalBody}>You completed {weeklyRecap.completedCount} focus sessions and logged {weeklyRecap.focusedHours.toFixed(1)}h of focus this week.</Text>
            <TouchableOpacity style={[styles.modalButton, styles.modalCloseButton]} onPress={() => setWeeklyRecapVisible(false)}>
              <Text style={styles.modalButtonText}>Nice</Text>
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
    header: {
      marginBottom: spacing.lg,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    subtitle: {
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    segmentedControl: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: spacing.xs,
      marginBottom: spacing.lg,
    },
    segment: {
      flex: 1,
      paddingVertical: spacing.sm,
      borderRadius: 12,
      alignItems: 'center',
    },
    segmentActive: {
      backgroundColor: colors.primary,
    },
    segmentLabel: {
      fontWeight: '600',
      color: colors.textSecondary,
    },
    segmentLabelActive: {
      color: colors.background,
    },
    presetsCard: {
      borderRadius: 16,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      marginBottom: spacing.md,
    },
    presetRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginTop: spacing.xs,
    },
    presetChip: {
      borderRadius: 999,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    presetChipContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    presetChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    presetChipLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    presetChipLabelActive: {
      color: colors.background,
    },
    flowToggle: {
      marginTop: spacing.sm,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      alignSelf: 'flex-start',
    },
    flowToggleActive: {
      backgroundColor: `${colors.accent}33`,
      borderColor: colors.accent,
    },
    flowToggleContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    flowToggleText: {
      color: colors.textSecondary,
      fontWeight: '600',
      fontSize: 12,
    },
    proBadge: {
      marginTop: 1,
    },
    proBadgeText: {
      color: '#FF5A5F',
    },
    proBadgeTextActive: {
      color: colors.background,
    },
    flowToggleTextActive: {
      color: colors.textPrimary,
    },
    timerCard: {
      borderRadius: 24,
      backgroundColor: colors.surface,
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    intervalName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    timerValue: {
      fontSize: 72,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    intervalCounter: {
      marginTop: spacing.sm,
      color: colors.textSecondary,
      fontSize: 16,
    },
    taskSelector: {
      marginBottom: spacing.lg,
    },
    taskSelectorLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    taskSelectorButton: {
      borderRadius: 16,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
    },
    taskSelectorContent: {
      flex: 1,
    },
    taskSelectorValue: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    taskSelectorHint: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
    },
    taskSelectorAction: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
      marginLeft: spacing.md,
    },
    controlsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    primaryButton: {
      borderRadius: 20,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
    },
    startButton: {
      backgroundColor: colors.primary,
    },
    pauseButton: {
      backgroundColor: colors.accent,
    },
    primaryButtonText: {
      color: colors.background,
      fontSize: 18,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    secondaryControls: {
      flexDirection: 'row',
      justifyContent: 'center',
    },
    secondaryButton: {
      flex: 1,
      borderRadius: 16,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.textSecondary,
      marginHorizontal: spacing.xs,
    },
    endNowButton: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    secondaryButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    endNowButtonText: {
      color: colors.background,
    },
    skipButton: {
      backgroundColor: colors.surface,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: `${colors.background}99`,
      justifyContent: 'center',
      padding: spacing.lg,
    },
    modalCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: spacing.lg,
      maxHeight: '80%',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
    modalList: {
      marginBottom: spacing.md,
    },
    modalTaskRow: {
      borderRadius: 16,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: 'transparent',
      marginBottom: spacing.sm,
      backgroundColor: colors.background,
    },
    modalTaskRowSelected: {
      borderColor: colors.primary,
    },
    modalTaskTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    modalTaskSubtitle: {
      marginTop: spacing.xs,
      fontSize: 13,
      color: colors.textSecondary,
    },
    modalBody: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: spacing.md,
    },
    modalButton: {
      borderRadius: 16,
      paddingVertical: spacing.sm,
      alignItems: 'center',
    },
    modalCloseButton: {
      backgroundColor: colors.primary,
    },
    modalButtonText: {
      color: colors.background,
      fontWeight: '700',
    },
    modalButtonsRow: {
      flexDirection: 'row',
      marginTop: spacing.md,
    },
    modalInfoButton: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: spacing.sm,
      alignItems: 'center',
    },
    modalInfoButtonSecondary: {
      marginRight: spacing.sm,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalInfoButtonPrimary: {
      backgroundColor: colors.primary,
    },
    modalInfoButtonText: {
      fontWeight: '700',
      color: colors.textPrimary,
    },
    modalInfoButtonPrimaryText: {
      color: colors.background,
    },
  });
}
