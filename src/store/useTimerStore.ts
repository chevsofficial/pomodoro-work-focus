import { create } from 'zustand';
import { IntervalType } from '../models';
import { cancelScheduledNotification, scheduleIntervalCompletionNotification } from '../utils/notificationService';
import useAppStore from './appStore';

const ONE_MINUTE_IN_SECONDS = 60;

const getSettings = () => useAppStore.getState().settings;

const getTimingConfigForTask = (taskId?: string) => {
  const appState = useAppStore.getState();
  const { settings, tasks, activityTypes } = appState;

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

    void cancelScheduledNotification(notificationId);
    set({ scheduledNotificationId: undefined });
  };

  const scheduleNotificationIfEnabled = (secondsFromNow: number, type: IntervalType) => {
    const settings = getSettings();
    if (!settings.notificationsEnabled || secondsFromNow <= 0) {
      cancelScheduledNotificationIfNeeded();
      return;
    }

    const state = get();

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

    void scheduleIntervalCompletionNotification({
      secondsFromNow,
      intervalType: type,
      nextIntervalType,
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

      let remainingSeconds = state.remainingSeconds;
      if (!remainingSeconds || remainingSeconds <= 0) {
        remainingSeconds = getDurationForType(state.currentIntervalType, state.currentTaskId);
      }

      let intervalId = state.activeIntervalId;
      if (!intervalId) {
        const appStore = useAppStore.getState();
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
    },

    pauseTimer: () => {
      cancelScheduledNotificationIfNeeded();
      set({ isRunning: false, intervalStartTime: undefined, plannedEndTime: undefined });
    },

    resetTimer: () => {
      const state = get();
      if (state.activeIntervalId) {
        const appStore = useAppStore.getState();
        appStore.skipInterval({ intervalId: state.activeIntervalId });
      }

      cancelScheduledNotificationIfNeeded();
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
        if (!state.isRunning || state.remainingSeconds <= 0) {
          return state;
        }

        return {
          ...state,
          remainingSeconds: Math.max(0, state.remainingSeconds - 1),
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

      if (appStore.settings.autoStartNextInterval) {
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
      set({
        currentIntervalType: nextType,
        completedWorkIntervals: nextCompletedWorkIntervals,
        remainingSeconds: getDurationForType(nextType, state.currentTaskId),
        isRunning: false,
        activeIntervalId: undefined,
        intervalStartTime: undefined,
        plannedEndTime: undefined,
      });

      if (appStore.settings.autoStartNextInterval) {
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
useAppStore.subscribe((state) => {
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
