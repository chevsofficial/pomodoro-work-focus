export type IntervalType = 'work' | 'short_break' | 'long_break';

export interface Task {
  id: string;
  title: string;
  description?: string;
  activityTypeId?: string;
  createdAt: string;
  updatedAt: string;
  isCompleted: boolean;
  completedAt?: string;
  deletedAt?: string;
}

export interface IntervalSession {
  id: string;
  taskId?: string;
  type: IntervalType;
  startedAt: string;
  endedAt?: string;
  wasSkipped: boolean;
  durationSeconds: number;
}

export interface ActivityType {
  id: string;
  name: string;
  color?: string;
  workDurationMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  intervalsBeforeLongBreak: number;
}

export interface PomodoroSettings {
  workDurationMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  intervalsBeforeLongBreak: number;
  autoStartNextInterval: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  notificationsEnabled: boolean;
  defaultActivityTypeId?: string;
}

export interface ProStatus {
  isPro: boolean;
  purchaseDate?: string;
  expiryDate?: string;
  source?: 'purchase' | 'code' | 'promo';
}

export interface AppStateSnapshot {
  tasks: Task[];
  intervals: IntervalSession[];
  activityTypes: ActivityType[];
  settings: PomodoroSettings;
  proStatus: ProStatus;
}
