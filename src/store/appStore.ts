import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { AppStateSnapshot, ActivityType, IntervalSession, IntervalType, PomodoroSettings, ProStatus, Task } from '../models';

// Toggle this during development to unlock everything
const FORCE_ALL_PRO_FEATURES = __DEV__ && false; // Set to true for local testing

export const FREE_TASK_LIMIT = 10;

// How far back free users can see analytics
const FREE_ANALYTICS_MAX_DAYS = 14;

export const selectIsProEffective = (state: AppStore): boolean => {
  if (FORCE_ALL_PRO_FEATURES) return true;
  return state.isPro;
};

export const selectActiveTaskCount = (state: AppStore): number =>
  state.tasks.filter((t) => !t.deletedAt).length;

export const selectRemainingFreeTasks = (state: AppStore): number => {
  const isPro = selectIsProEffective(state);
  if (isPro) return Infinity;
  return Math.max(0, FREE_TASK_LIMIT - selectActiveTaskCount(state));
};

export const selectCanCreateTask = (state: AppStore): boolean => {
  const isPro = selectIsProEffective(state);
  if (isPro) return true;

  const activeTasksCount = selectActiveTaskCount(state);
  return activeTasksCount < FREE_TASK_LIMIT;
};

export const selectAnalyticsMinDate = (state: AppStore): Date | null => {
  const isPro = selectIsProEffective(state);
  if (isPro) return null; // no limit

  const now = new Date();
  const min = new Date(now);
  min.setDate(now.getDate() - FREE_ANALYTICS_MAX_DAYS + 1);
  min.setHours(0, 0, 0, 0);
  return min;
};

export const useAnalyticsMinDate = () => useAppStore(selectAnalyticsMinDate);

// ---- Pro-aware settings helpers ----

// Defaults for free plan behavior
const FREE_DEFAULT_WORK_MIN = 25;
const FREE_DEFAULT_SHORT_MIN = 5;
const FREE_DEFAULT_LONG_MIN = 15;
const FREE_DEFAULT_INTERVALS_BEFORE_LONG = 4;
const FREE_DEFAULT_AUTOSTART = false;

export const selectEffectiveSettings = (state: AppStore): PomodoroSettings => {
  const raw = state.settings;
  const isPro = selectIsProEffective(state);

  if (isPro) {
    return raw;
  }

  // Free users: enforce fixed behavior
  return {
    ...raw,
    workDurationMinutes: FREE_DEFAULT_WORK_MIN,
    shortBreakMinutes: FREE_DEFAULT_SHORT_MIN,
    longBreakMinutes: FREE_DEFAULT_LONG_MIN,
    intervalsBeforeLongBreak: FREE_DEFAULT_INTERVALS_BEFORE_LONG,
    autoStartNextInterval: FREE_DEFAULT_AUTOSTART,
  };
};

type AddTaskPayload = {
  title: string;
  description?: string;
  activityTypeId?: string;
};

type UpdateTaskPayload = Partial<
  Pick<Task, 'title' | 'description' | 'activityTypeId' | 'isCompleted' | 'completedAt' | 'deletedAt'>
>;

type AddActivityTypePayload = Omit<ActivityType, 'id'>;

type UpdateActivityTypePayload = Partial<Omit<ActivityType, 'id'>>;

type StartIntervalPayload = {
  taskId?: string;
  type: IntervalType;
  durationSeconds: number;
};

type FinishIntervalPayload = {
  intervalId: string;
  endedAt?: string;
};

type SkipIntervalPayload = {
  intervalId: string;
  skippedAt?: string;
};

