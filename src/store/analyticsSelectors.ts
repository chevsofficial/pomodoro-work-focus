import { IntervalSession, Task } from '../models';
import useAppStore from './appStore';

export type AnalyticsRange = 'today' | 'week' | 'month' | 'all';

export interface AnalyticsStats {
  completedWorkIntervals: number;
  skippedIntervals: number;
  completedTasks: number;
  totalFocusSeconds: number;
}

const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;

const getRangeStart = (range: AnalyticsRange): Date | undefined => {
  const now = new Date();

  switch (range) {
    case 'today': {
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      return today;
    }
    case 'week':
      return new Date(now.getTime() - 7 * MILLISECONDS_IN_DAY);
    case 'month':
      return new Date(now.getTime() - 30 * MILLISECONDS_IN_DAY);
    case 'all':
    default:
      return undefined;
  }
};

const isAfterRangeStart = (dateIso?: string, rangeStart?: Date) => {
  if (!rangeStart || !dateIso) {
    return true;
  }

  const date = new Date(dateIso);
  return date.getTime() >= rangeStart.getTime();
};

const isCompletedWorkInterval = (interval: IntervalSession) =>
  interval.type === 'work' && !interval.wasSkipped && Boolean(interval.endedAt);

const getIntervalDurationSeconds = (interval: IntervalSession) => {
  if (interval.startedAt && interval.endedAt) {
    const started = new Date(interval.startedAt);
    const ended = new Date(interval.endedAt);
    const diff = (ended.getTime() - started.getTime()) / 1000;
    if (!Number.isNaN(diff) && diff > 0) {
      return diff;
    }
  }

  return interval.durationSeconds ?? 0;
};

export const calculateAnalyticsStats = (
  tasks: Task[],
  intervals: IntervalSession[],
  range: AnalyticsRange = 'all',
): AnalyticsStats => {
  const rangeStart = getRangeStart(range);

  const completedTasks = tasks.filter(
    (task) => task.isCompleted && !task.deletedAt && isAfterRangeStart(task.updatedAt, rangeStart),
  ).length;

  let completedWorkIntervals = 0;
  let skippedIntervals = 0;
  let totalFocusSeconds = 0;

  intervals.forEach((interval) => {
    const referenceDate = interval.endedAt ?? interval.startedAt;
    if (!isAfterRangeStart(referenceDate, rangeStart)) {
      return;
    }

    if (isCompletedWorkInterval(interval)) {
      completedWorkIntervals += 1;
      totalFocusSeconds += getIntervalDurationSeconds(interval);
    }

    if (interval.wasSkipped) {
      skippedIntervals += 1;
    }
  });

  return {
    completedWorkIntervals,
    skippedIntervals,
    completedTasks,
    totalFocusSeconds,
  };
};

export const useAnalyticsStats = (range: AnalyticsRange = 'all') =>
  useAppStore((state) => calculateAnalyticsStats(state.tasks, state.intervals, range));
