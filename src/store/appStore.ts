import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import {
  AppStateSnapshot,
  ActivityType,
  IntervalSegment,
  IntervalSession,
  IntervalType,
  PomodoroSettings,
  ProStatus,
  CloudSyncState,
  StreakState,
  Task,
  Language,
} from '../models';
import { CloudSnapshot, cloudSyncApi } from '../services/cloudSyncApi';
import { supabase } from '../services/supabaseClient';
import { PRO_DEV_UNLOCK_ENABLED } from '../config/proFeatures';
import {
  closeCurrentSegment,
  getActiveDurationSeconds,
  getActiveDurationSecondsFromSegments,
  getAnalyticsDurationSeconds,
  normalizeSegments,
  startNewSegment,
} from '../utils/intervalUtils';

export const FREE_TASK_LIMIT = 10;
export const FREE_ACTIVITY_TYPE_LIMIT = 3;

// How far back free users can see analytics
const FREE_ANALYTICS_MAX_DAYS = 14;

export type ExportableTask = {
  id: string;
  title: string;
  status: 'todo' | 'done' | 'archived';
  activityTypeId: string | null;
  createdAt: string;
  updatedAt: string | null;
  description?: string;
};

export type ExportableActivityType = {
  id: string;
  name: string;
  isArchived: boolean;
  color?: string | null;
  createdAt: string;
  updatedAt: string | null;
  workDurationMinutes?: number;
  shortBreakMinutes?: number;
  longBreakMinutes?: number;
  intervalsBeforeLongBreak?: number;
};

export type ExportableSession = {
  id: string;
  taskId: string | null;
  activityTypeId: string | null;
  plannedMinutes: number;
  actualFocusMinutes: number;
  startedAt: string;
  endedAt: string | null;
  status: 'completed' | 'cancelled_early' | 'skipped' | 'other';
};

export type ExportableUserSettings = {
  id: string;
  settings: PomodoroSettings;
};

export type ExportableUserData = {
  tasks: ExportableTask[];
  activityTypes: ExportableActivityType[];
  sessions: ExportableSession[];
  userSettings?: ExportableUserSettings | null;
};