export interface AppStore extends AppStateSnapshot {
  isPro: boolean;
  addTask: (payload: AddTaskPayload) => void;
  updateTask: (taskId: string, updates: UpdateTaskPayload) => void;
  toggleTaskCompleted: (taskId: string) => void;
  deleteTaskSoft: (taskId: string) => void;
  startInterval: (payload: StartIntervalPayload) => string;
  finishInterval: (payload: FinishIntervalPayload) => void;
  skipInterval: (payload: SkipIntervalPayload) => void;
  updateSettings: (updates: Partial<PomodoroSettings>) => void;
  addActivityType: (payload: AddActivityTypePayload) => void;
  updateActivityType: (activityTypeId: string, updates: UpdateActivityTypePayload) => void;
  deleteActivityType: (activityTypeId: string) => void;
  setProStatus: (status: ProStatus) => void;
  setPro: (value: boolean) => void;
}

export const STORAGE_KEY = 'POMODORO_APP_STATE_V1';
const PERSIST_DEBOUNCE_MS = 500;

const nowIso = () => new Date().toISOString();

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const defaultSettings: PomodoroSettings = {
  workDurationMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  intervalsBeforeLongBreak: 4,
  autoStartNextInterval: false,
  soundEnabled: true,
  vibrationEnabled: true,
  notificationsEnabled: true,
  notificationSoundKey: 'chime1',
  defaultActivityTypeId: undefined,
  themeId: 'dark',
};

const defaultProStatus: ProStatus = {
  isPro: false,
};

const debounce = <T extends (...args: any[]) => void>(fn: T, delay: number) => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      timeout = undefined;
      fn(...args);
    }, delay);
  };
};

const persistState = async (state: AppStateSnapshot) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to persist app state', error);
  }
};

