import { ThemeId } from '../theme/themes';

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
  activityTypeId?: string;
  type: IntervalType;
  startedAt: string;
  endedAt?: string;
  wasSkipped: boolean;
  durationSeconds: number;
  segments?: IntervalSegment[];
  activeDurationSeconds?: number;
  wallDurationSeconds?: number;
  analyticsDurationSeconds?: number;
}

export interface IntervalSegment {
  start: number; // timestamp in milliseconds
  end: number; // timestamp in milliseconds
}

export interface ActivityType {
  id: string;
  name: string;
  color?: string;
  workDurationMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  intervalsBeforeLongBreak: number;
  archivedAt?: string;
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
  notificationSoundKey: string;
  defaultActivityTypeId?: string;
  themeId?: ThemeId;
  showEarlySkipInfoModal: boolean;
}

export type ProSource = 'none' | 'redeem_code' | 'iap' | 'admin' | 'promo';

export interface ProStatus {
  isPro: boolean;
  source: ProSource;

  productId?: string | null;
  platform?: 'ios' | 'android';
  expiresAt?: string | null;
  activatedAt?: string | null;
  lastVerifiedAt?: string | null;
}

export interface StreakState {
  currentStreak: number;
  bestStreak: number;
  lastActiveDate?: string;
  frozenDates: string[];
  lastFreezeWeekStart?: string;
  freezeUsesThisWeek: number;
}

export interface CloudSyncState {
  userId?: string;
  cloudSyncEnabled: boolean;
  lastSyncedAt?: string;
  lastKnownRevision?: number;
}

export type Language = 'en' | 'es';

export interface AppStateSnapshot {
  tasks: Task[];
  intervals: IntervalSession[];
  activityTypes: ActivityType[];
  settings: PomodoroSettings;
  proStatus: ProStatus;
  streak: StreakState;
  cloudSync: CloudSyncState;
  language: Language;
}