export const selectIsProEffective = (state: AppStore): boolean => {
  if (PRO_DEV_UNLOCK_ENABLED) return true;
  if (!state.proStatus?.isPro) return false;
  const expiresAt = state.proStatus.expiresAt;
  if (expiresAt) {
    const expiresMs = new Date(expiresAt).getTime();
    if (Number.isFinite(expiresMs) && expiresMs <= Date.now()) {
      return false;
    }
  }
  return true;
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

export const selectActivityTypeTotalCount = (state: AppStore): number =>
  state.activityTypes.length;

export const selectRemainingFreeActivityTypes = (state: AppStore): number => {
  const isPro = selectIsProEffective(state);
  if (isPro) return Infinity;
  return Math.max(0, FREE_ACTIVITY_TYPE_LIMIT - selectActivityTypeTotalCount(state));
};

export const selectCanCreateActivityType = (state: AppStore): boolean => {
  const isPro = selectIsProEffective(state);
  if (isPro) return true;

  const total = selectActivityTypeTotalCount(state);
  return total < FREE_ACTIVITY_TYPE_LIMIT;
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
  isPasswordRecovery: boolean;
  earlySkipInfoVisible: boolean;
  addTask: (payload: AddTaskPayload) => void;
  updateTask: (taskId: string, updates: UpdateTaskPayload) => void;
  toggleTaskCompleted: (taskId: string) => void;
  deleteTaskSoft: (taskId: string) => void;
  startInterval: (payload: StartIntervalPayload) => string;
  startIntervalSegment: (payload: { intervalId: string; startTimeMs: number }) => void;
  endIntervalSegment: (payload: { intervalId: string; endTimeMs: number }) => void;
  finishInterval: (payload: FinishIntervalPayload) => void;
  skipInterval: (payload: SkipIntervalPayload) => void;
  updateSettings: (updates: Partial<PomodoroSettings>) => void;
  addActivityType: (payload: AddActivityTypePayload) => void;
  updateActivityType: (activityTypeId: string, updates: UpdateActivityTypePayload) => void;
  deleteActivityType: (activityTypeId: string) => void;
  archiveActivityType: (activityTypeId: string) => void;
  unarchiveActivityType: (activityTypeId: string) => void;
  setShowEarlySkipInfoModal: (show: boolean) => void;
  showEarlySkipInfo: () => void;
  hideEarlySkipInfo: () => void;
  setProStatus: (status: Partial<ProStatus> & { isPro: boolean; source?: ProStatus['source'] }) => void;
  setPro: (value: boolean) => void;
  setCloudUser: (userId?: string) => void;
  setCloudSyncEnabled: (enabled: boolean) => void;
  markCloudSynced: (info: { revision: number; syncedAt?: string }) => void;
  hydrateFromCloudSnapshot: (snapshot: AppStateSnapshot & { revision?: number }) => void;
  resetLocalState: () => void;
  deleteAllUserData: () => Promise<void>;
  getExportableData: () => ExportableUserData;
  setLanguage: (language: Language) => void;
  setPasswordRecovery: (flag: boolean) => void;
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
  showEarlySkipInfoModal: true,
};

const defaultProStatus: ProStatus = {
  isPro: false,
  source: 'none',
  productId: null,
  platform: undefined,
  expiresAt: null,
  activatedAt: null,
  lastVerifiedAt: null,
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

const toMs = (value?: string): number | undefined => {
  if (!value) return undefined;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : undefined;
};

const deriveSegmentsForInterval = (interval: IntervalSession, endMs?: number): IntervalSegment[] => {
  const startMs = toMs(interval.startedAt);
  return normalizeSegments(interval.segments, startMs, endMs);
};

const applyIntervalDurations = (
  interval: IntervalSession,
  segments: IntervalSegment[],
  endMs?: number,
): IntervalSession => {
  const activeDurationSeconds = getActiveDurationSecondsFromSegments(segments);
  const startMs = toMs(interval.startedAt);

  const wallDurationSeconds =
    endMs !== undefined && startMs !== undefined
      ? Math.max(0, Math.round((endMs - startMs) / 1000))
      : interval.wallDurationSeconds;

  const analyticsDurationSeconds =
    endMs !== undefined || interval.analyticsDurationSeconds !== undefined
      ? getAnalyticsDurationSeconds({
          ...interval,
          segments,
          activeDurationSeconds,
          wallDurationSeconds,
        })
      : interval.analyticsDurationSeconds;

  return {
    ...interval,
    segments,
    activeDurationSeconds,
    wallDurationSeconds,
    analyticsDurationSeconds,
  };
};

const finalizeIntervalDurations = (
  interval: IntervalSession,
  endMs: number,
  wasSkipped: boolean,
): IntervalSession => {
  const segments = closeCurrentSegment(deriveSegmentsForInterval(interval, endMs), endMs);
  const withDurations = applyIntervalDurations(interval, segments, endMs);

  return {
    ...withDurations,
    endedAt: new Date(endMs).toISOString(),
    wasSkipped,
  };
};

const ensureCompletedIntervalDurations = (interval: IntervalSession): IntervalSession => {
  if (!interval.endedAt) return interval;

  const endMs = toMs(interval.endedAt);
  if (endMs === undefined) return interval;

  return finalizeIntervalDurations(interval, endMs, interval.wasSkipped);
};

const cleanupIntervals = (intervals: IntervalSession[]): IntervalSession[] => {
  const now = Date.now();

  return intervals.map((interval) => {
    if (interval.endedAt) return ensureCompletedIntervalDurations(interval);

    const startedMs = new Date(interval.startedAt).getTime();
    if (!Number.isFinite(startedMs)) return interval;

    const ageMs = now - startedMs;
    if (ageMs < ORPHAN_INTERVAL_AGE_MS) {
      return interval;
    }

    return finalizeIntervalDurations(interval, startedMs, true);
  });
};

const mapTaskToExportable = (task: Task): ExportableTask => ({
  id: task.id,
  title: task.title,
  status: task.deletedAt ? 'archived' : task.isCompleted ? 'done' : 'todo',
  activityTypeId: task.activityTypeId ?? null,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt ?? null,
  description: task.description,
});

const mapActivityTypeToExportable = (type: ActivityType): ExportableActivityType => ({
  id: type.id,
  name: type.name,
  isArchived: Boolean(type.archivedAt),
  color: type.color ?? null,
  createdAt: '',
  updatedAt: type.archivedAt ?? null,
  workDurationMinutes: type.workDurationMinutes,
  shortBreakMinutes: type.shortBreakMinutes,
  longBreakMinutes: type.longBreakMinutes,
  intervalsBeforeLongBreak: type.intervalsBeforeLongBreak,
});

const mapIntervalToExportable = (interval: IntervalSession): ExportableSession => {
  const plannedSeconds = interval.durationSeconds ?? getActiveDurationSeconds(interval);
  const plannedMinutes = Math.round(plannedSeconds / 60);
  const actualFocusMinutes = Math.round(getAnalyticsDurationSeconds(interval) / 60);
  const status: ExportableSession['status'] = interval.wasSkipped
    ? 'skipped'
    : interval.endedAt
    ? 'completed'
    : 'other';

  return {
    id: interval.id,
    taskId: interval.taskId ?? null,
    activityTypeId: interval.activityTypeId ?? null,
    plannedMinutes,
    actualFocusMinutes,
    startedAt: interval.startedAt,
    endedAt: interval.endedAt ?? null,
    status,
  };
};

const mapSettingsToExportable = (settings: PomodoroSettings): ExportableUserSettings => ({
  id: 'settings',
  settings,
});

const useAppStore = create<AppStore>((set, get) => {
  const getSnapshot = (): AppStateSnapshot => {
    const { tasks, intervals, activityTypes, settings, proStatus, streak, cloudSync, language } = get();
    return { tasks, intervals, activityTypes, settings, proStatus, streak, cloudSync, language };
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
      console.error('Cloud sync: upload to Supabase failed', error);
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
          const nextProStatus = parsed.proStatus
            ? { ...defaultProStatus, ...state.proStatus, ...parsed.proStatus }
            : state.proStatus;
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
          const nextLanguage = parsed.language ?? state.language ?? 'en';

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
            language: nextLanguage,
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
    isPasswordRecovery: false,
    earlySkipInfoVisible: false,
    streak: { ...defaultStreakState },
    cloudSync: { ...defaultCloudSyncState },
    language: 'en',

    resetLocalState: () => {
      setStateAndPersist((state) => ({
        tasks: [],
        intervals: [],
        activityTypes: [],
        settings: { ...defaultSettings },
        streak: { ...defaultStreakState },
        cloudSync: {
          ...state.cloudSync,
          lastKnownRevision: undefined,
          lastSyncedAt: undefined,
        },
      }));
    },

    setLanguage: (language) => {
      setStateAndPersist(() => ({ language }));
    },

    setPasswordRecovery: (flag) => {
      set({ isPasswordRecovery: flag });
    },

    deleteAllUserData: async () => {
      const state = get();
      try {
        if (state.cloudSync.userId) {
          const { error } = await supabase.rpc('delete_all_user_data');
          if (error) {
            console.warn('delete_all_user_data RPC failed', error);
          }
        }

        await AsyncStorage.removeItem(STORAGE_KEY);
        state.resetLocalState();
      } catch (error) {
        console.error('Failed to delete all data', error);
        throw error;
      }
    },

    getExportableData: () => {
      const state = get();
      const userSettings = mapSettingsToExportable(state.settings);

      return {
        tasks: state.tasks.map(mapTaskToExportable),
        activityTypes: state.activityTypes.map(mapActivityTypeToExportable),
        sessions: state.intervals.map(mapIntervalToExportable),
        userSettings,
      };
    },

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
      const startMs = Date.now();
      const timestamp = new Date(startMs).toISOString();
      const segments = [{ start: startMs, end: startMs }];
      const interval: IntervalSession = {
        id: createId(),
        taskId,
        type,
        startedAt: timestamp,
        wasSkipped: false,
        durationSeconds,
        segments,
        activeDurationSeconds: 0,
        wallDurationSeconds: 0,
        analyticsDurationSeconds: 0,
      };

      setStateAndPersist((state) => ({ intervals: [...state.intervals, interval] }));

      return interval.id;
    },

    startIntervalSegment: ({ intervalId, startTimeMs }) => {
      setStateAndPersist((state) => ({
        intervals: state.intervals.map((interval) => {
          if (interval.id !== intervalId) return interval;

          const baseSegments = deriveSegmentsForInterval(interval, startTimeMs);
          const segments = startNewSegment(baseSegments, startTimeMs);

          return applyIntervalDurations(interval, segments);
        }),
      }));
    },

    endIntervalSegment: ({ intervalId, endTimeMs }) => {
      setStateAndPersist((state) => ({
        intervals: state.intervals.map((interval) => {
          if (interval.id !== intervalId) return interval;

          const baseSegments = deriveSegmentsForInterval(interval, endTimeMs);
          const segments = closeCurrentSegment(baseSegments, endTimeMs);

          return applyIntervalDurations(interval, segments);
        }),
      }));
    },

    finishInterval: ({ intervalId, endedAt }) => {
      const timestamp = endedAt ?? nowIso();
      const endMs = new Date(timestamp).getTime();
      const isPro = selectIsProEffective(get());

      setStateAndPersist((state) => {
        let updatedInterval: IntervalSession | undefined;

        const updatedIntervals = state.intervals.map((interval) => {
          if (interval.id !== intervalId) return interval;

          const next = finalizeIntervalDurations(interval, endMs, false);
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
      const endMs = new Date(timestamp).getTime();
      setStateAndPersist((state) => ({
        intervals: state.intervals.map((interval) =>
          interval.id === intervalId ? finalizeIntervalDurations(interval, endMs, true) : interval,
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

    setShowEarlySkipInfoModal: (show) => {
      setStateAndPersist((state) => ({
        settings: {
          ...state.settings,
          showEarlySkipInfoModal: show,
        },
      }));
    },

    showEarlySkipInfo: () => {
      set({ earlySkipInfoVisible: true });
    },

    hideEarlySkipInfo: () => {
      set({ earlySkipInfoVisible: false });
    },

    addActivityType: (payload) => {
      const newType: ActivityType = {
        id: createId(),
        archivedAt: undefined,
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

    archiveActivityType: (activityTypeId) => {
      const timestamp = new Date().toISOString();
      setStateAndPersist((state) => ({
        activityTypes: state.activityTypes.map((type) =>
          type.id === activityTypeId
            ? { ...type, archivedAt: type.archivedAt ?? timestamp }
            : type,
        ),
      }));
    },

    unarchiveActivityType: (activityTypeId) => {
      setStateAndPersist((state) => ({
        activityTypes: state.activityTypes.map((type) =>
          type.id === activityTypeId
            ? { ...type, archivedAt: undefined }
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
        const nextProStatus = { ...defaultProStatus, ...state.proStatus, ...status };
        return { proStatus: nextProStatus, isPro: nextProStatus.isPro };
      });
    },

    setPro: (value) => {
      setStateAndPersist((state) => {
        const nextProStatus = { ...defaultProStatus, ...state.proStatus, isPro: value };
        return { proStatus: nextProStatus, isPro: value };
      });
    },
    setCloudUser: (userId) => {
      setStateAndPersist((state) => {
        const keepEnabled =
          userId && selectIsProEffective(state) ? state.cloudSync.cloudSyncEnabled : false;

        return {
          cloudSync: {
            ...defaultCloudSyncState,
            userId,
            cloudSyncEnabled: keepEnabled,
          },
        };
      });
    },
    setCloudSyncEnabled: (enabled) => {
      setStateAndPersist((state) => {
        const canEnable = selectIsProEffective(state) && Boolean(state.cloudSync.userId);

        return {
          cloudSync: {
            ...state.cloudSync,
            cloudSyncEnabled: enabled && canEnable,
          },
        };
      });
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
        const nextProStatus = snapshot.proStatus
          ? { ...defaultProStatus, ...state.proStatus, ...snapshot.proStatus }
          : state.proStatus;
        const nextSettings = { ...state.settings, ...(snapshot.settings ?? {}) };
        const nextIntervals = cleanupIntervals(snapshot.intervals ?? state.intervals);
        const nextLanguage = snapshot.language ?? state.language;

        return {
          ...state,
          tasks: snapshot.tasks ?? state.tasks,
          intervals: nextIntervals,
          activityTypes: snapshot.activityTypes ?? state.activityTypes,
          settings: nextSettings,
          proStatus: nextProStatus,
          isPro: nextProStatus.isPro,
          language: nextLanguage,
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

export const useActiveActivityTypes = () =>
  useAppStore((state) => state.activityTypes.filter((type) => !type.archivedAt));

export const useArchivedActivityTypes = () =>
  useAppStore((state) => state.activityTypes.filter((type) => !!type.archivedAt));

export const useAppStateSnapshot = () =>
  useAppStore((state) => ({
    tasks: state.tasks,
    intervals: state.intervals,
    activityTypes: state.activityTypes,
    settings: state.settings,
    proStatus: state.proStatus,
    streak: state.streak,
    cloudSync: state.cloudSync,
    language: state.language,
  }));

export const useStreak = () => useAppStore((state) => state.streak);

export const useLanguage = () => useAppStore((state) => state.language);

export const useSetLanguage = () => useAppStore((state) => state.setLanguage);

export default useAppStore;
