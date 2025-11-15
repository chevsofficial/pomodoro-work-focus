import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { AppStateSnapshot, ActivityType, IntervalSession, IntervalType, PomodoroSettings, ProStatus, Task } from '../models';

type AddTaskPayload = {
  title: string;
  description?: string;
  activityTypeId?: string;
};

type UpdateTaskPayload = Partial<Pick<Task, 'title' | 'description' | 'activityTypeId' | 'isCompleted' | 'deletedAt'>>;

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
  addTask: (payload: AddTaskPayload) => void;
  updateTask: (taskId: string, updates: UpdateTaskPayload) => void;
  toggleTaskCompleted: (taskId: string) => void;
  deleteTaskSoft: (taskId: string) => void;
  startInterval: (payload: StartIntervalPayload) => void;
  finishInterval: (payload: FinishIntervalPayload) => void;
  skipInterval: (payload: SkipIntervalPayload) => void;
  updateSettings: (updates: Partial<PomodoroSettings>) => void;
  addActivityType: (payload: AddActivityTypePayload) => void;
  updateActivityType: (activityTypeId: string, updates: UpdateActivityTypePayload) => void;
  deleteActivityType: (activityTypeId: string) => void;
  setProStatus: (status: ProStatus) => void;
}

const STORAGE_KEY = 'POMODORO_APP_STATE_V1';
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
  defaultActivityTypeId: undefined,
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
        set((state) => ({
          ...state,
          tasks: parsed.tasks ?? state.tasks,
          intervals: parsed.intervals ?? state.intervals,
          activityTypes: parsed.activityTypes ?? state.activityTypes,
          settings: parsed.settings ?? state.settings,
          proStatus: parsed.proStatus ?? state.proStatus,
        }));
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
      };

      setStateAndPersist((state) => ({ tasks: [...state.tasks, newTask] }));
    },

    updateTask: (taskId, updates) => {
      const timestamp = nowIso();
      setStateAndPersist((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                ...updates,
                updatedAt: timestamp,
              }
            : task,
        ),
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
      setStateAndPersist(() => ({ proStatus: { ...status } }));
    },
  };
});

export const useTasks = () => useAppStore((state) => state.tasks);

export const useIntervalsByTask = (taskId?: string) =>
  useAppStore((state) =>
    state.intervals.filter((interval) => (taskId ? interval.taskId === taskId : true)),
  );

export const useSettings = () => useAppStore((state) => state.settings);

export const useProStatus = () => useAppStore((state) => state.proStatus);

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