const useAppStore = create<AppStore>((set, get) => {
  const getSnapshot = (): AppStateSnapshot => {
    const { tasks, intervals, activityTypes, settings, proStatus } = get();
    return { tasks, intervals, activityTypes, settings, proStatus };
  };

  const schedulePersist = debounce((snapshot: AppStateSnapshot) => {
    void persistState(snapshot);
  }, PERSIST_DEBOUNCE_MS);

  const setStateAndPersist = (updater: (state: AppStore) => AppStateSnapshot | Partial<AppStore>) => {
    set((state) => ({ ...state, ...updater(state) }));
    schedulePersist(getSnapshot());
  };

  const hydrate = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AppStateSnapshot>;
        set((state) => {
          const nextProStatus = parsed.proStatus ? { ...state.proStatus, ...parsed.proStatus } : state.proStatus;
          const nextSettings = { ...state.settings, ...(parsed.settings ?? {}) };

          return {
            ...state,
            tasks: parsed.tasks ?? state.tasks,
            intervals: parsed.intervals ?? state.intervals,
            activityTypes: parsed.activityTypes ?? state.activityTypes,
            settings: nextSettings,
            proStatus: nextProStatus,
            isPro: nextProStatus.isPro,
          };
        });
      }
    } catch (error) {
      console.error('Failed to hydrate app state', error);
    }
  };

  void hydrate();

  return {
    tasks: [],
    intervals: [],
    activityTypes: [],
    settings: { ...defaultSettings },
    proStatus: { ...defaultProStatus },
    isPro: defaultProStatus.isPro,

    addTask: ({ title, description, activityTypeId }) => {
      const timestamp = nowIso();
      const newTask: Task = {
        id: createId(),
        title,
        description,
        activityTypeId,
        createdAt: timestamp,
        updatedAt: timestamp,
        isCompleted: false,
        completedAt: undefined,
      };

      setStateAndPersist((state) => ({ tasks: [...state.tasks, newTask] }));
    },

    updateTask: (taskId, updates) => {
      const timestamp = nowIso();
      setStateAndPersist((state) => ({
        tasks: state.tasks.map((task) => {
          if (task.id !== taskId) {
            return task;
          }

          const isCompletionUpdate = 'isCompleted' in updates || 'completedAt' in updates;
          const nextIsCompleted = updates.isCompleted ?? task.isCompleted;
          const nextCompletedAt =
            'completedAt' in updates
              ? updates.completedAt
              : isCompletionUpdate
              ? nextIsCompleted
                ? timestamp
                : undefined
              : task.completedAt;

          return {
            ...task,
            ...updates,
            isCompleted: nextIsCompleted,
            completedAt: nextCompletedAt,
            updatedAt: timestamp,
          };
        }),
      }));
    },

    toggleTaskCompleted: (taskId) => {
      const timestamp = nowIso();
      setStateAndPersist((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                isCompleted: !task.isCompleted,
                completedAt: !task.isCompleted ? timestamp : undefined,
                updatedAt: timestamp,
              }
            : task,
        ),
      }));
    },

    deleteTaskSoft: (taskId) => {
      const timestamp = nowIso();
      setStateAndPersist((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                deletedAt: task.deletedAt ?? timestamp,
                updatedAt: timestamp,
              }
            : task,
        ),
      }));
    },

    startInterval: ({ taskId, type, durationSeconds }) => {
      const timestamp = nowIso();
      const interval: IntervalSession = {
        id: createId(),
        taskId,
        type,
        startedAt: timestamp,
        wasSkipped: false,
        durationSeconds,
      };

      setStateAndPersist((state) => ({ intervals: [...state.intervals, interval] }));

      return interval.id;
    },

    finishInterval: ({ intervalId, endedAt }) => {
      const timestamp = endedAt ?? nowIso();
      setStateAndPersist((state) => ({
        intervals: state.intervals.map((interval) =>
          interval.id === intervalId
            ? {
                ...interval,
                endedAt: timestamp,
                wasSkipped: false,
              }
            : interval,
        ),
      }));
    },

    skipInterval: ({ intervalId, skippedAt }) => {
      const timestamp = skippedAt ?? nowIso();
      setStateAndPersist((state) => ({
        intervals: state.intervals.map((interval) =>
          interval.id === intervalId
            ? {
                ...interval,
                endedAt: timestamp,
                wasSkipped: true,
              }
            : interval,
        ),
      }));
    },

    updateSettings: (updates) => {
      setStateAndPersist((state) => ({
        settings: {
          ...state.settings,
          ...updates,
        },
      }));
    },

    addActivityType: (payload) => {
      const newType: ActivityType = {
        id: createId(),
        ...payload,
      };

      setStateAndPersist((state) => ({ activityTypes: [...state.activityTypes, newType] }));
    },

    updateActivityType: (activityTypeId, updates) => {
      setStateAndPersist((state) => ({
        activityTypes: state.activityTypes.map((type) =>
          type.id === activityTypeId
            ? {
                ...type,
                ...updates,
              }
            : type,
        ),
      }));
    },

    deleteActivityType: (activityTypeId) => {
      setStateAndPersist((state) => ({
        activityTypes: state.activityTypes.filter((type) => type.id !== activityTypeId),
      }));
    },

    setProStatus: (status) => {
          setStateAndPersist((state) => {
        const nextProStatus = { ...state.proStatus, ...status };
        return { proStatus: nextProStatus, isPro: nextProStatus.isPro };
      });
    },

    setPro: (value) => {
      setStateAndPersist((state) => {
        const nextProStatus = { ...state.proStatus, isPro: value };
        return { proStatus: nextProStatus, isPro: value };
      });
    },
  };
});

export const useTasks = () => useAppStore((state) => state.tasks);

export const useIntervalsByTask = (taskId?: string) =>
  useAppStore((state) =>
    state.intervals.filter((interval) => (taskId ? interval.taskId === taskId : true)),
  );

export const useSettings = () => useAppStore((state) => state.settings);

export const useEffectiveSettings = () => useAppStore(selectEffectiveSettings);

export const useProStatus = () => useAppStore((state) => state.proStatus);

export const useIsPro = () => useAppStore(selectIsProEffective);

export const useActivityTypes = () => useAppStore((state) => state.activityTypes);

export const useAppStateSnapshot = () =>
  useAppStore((state) => ({
    tasks: state.tasks,
    intervals: state.intervals,
    activityTypes: state.activityTypes,
    settings: state.settings,
    proStatus: state.proStatus,
  }));

export default useAppStore;
