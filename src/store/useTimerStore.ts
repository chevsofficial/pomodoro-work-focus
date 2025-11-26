import { create } from 'zustand';
import { IntervalType } from '../models';
import { cancelScheduledNotification, scheduleIntervalCompletionNotification } from '../utils/notificationService';
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
  endIntervalNow: () => void;
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

  const transitionToNextInterval = (
    prevState: TimerState,
    { shouldCountWorkCompletion, playCompletionFeedback }: { shouldCountWorkCompletion: boolean; playCompletionFeedback?: boolean },
  ) => {
    const { nextType, nextCompletedWorkIntervals } = determineNextInterval(
      prevState.currentIntervalType,
      prevState.completedWorkIntervals,
      shouldCountWorkCompletion,
      prevState.currentTaskId,
    );

    cancelScheduledNotificationIfNeeded();
    set({
      currentIntervalType: nextType,
      completedWorkIntervals: nextCompletedWorkIntervals,
      remainingSeconds: getDurationForType(nextType, prevState.currentTaskId),
      isRunning: false,
      activeIntervalId: undefined,
      intervalStartTime: undefined,
      plannedEndTime: undefined,
    });

    if (playCompletionFeedback) {
      playIntervalEndSound();
      triggerIntervalHaptics();
    }

    const appStoreState = useAppStore.getState();
    const effectiveSettings = selectEffectiveSettings(appStoreState);
    const isPro = selectIsProEffective(appStoreState);
    const autoStart = isPro ? effectiveSettings.autoStartNextInterval : false;

    if (autoStart) {
      get().startTimer();
    }
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
        const now = Date.now();
        appStore.endIntervalSegment({ intervalId: state.activeIntervalId, endTimeMs: now });
        appStore.skipInterval({ intervalId: state.activeIntervalId, skippedAt: new Date(now).toISOString() });
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

      const appStore = useAppStore.getState();
      let intervalId = state.activeIntervalId;
      if (!intervalId) {
        intervalId = appStore.startInterval({
          taskId: state.currentTaskId,
          type: state.currentIntervalType,
          durationSeconds: getDurationForType(state.currentIntervalType, state.currentTaskId),
        });
      } else if (!state.intervalStartTime) {
        const now = Date.now();
        appStore.startIntervalSegment({ intervalId, startTimeMs: now });
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
      const state = get();
      const now = Date.now();

      if (state.activeIntervalId) {
        const appStore = useAppStore.getState();
        appStore.endIntervalSegment({ intervalId: state.activeIntervalId, endTimeMs: now });
      }

      cancelScheduledNotificationIfNeeded();
      set((current) => {
        if (!current.plannedEndTime) {
          return {
            ...current,
            isRunning: false,
            intervalStartTime: undefined,
            plannedEndTime: undefined,
          };
        }

        const remainingMs = current.plannedEndTime - now;
        const nextRemainingSeconds = Math.max(0, Math.round(remainingMs / 1000));

        return {
          ...current,
          isRunning: false,
          intervalStartTime: undefined,
          plannedEndTime: undefined,
          remainingSeconds: nextRemainingSeconds,
        };
      });
    },

    resetTimer: () => {
      const state = get();
      if (state.activeIntervalId) {
        const appStore = useAppStore.getState();
        const now = Date.now();
        appStore.endIntervalSegment({ intervalId: state.activeIntervalId, endTimeMs: now });
        appStore.skipInterval({ intervalId: state.activeIntervalId, skippedAt: new Date(now).toISOString() });
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
      const endMs = state.plannedEndTime ?? Date.now();
      appStore.endIntervalSegment({ intervalId: state.activeIntervalId, endTimeMs: endMs });
      appStore.finishInterval({ intervalId: state.activeIntervalId, endedAt: new Date(endMs).toISOString() });

      transitionToNextInterval(state, {
        shouldCountWorkCompletion: true,
        playCompletionFeedback: true,
      });
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

      const now = Date.now();
      appStore.endIntervalSegment({ intervalId, endTimeMs: now });
      appStore.skipInterval({ intervalId, skippedAt: new Date(now).toISOString() });

      transitionToNextInterval(state, { shouldCountWorkCompletion: false });
    },
    endIntervalNow: () => {
      const state = get();
      const appStore = useAppStore.getState();

      if (!state.activeIntervalId) {
        return;
      }

      const endMs = Date.now();
      const endedAt = new Date(endMs).toISOString();

      appStore.endIntervalSegment({ intervalId: state.activeIntervalId, endTimeMs: endMs });
      appStore.finishInterval({ intervalId: state.activeIntervalId, endedAt });

      transitionToNextInterval(state, { shouldCountWorkCompletion: true });
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
