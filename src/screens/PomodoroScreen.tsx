import { RouteProp, useRoute } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { RootTabParamList } from '../navigation/RootNavigator';
import { IntervalType, Task } from '../models';
import { useTasks } from '../store/appStore';
import { useTimerStore } from '../store/useTimerStore';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

const intervalLabels: Record<string, string> = {
  work: 'Work',
  short_break: 'Short Break',
  long_break: 'Long Break',
};

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
}> = ({ visible, tasks, selectedTaskId, onSelect, onClose }) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Choose a task</Text>
          <ScrollView style={styles.modalList}>
            <TouchableOpacity
              style={[styles.modalTaskRow, !selectedTaskId && styles.modalTaskRowSelected]}
              onPress={() => {
                onSelect(undefined);
                onClose();
              }}
            >
              <Text style={styles.modalTaskTitle}>No task selected</Text>
              <Text style={styles.modalTaskSubtitle}>Track interval without linking a task.</Text>
            </TouchableOpacity>
            {tasks.map((task) => (
              <TouchableOpacity
                key={task.id}
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
            ))}
          </ScrollView>
          <TouchableOpacity style={[styles.modalButton, styles.modalCloseButton]} onPress={onClose}>
            <Text style={styles.modalButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export const PomodoroScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootTabParamList, 'Pomodoro'>>();
  const tasks = useTasks();
  const visibleTasks = useMemo(() => tasks.filter((task) => !task.deletedAt), [tasks]);

  const {
    currentIntervalType,
    setIntervalType,
    currentTaskId,
    setCurrentTask,
    remainingSeconds,
    isRunning,
    startTimer,
    pauseTimer,
    resetTimer,
    tick,
    handleIntervalCompletion,
    skipCurrentInterval,
    completedWorkIntervals,
  } = useTimerStore((state) => state);

  const [isTaskPickerVisible, setTaskPickerVisible] = useState(false);

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
    if (isRunning && remainingSeconds <= 0) {
      handleIntervalCompletion();
    }
  }, [isRunning, remainingSeconds, handleIntervalCompletion]);

  useEffect(() => {
    const incomingTaskId = route.params?.taskId;
    if (incomingTaskId && incomingTaskId !== currentTaskId) {
      setCurrentTask(incomingTaskId);
    }
  }, [route.params?.taskId, currentTaskId, setCurrentTask]);

  const selectedTask = useMemo(
    () => visibleTasks.find((task) => task.id === currentTaskId),
    [visibleTasks, currentTaskId],
  );

  const intervalOptions = (
    [
      { label: 'Work', value: 'work' as IntervalType },
      { label: 'Short Break', value: 'short_break' as IntervalType },
      { label: 'Long Break', value: 'long_break' as IntervalType },
    ]
  );

  const intervalLabel = intervalLabels[currentIntervalType];
  const formattedTime = formatTime(remainingSeconds);
  const focusCount = currentIntervalType === 'work' ? completedWorkIntervals + 1 : completedWorkIntervals;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Pomodoro</Text>
        <Text style={styles.subtitle}>Stay on track with focused intervals.</Text>
      </View>

      <View style={styles.segmentedControl}>
        {intervalOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
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
        ))}
      </View>

      <View style={styles.timerCard}>
        <Text style={styles.intervalName}>{intervalLabel}</Text>
        <Text style={styles.timerValue}>{formattedTime}</Text>
        <Text style={styles.intervalCounter}>
          {currentIntervalType === 'work'
            ? `Focus #${focusCount}`
            : currentIntervalType === 'short_break'
            ? 'Short break'
            : 'Long break'}
        </Text>
      </View>

      <View style={styles.taskSelector}>
        <Text style={styles.taskSelectorLabel}>Linked Task</Text>
        <TouchableOpacity style={styles.taskSelectorButton} onPress={() => setTaskPickerVisible(true)}>
          <View style={{ flex: 1 }}>
            <Text style={styles.taskSelectorValue} numberOfLines={1}>
              {selectedTask ? selectedTask.title : 'No task selected'}
            </Text>
            <Text style={styles.taskSelectorHint}>Tap to choose a task</Text>
          </View>
          <Text style={styles.taskSelectorAction}>Change</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[styles.primaryButton, isRunning ? styles.pauseButton : styles.startButton]}
          onPress={isRunning ? pauseTimer : startTimer}
        >
          <Text style={styles.primaryButtonText}>{isRunning ? 'Pause' : 'Start'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.secondaryControls}>
        <TouchableOpacity style={[styles.secondaryButton, styles.resetButton]} onPress={resetTimer}>
          <Text style={styles.secondaryButtonText}>Reset</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.secondaryButton, styles.skipButton]} onPress={skipCurrentInterval}>
          <Text style={styles.secondaryButtonText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <TaskPickerModal
        visible={isTaskPickerVisible}
        tasks={visibleTasks}
        selectedTaskId={currentTaskId}
        onSelect={setCurrentTask}
        onClose={() => setTaskPickerVisible(false)}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
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
    justifyContent: 'space-between',
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
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  resetButton: {
    backgroundColor: colors.surface,
  },
  skipButton: {
    backgroundColor: colors.surface,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
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
});
