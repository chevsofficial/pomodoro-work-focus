import { IntervalSession } from '../models';

export const MIN_ANALYTICS_INTERVAL_SECONDS = 5 * 60; // 5 minutes

export const getActualDurationSeconds = (interval: IntervalSession): number => {
  const start = new Date(interval.startedAt).getTime();
  const end = interval.endedAt ? new Date(interval.endedAt).getTime() : start;

  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;

  return Math.max(0, Math.round((end - start) / 1000));
};
