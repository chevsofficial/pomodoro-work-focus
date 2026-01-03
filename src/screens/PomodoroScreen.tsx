import { RouteProp, useFocusEffect, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  InteractionManager,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CopilotStep, walkthroughable, useCopilot } from 'react-native-copilot';
import { ScreenContainer } from '../components/ScreenContainer';
import { RootTabParamList } from '../navigation/RootNavigator';
import { IntervalType, Task } from '../models';
import useAppStore, { useTasks } from '../store/appStore';
import { useTimerStore } from '../store/useTimerStore';
import { useThemeColors } from '../theme/useThemeColors';
import { spacing } from '../theme/spacing';
import { t } from '../i18n/translations';
import { advanceTourFromStage, useTourState } from '../onboarding/tourController';

const formatTime = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = (safeSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${secs}`;
};

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
  const earlySkipInfoVisible = useAppStore((state) => state.earlySkipInfoVisible);
  const hideEarlySkipInfo = useAppStore((state) => state.hideEarlySkipInfo);
  const setShowEarlySkipInfoModal = useAppStore((state) => state.setShowEarlySkipInfoModal);
  useAppStore((state) => state.language);
  const { start, copilotEvents } = useCopilot();
  const { stage, completed } = useTourState();
  const tourStartRef = useRef(false);
  const shouldRunThisTour = !completed && stage === 'pomodoro';

  useFocusEffect(
    useCallback(() => {
      if (!shouldRunThisTour) {
        return;
      }

      tourStartRef.current = false;
      const task = InteractionManager.runAfterInteractions(() => {
        if (tourStartRef.current) return;
        tourStartRef.current = true;
        start();
      });

      return () => {
        task.cancel?.();
        tourStartRef.current = false;
      };
    }, [shouldRunThisTour, start]),
  );

  useEffect(() => {
    const onStop = () => {
      if (completed || stage !== 'pomodoro') return;
      advanceTourFromStage('pomodoro');
    };

    copilotEvents.on('stop', onStop);
    return () => {
      copilotEvents.off('stop', onStop);
    };
  }, [completed, copilotEvents, stage]);

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

  const selectedTask = useMemo(
    () => visibleTasks.find((task) => task.id === currentTaskId),
    [visibleTasks, currentTaskId],
  );

  const intervalOptions = [
    { label: t('pomodoro.workLabel'), value: 'work' as IntervalType },
    { label: t('pomodoro.shortBreakLabel'), value: 'short_break' as IntervalType },
    { label: t('pomodoro.longBreakLabel'), value: 'long_break' as IntervalType },
  ];

  const intervalLabel = intervalLabels[currentIntervalType];
  const formattedTime = formatTime(remainingSeconds);
  const focusCount =
    currentIntervalType === 'work'
      ? completedWorkIntervals + 1
      : completedWorkIntervals;
  const CopilotView = walkthroughable(View);
  const CopilotTouchable = walkthroughable(TouchableOpacity);

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>{t('pomodoro.title')}</Text>
        <Text style={styles.subtitle}>{t('pomodoro.subtitle')}</Text>
      </View>

      <CopilotStep
        name="pomodoro-interval-selector"
        order={1}
        text={t('onboarding.pomodoro.intervalSelector')}
      >
        <CopilotView style={styles.segmentedControl}>
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
        </CopilotView>
      </CopilotStep>

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

      <CopilotStep
        name="pomodoro-task-selector"
        order={2}
        text={t('onboarding.pomodoro.taskSelector')}
      >
        <CopilotView style={styles.taskSelector}>
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
        </CopilotView>
      </CopilotStep>

      <View style={styles.controlsRow}>
        <CopilotStep
          name="pomodoro-primary-button"
          order={3}
          text={t('onboarding.pomodoro.primaryButton')}
        >
          <CopilotTouchable
            style={[
              styles.primaryButton,
              isRunning ? styles.pauseButton : styles.startButton,
            ]}
            onPress={isRunning ? pauseTimer : startTimer}
          >
            <Text style={styles.primaryButtonText}>
              {isRunning ? t('pomodoro.pause') : t('pomodoro.start')}
            </Text>
          </CopilotTouchable>
        </CopilotStep>
      </View>

      <View style={styles.secondaryControls}>
        {activeIntervalId && (
          <>
            <CopilotStep
              name="pomodoro-end-save"
              order={4}
              text={t('onboarding.pomodoro.endAndSave')}
            >
              <CopilotTouchable
                style={[styles.secondaryButton, styles.endNowButton]}
                onPress={endIntervalNow}
              >
                <Text style={[styles.secondaryButtonText, styles.endNowButtonText]}>
                  {t('pomodoro.endAndSave')}
                </Text>
              </CopilotTouchable>
            </CopilotStep>
            <CopilotStep
              name="pomodoro-skip"
              order={5}
              text={t('onboarding.pomodoro.skipInterval')}
            >
              <CopilotTouchable
                style={[styles.secondaryButton, styles.skipButton]}
                onPress={skipCurrentInterval}
              >
                <Text style={styles.secondaryButtonText}>{t('pomodoro.skip')}</Text>
              </CopilotTouchable>
            </CopilotStep>
          </>
        )}
      </View>


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
    </ScreenContainer>
  );
};

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
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
