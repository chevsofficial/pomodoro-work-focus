import { create } from 'zustand';
import { IntervalType } from '../models';
import useAppStore from './appStore';

const ONE_MINUTE_IN_SECONDS = 60;

const getSettings = () => useAppStore.getState().settings;

const getDurationForType = (type: IntervalType) => {
  const settings = getSettings();

  switch (type) {
    case 'short_break':
      return Math.max(1, Math.round(settings.shortBreakMinutes * ONE_MINUTE_IN_SECONDS));
    case 'long_break':
      return Math.max(1, Math.round(settings.longBreakMinutes * ONE_MINUTE_IN_SECONDS));
    case 'work':
    default:
      return Math.max(1, Math.round(settings.workDurationMinutes * ONE_MINUTE_IN_SECONDS));
  }
};

const determineNextInterval = (
  finishedType: IntervalType,
  completedWorkIntervals: number,
  shouldCountWorkCompletion: boolean,
) => {
  const settings = getSettings();
  const requiredBeforeLongBreak = Math.max(1, settings.intervalsBeforeLongBreak || 1);

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
  setCurrentTask: (taskId?: string) => void;
  setIntervalType: (type: IntervalType) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  tick: () => void;
  handleIntervalCompletion: () => void;
  skipCurrentInterval: () => void;
}

export const useTimerStore = create<TimerState>((set, get) => ({
  currentIntervalType: 'work',
  currentTaskId: undefined,
  remainingSeconds: getDurationForType('work'),
  isRunning: false,
  activeIntervalId: undefined,
  completedWorkIntervals: 0,

  setCurrentTask: (taskId) => set({ currentTaskId: taskId }),

  setIntervalType: (type) => {
    const state = get();
    if (state.activeIntervalId) {
      const appStore = useAppStore.getState();
      appStore.skipInterval({ intervalId: state.activeIntervalId });
    }

    const duration = getDurationForType(type);
    set({
      currentIntervalType: type,
      remainingSeconds: duration,
      isRunning: false,
      activeIntervalId: undefined,
    });
  },

  startTimer: () => {
    const state = get();
    if (state.isRunning) {
      return;
    }

    let remainingSeconds = state.remainingSeconds;
    if (!remainingSeconds || remainingSeconds <= 0) {
      remainingSeconds = getDurationForType(state.currentIntervalType);
    }

    let intervalId = state.activeIntervalId;
    if (!intervalId) {
      const appStore = useAppStore.getState();
      intervalId = appStore.startInterval({
        taskId: state.currentTaskId,
        type: state.currentIntervalType,
        durationSeconds: getDurationForType(state.currentIntervalType),
      });
    }

    set({
      isRunning: true,
      remainingSeconds,
      activeIntervalId: intervalId,
    });
  },

  pauseTimer: () => set({ isRunning: false }),

  resetTimer: () => {
    const state = get();
    if (state.activeIntervalId) {
      const appStore = useAppStore.getState();
      appStore.skipInterval({ intervalId: state.activeIntervalId });
    }

    set({
      remainingSeconds: getDurationForType(state.currentIntervalType),
      isRunning: false,
      activeIntervalId: undefined,
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
    );

    set({
      currentIntervalType: nextType,
      completedWorkIntervals: nextCompletedWorkIntervals,
      remainingSeconds: getDurationForType(nextType),
      isRunning: false,
      activeIntervalId: undefined,
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
        durationSeconds: getDurationForType(state.currentIntervalType),
      });
    }

    appStore.skipInterval({ intervalId });

    const { nextType, nextCompletedWorkIntervals } = determineNextInterval(
      state.currentIntervalType,
      state.completedWorkIntervals,
      false,
    );

    set({
      currentIntervalType: nextType,
      completedWorkIntervals: nextCompletedWorkIntervals,
      remainingSeconds: getDurationForType(nextType),
      isRunning: false,
      activeIntervalId: undefined,
    });

    if (appStore.settings.autoStartNextInterval) {
      get().startTimer();
    }
  },
}));
