import { create } from 'zustand';
import { IntervalType } from '../models';
import {
  cancelScheduledNotification,
  hideTimerStatusNotification,
  scheduleIntervalCompletionNotification,
  showTimerStatusNotification,
} from '../utils/notificationService';
import { playIntervalEndSound, triggerIntervalHaptics } from '../utils/soundService';
import useAppStore, { selectEffectiveSettings, selectIsProEffective } from './appStore';

const ONE_MINUTE_IN_SECONDS = 60;

const getTimingConfigForTask = (taskId?: string) => {
  const appState = useAppStore.getState();
  const settings = selectEffectiveSettings(appState);
  const { tasks, activityTypes } = appState;

  if (!taskId) {
    return {
      workMinutes: settings.workDurationMinutes,
      shortBreakMinutes: settings.shortBreakMinutes,
      longBreakMinutes: settings.longBreakMinutes,
      intervalsBeforeLongBreak: settings.intervalsBeforeLongBreak,
    };
  }

  const task = tasks.find((t) => t.id === taskId);
  if (!task || !task.activityTypeId) {
    return {
      workMinutes: settings.workDurationMinutes,
      shortBreakMinutes: settings.shortBreakMinutes,
      longBreakMinutes: settings.longBreakMinutes,
      intervalsBeforeLongBreak: settings.intervalsBeforeLongBreak,
    };
  }

  const activityType = activityTypes.find((a) => a.id === task.activityTypeId);
  if (!activityType) {
    return {
      workMinutes: settings.workDurationMinutes,
      shortBreakMinutes: settings.shortBreakMinutes,
      longBreakMinutes: settings.longBreakMinutes,
      intervalsBeforeLongBreak: settings.intervalsBeforeLongBreak,
    };
  }

  return {
    workMinutes: activityType.workDurationMinutes,
    shortBreakMinutes: activityType.shortBreakMinutes,
    longBreakMinutes: activityType.longBreakMinutes,
    intervalsBeforeLongBreak: activityType.intervalsBeforeLongBreak,
  };
};

const getDurationForType = (type: IntervalType, taskId?: string) => {
  const config = getTimingConfigForTask(taskId);

  switch (type) {
    case 'short_break':
      return Math.max(1, Math.round(config.shortBreakMinutes * ONE_MINUTE_IN_SECONDS));
    case 'long_break':
      return Math.max(1, Math.round(config.longBreakMinutes * ONE_MINUTE_IN_SECONDS));
    case 'work':
    default:
      return Math.max(1, Math.round(config.workMinutes * ONE_MINUTE_IN_SECONDS));
  }
};

const determineNextInterval = (
  finishedType: IntervalType,
  completedWorkIntervals: number,
  shouldCountWorkCompletion: boolean,
  taskId?: string,
) => {
  const config = getTimingConfigForTask(taskId);
  const requiredBeforeLongBreak = Math.max(1, config.intervalsBeforeLongBreak || 1);

  if (finishedType === 'work') {
    const incremented = shouldCountWorkCompletion ? completedWorkIntervals + 1 : completedWorkIntervals;
    const shouldTriggerLongBreak = shouldCountWorkCompletion && incremented >= requiredBeforeLongBreak;

    if (shouldTriggerLongBreak) {
      return { nextType: 'long_break' as IntervalType, nextCompletedWorkIntervals: 0 };
    }

    return {
      nextType: 'short_break' as IntervalType,
      nextCompletedWorkIntervals: incremented,
    };
  }

  return {
    nextType: 'work' as IntervalType,
    nextCompletedWorkIntervals: completedWorkIntervals,
  };
};

interface TimerState {
  currentIntervalType: IntervalType;
  currentTaskId?: string;
  remainingSeconds: number;
  isRunning: boolean;
  activeIntervalId?: string;
  completedWorkIntervals: number;
  intervalStartTime?: number;
  plannedEndTime?: number;
  scheduledNotificationId?: string;
  setCurrentTask: (taskId?: string) => void;
  setIntervalType: (type: IntervalType) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  tick: () => void;
  handleIntervalCompletion: () => void;
  skipCurrentInterval: () => void;
  syncWithCurrentTime: () => void;
}

