import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import {
  AppStateSnapshot,
  ActivityType,
  IntervalSession,
  IntervalType,
  PomodoroSettings,
  ProStatus,
  CloudSyncState,
  StreakState,
  Task,
} from '../models';
import { CloudSnapshot, cloudSyncApi } from '../services/cloudSyncApi';

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

const ORPHAN_INTERVAL_AGE_MS = 5 * 60 * 1000;

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
  setCloudUser: (userId?: string) => void;
  setCloudSyncEnabled: (enabled: boolean) => void;
  markCloudSynced: (info: { revision: number; syncedAt?: string }) => void;
  hydrateFromCloudSnapshot: (snapshot: AppStateSnapshot & { revision?: number }) => void;
}

export const STORAGE_KEY = 'POMODORO_APP_STATE_V1';
const PERSIST_DEBOUNCE_MS = 500;
const CLOUD_SYNC_DEBOUNCE_MS = 3000;

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

const defaultStreakState: StreakState = {
  currentStreak: 0,
  bestStreak: 0,
  lastActiveDate: undefined,
  frozenDates: [],
  lastFreezeWeekStart: undefined,
  freezeUsesThisWeek: 0,
};

const defaultCloudSyncState: CloudSyncState = {
  userId: undefined,
  cloudSyncEnabled: false,
  lastSyncedAt: undefined,
  lastKnownRevision: undefined,
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

const toDateKey = (iso: string): string => {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};

const differenceInDays = (fromKey: string, toKey: string): number => {
  const from = new Date(fromKey);
  const to = new Date(toKey);
  const msPerDay = 24 * 60 * 60 * 1000;
  const diff = Math.round((to.getTime() - from.getTime()) / msPerDay);
  return diff;
};

const getWeekStartKey = (date: Date): string => {
  const d = new Date(date);
  const day = d.getDay();
  const diffSinceMonday = (day + 6) % 7;
  d.setDate(d.getDate() - diffSinceMonday);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};

const normalizeFreezeUsage = (
  prev: StreakState,
  referenceIso: string,
): StreakState => {
  const thisWeekStartKey = getWeekStartKey(new Date(referenceIso));

  if (prev.lastFreezeWeekStart && prev.lastFreezeWeekStart === thisWeekStartKey) {
    return prev;
  }

  return {
    ...prev,
    freezeUsesThisWeek: 0,
    lastFreezeWeekStart: thisWeekStartKey,
  };
};

const computeStreakAfterCompletion = (
  prev: StreakState,
  completedAtIso: string,
  isPro: boolean,
): StreakState => {
  const dayKey = toDateKey(completedAtIso);
  const normalizedPrev = normalizeFreezeUsage(prev, completedAtIso);

  if (normalizedPrev.lastActiveDate === dayKey) {
    return normalizedPrev;
  }

  if (!normalizedPrev.lastActiveDate) {
    const currentStreak = 1;
    return {
      ...normalizedPrev,
      currentStreak,
      bestStreak: Math.max(normalizedPrev.bestStreak, currentStreak),
      lastActiveDate: dayKey,
    };
  }

  const gapDays = differenceInDays(normalizedPrev.lastActiveDate, dayKey);

  if (gapDays === 1) {
    const currentStreak = normalizedPrev.currentStreak + 1;
    return {
      ...normalizedPrev,
      currentStreak,
      bestStreak: Math.max(normalizedPrev.bestStreak, currentStreak),
      lastActiveDate: dayKey,
    };
  }

  let currentStreak = 1;
  let frozenDates = normalizedPrev.frozenDates;
  let freezeUsesThisWeek = normalizedPrev.freezeUsesThisWeek;
  let lastFreezeWeekStart = normalizedPrev.lastFreezeWeekStart;

  if (gapDays === 2 && isPro) {
    const now = new Date(completedAtIso);
    const thisWeekStartKey = getWeekStartKey(now);

    if (!lastFreezeWeekStart || lastFreezeWeekStart !== thisWeekStartKey) {
      freezeUsesThisWeek = 0;
      lastFreezeWeekStart = thisWeekStartKey;
    }

    if (freezeUsesThisWeek < 1) {
      const missingDate = new Date(normalizedPrev.lastActiveDate);
      missingDate.setDate(missingDate.getDate() + 1);
      const missingKey = missingDate.toISOString().slice(0, 10);

      currentStreak = normalizedPrev.currentStreak + 1;
      frozenDates = [...frozenDates, missingKey];
      freezeUsesThisWeek += 1;
    }
  }

  const bestStreak = Math.max(normalizedPrev.bestStreak, currentStreak);

  return {
    ...normalizedPrev,
    currentStreak,
    bestStreak,
    lastActiveDate: dayKey,
    frozenDates,
    freezeUsesThisWeek,
    lastFreezeWeekStart,
  };
};

const cleanupIntervals = (intervals: IntervalSession[]): IntervalSession[] => {
  const now = Date.now();

  return intervals.map((interval) => {
    if (interval.endedAt) return interval;

    const startedMs = new Date(interval.startedAt).getTime();
    if (!Number.isFinite(startedMs)) return interval;

    const ageMs = now - startedMs;
    if (ageMs < ORPHAN_INTERVAL_AGE_MS) {
      return interval;
    }

    return {
      ...interval,
      endedAt: new Date(startedMs).toISOString(),
      wasSkipped: true,
    };
  });
};

const useAppStore = create<AppStore>((set, get) => {
  const getSnapshot = (): AppStateSnapshot => {
    const { tasks, intervals, activityTypes, settings, proStatus, streak, cloudSync } = get();
    return { tasks, intervals, activityTypes, settings, proStatus, streak, cloudSync };
  };

  const schedulePersist = debounce((snapshot: AppStateSnapshot) => {
    persistState(snapshot);
  }, PERSIST_DEBOUNCE_MS);

  const getCloudSnapshot = (): CloudSnapshot | null => {
    const state = get();
    const userId = state.cloudSync.userId;
    if (!userId) return null;

    const base = getSnapshot();
    return {
      ...base,
      userId,
      updatedAt: nowIso(),
      revision: state.cloudSync.lastKnownRevision ?? 0,
    };
  };

  const scheduleCloudSync = debounce(async () => {
    const state = get();

    const isPro = selectIsProEffective(state);
    if (!isPro) return;
    if (!state.cloudSync.userId) return;
    if (!state.cloudSync.cloudSyncEnabled) return;

    const snapshot = getCloudSnapshot();
    if (!snapshot) return;

    try {
      const stored = await cloudSyncApi.uploadSnapshot(snapshot);
      get().markCloudSynced({
        revision: stored.revision,
        syncedAt: stored.updatedAt,
      });
    } catch (error) {
      console.warn('Cloud sync failed', error);
    }
  }, CLOUD_SYNC_DEBOUNCE_MS);

  const setStateAndPersist = (
    updater: (state: AppStore) => AppStateSnapshot | Partial<AppStore>,
    options: { skipCloudSync?: boolean } = {},
  ) => {
    set((state) => ({ ...state, ...updater(state) }));
    const snapshot = getSnapshot();
    schedulePersist(snapshot);
    if (!options.skipCloudSync) {
      scheduleCloudSync();
    }
  };

  const hydrate = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AppStateSnapshot>;
        set((state) => {
          const nextProStatus = parsed.proStatus ? { ...state.proStatus, ...parsed.proStatus } : state.proStatus;
          const nextSettings = { ...state.settings, ...(parsed.settings ?? {}) };
          const hydratedStreak = parsed.streak
            ? { ...defaultStreakState, ...parsed.streak }
            : { ...defaultStreakState };
          const nextStreak = normalizeFreezeUsage(hydratedStreak, nowIso());
          const rawIntervals = parsed.intervals ?? state.intervals;
          const cleanedIntervals = cleanupIntervals(rawIntervals);
          const nextCloudSync = parsed.cloudSync
            ? { ...defaultCloudSyncState, ...parsed.cloudSync }
            : { ...defaultCloudSyncState };

          return {
            ...state,
            tasks: parsed.tasks ?? state.tasks,
            intervals: cleanedIntervals,
            activityTypes: parsed.activityTypes ?? state.activityTypes,
            settings: nextSettings,
            proStatus: nextProStatus,
            isPro: nextProStatus.isPro,
            streak: nextStreak,
            cloudSync: nextCloudSync,
          };
        });
      }
    } catch (error) {
      console.error('Failed to hydrate app state', error);
    }
  };

  hydrate();

  return {
    tasks: [],
    intervals: [],
    activityTypes: [],
    settings: { ...defaultSettings },
    proStatus: { ...defaultProStatus },
    isPro: defaultProStatus.isPro,
    streak: { ...defaultStreakState },
    cloudSync: { ...defaultCloudSyncState },

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
      const isPro = selectIsProEffective(get());

      setStateAndPersist((state) => {
        let updatedInterval: IntervalSession | undefined;

        const updatedIntervals = state.intervals.map((interval) => {
          if (interval.id !== intervalId) return interval;

          const next: IntervalSession = {
            ...interval,
            endedAt: timestamp,
            wasSkipped: false,
          };
          updatedInterval = next;
          return next;
        });

        let nextStreak = state.streak;

        if (
          updatedInterval &&
          updatedInterval.type === 'work' &&
          !updatedInterval.wasSkipped
        ) {
          nextStreak = computeStreakAfterCompletion(state.streak, timestamp, isPro);
        }

        return {
          intervals: updatedIntervals,
          streak: nextStreak,
        };
      });
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
    setCloudUser: (userId) => {
      setStateAndPersist((state) => ({
        cloudSync: {
          ...state.cloudSync,
          userId,
        },
      }));
    },
    setCloudSyncEnabled: (enabled) => {
      setStateAndPersist((state) => ({
        cloudSync: {
          ...state.cloudSync,
          cloudSyncEnabled: enabled,
        },
      }));
    },
    markCloudSynced: ({ revision, syncedAt }) => {
      const timestamp = syncedAt ?? nowIso();
      setStateAndPersist(
        (state) => ({
          cloudSync: {
            ...state.cloudSync,
            lastSyncedAt: timestamp,
            lastKnownRevision: revision,
          },
        }),
        { skipCloudSync: true },
      );
    },
    hydrateFromCloudSnapshot: (snapshot) => {
      setStateAndPersist((state) => {
        const nextProStatus = snapshot.proStatus ?? state.proStatus;
        const nextSettings = { ...state.settings, ...(snapshot.settings ?? {}) };

        return {
          ...state,
          tasks: snapshot.tasks ?? state.tasks,
          intervals: snapshot.intervals ?? state.intervals,
          activityTypes: snapshot.activityTypes ?? state.activityTypes,
          settings: nextSettings,
          proStatus: nextProStatus,
          isPro: nextProStatus.isPro,
          cloudSync: {
            ...state.cloudSync,
            lastKnownRevision: snapshot.revision ?? state.cloudSync.lastKnownRevision,
            lastSyncedAt: nowIso(),
          },
        };
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
    streak: state.streak,
    cloudSync: state.cloudSync,
  }));

export const useStreak = () => useAppStore((state) => state.streak);

export default useAppStore;