export const useTimerStore = create<TimerState>((set, get) => {
  const cancelScheduledNotificationIfNeeded = () => {
    const notificationId = get().scheduledNotificationId;
    if (!notificationId) {
      return;
    }

    cancelScheduledNotification(notificationId);
    set({ scheduledNotificationId: undefined });
  };

  const scheduleNotificationIfEnabled = (secondsFromNow: number, type: IntervalType) => {
    const state = get();
    const appStoreState = useAppStore.getState();
    const settings = selectEffectiveSettings(appStoreState);
    if (!settings.notificationsEnabled || secondsFromNow <= 0) {
      cancelScheduledNotificationIfNeeded();
      return;
    }

    let nextIntervalType: IntervalType | undefined;

    if (type === 'work') {
      const { nextType } = determineNextInterval(
        'work',
        state.completedWorkIntervals,
        true,
        state.currentTaskId,
      );
      nextIntervalType = nextType;
    }

    scheduleIntervalCompletionNotification({
      secondsFromNow,
      intervalType: type,
      nextIntervalType,
      soundEnabled: settings.soundEnabled ?? true,
    }).then((identifier) => {
      if (!identifier) {
        return;
      }

      const latest = get();
      if (!latest.isRunning) {
        return;
      }

      set({ scheduledNotificationId: identifier });
    });
  };

  return {
    currentIntervalType: 'work',
    currentTaskId: undefined,
    remainingSeconds: getDurationForType('work'),
    isRunning: false,
    activeIntervalId: undefined,
    completedWorkIntervals: 0,
    intervalStartTime: undefined,
    plannedEndTime: undefined,
    scheduledNotificationId: undefined,

    setCurrentTask: (taskId) =>
      set((state) => {
        // If timer is running or an interval is active, don't mess with remaining time.
        if (state.isRunning || state.activeIntervalId) {
          return {
            ...state,
            currentTaskId: taskId,
          };
        }

        // Timer is idle → recompute remainingSeconds using the new task's config
        const newRemaining = getDurationForType(
          state.currentIntervalType,
          taskId,
        );

        return {
          ...state,
          currentTaskId: taskId,
          remainingSeconds: newRemaining,
          intervalStartTime: undefined,
          plannedEndTime: undefined,
        };
      }),

    setIntervalType: (type) => {
      const state = get();
      if (state.activeIntervalId) {
        const appStore = useAppStore.getState();
        appStore.skipInterval({ intervalId: state.activeIntervalId });
      }

      const duration = getDurationForType(type, state.currentTaskId);
      set({
        currentIntervalType: type,
        remainingSeconds: duration,
        isRunning: false,
        activeIntervalId: undefined,
        intervalStartTime: undefined,
        plannedEndTime: undefined,
      });

      cancelScheduledNotificationIfNeeded();
    },

    startTimer: () => {
      const state = get();
      if (state.isRunning) {
        return;
      }

      const appStore = useAppStore.getState();
      const settings = appStore.settings;
      const isPro = selectIsProEffective(appStore);

      let remainingSeconds = state.remainingSeconds;
      if (!remainingSeconds || remainingSeconds <= 0) {
        remainingSeconds = getDurationForType(state.currentIntervalType, state.currentTaskId);
      }

      let intervalId = state.activeIntervalId;
      if (!intervalId) {
        intervalId = appStore.startInterval({
          taskId: state.currentTaskId,
          type: state.currentIntervalType,
          durationSeconds: getDurationForType(state.currentIntervalType, state.currentTaskId),
        });
      }

      const now = Date.now();
      const plannedEndTime = now + remainingSeconds * 1000;

      set({
        isRunning: true,
        remainingSeconds,
        activeIntervalId: intervalId,
        intervalStartTime: now,
        plannedEndTime,
      });

      cancelScheduledNotificationIfNeeded();
      scheduleNotificationIfEnabled(remainingSeconds, state.currentIntervalType);

      if (isPro && settings.enhancedBackgroundModeEnabled) {
        const currentTask =
          state.currentTaskId && appStore.tasks.find((task) => task.id === state.currentTaskId);

        showTimerStatusNotification({
          intervalType: state.currentIntervalType,
          remainingSeconds,
          taskTitle: currentTask?.title,
        }).catch(() => {});
      } else {
        hideTimerStatusNotification().catch(() => {});
      }
    },

    pauseTimer: () => {
      cancelScheduledNotificationIfNeeded();
      hideTimerStatusNotification().catch(() => {});
      set({ isRunning: false, intervalStartTime: undefined, plannedEndTime: undefined });
    },

    resetTimer: () => {
      const state = get();
      if (state.activeIntervalId) {
        const appStore = useAppStore.getState();
        appStore.skipInterval({ intervalId: state.activeIntervalId });
      }

      cancelScheduledNotificationIfNeeded();
      hideTimerStatusNotification().catch(() => {});
      set({
        remainingSeconds: getDurationForType(state.currentIntervalType, state.currentTaskId),
        isRunning: false,
        activeIntervalId: undefined,
        intervalStartTime: undefined,
        plannedEndTime: undefined,
      });
    },

    tick: () => {
      set((state) => {
        if (!state.isRunning || !state.plannedEndTime) {
          return state;
        }

        const now = Date.now();
        const remainingMs = state.plannedEndTime - now;
        const nextRemainingSeconds = Math.max(0, Math.round(remainingMs / 1000));

        return {
          ...state,
          remainingSeconds: nextRemainingSeconds,
        };
      });
    },

    handleIntervalCompletion: () => {
      const state = get();
      if (!state.activeIntervalId) {
        return;
      }

      const appStore = useAppStore.getState();
      appStore.finishInterval({ intervalId: state.activeIntervalId });

      hideTimerStatusNotification().catch(() => {});

      const { nextType, nextCompletedWorkIntervals } = determineNextInterval(
        state.currentIntervalType,
        state.completedWorkIntervals,
        true,
        state.currentTaskId,
      );

      cancelScheduledNotificationIfNeeded();
      set({
        currentIntervalType: nextType,
        completedWorkIntervals: nextCompletedWorkIntervals,
        remainingSeconds: getDurationForType(nextType, state.currentTaskId),
        isRunning: false,
        activeIntervalId: undefined,
        intervalStartTime: undefined,
        plannedEndTime: undefined,
      });

      playIntervalEndSound();
      triggerIntervalHaptics();

      const effectiveSettings = selectEffectiveSettings(appStore);
      const isPro = selectIsProEffective(appStore);
      const autoStart = isPro ? effectiveSettings.autoStartNextInterval : false;

      if (autoStart) {
        get().startTimer();
      }
    },

    skipCurrentInterval: () => {
      const state = get();
      const appStore = useAppStore.getState();

      let intervalId = state.activeIntervalId;
      if (!intervalId) {
        intervalId = appStore.startInterval({
          taskId: state.currentTaskId,
          type: state.currentIntervalType,
          durationSeconds: getDurationForType(state.currentIntervalType, state.currentTaskId),
        });
      }

      appStore.skipInterval({ intervalId });

      const { nextType, nextCompletedWorkIntervals } = determineNextInterval(
        state.currentIntervalType,
        state.completedWorkIntervals,
        false,
        state.currentTaskId,
      );

      cancelScheduledNotificationIfNeeded();
      hideTimerStatusNotification().catch(() => {});
      set({
        currentIntervalType: nextType,
        completedWorkIntervals: nextCompletedWorkIntervals,
        remainingSeconds: getDurationForType(nextType, state.currentTaskId),
        isRunning: false,
        activeIntervalId: undefined,
        intervalStartTime: undefined,
        plannedEndTime: undefined,
      });

      const effectiveSettings = selectEffectiveSettings(appStore);
      const isPro = selectIsProEffective(appStore);
      const autoStart = isPro ? effectiveSettings.autoStartNextInterval : false;

      if (autoStart) {
        get().startTimer();
      }
    },
    syncWithCurrentTime: () => {
      const state = get();
      if (!state.isRunning || !state.plannedEndTime) {
        return;
      }

      const now = Date.now();
      const remainingMs = state.plannedEndTime - now;
      const nextRemainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

      set({ remainingSeconds: nextRemainingSeconds });
    },
  };
});

// Recalculate timer duration whenever the app store changes,
// but only if the timer is idle (not running and no active interval).
useAppStore.subscribe(() => {
  const timerState = useTimerStore.getState();
  if (timerState.isRunning || timerState.activeIntervalId) {
    return;
  }

  useTimerStore.setState({
    remainingSeconds: getDurationForType(timerState.currentIntervalType, timerState.currentTaskId),
    intervalStartTime: undefined,
    plannedEndTime: undefined,
  });
});
