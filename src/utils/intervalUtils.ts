import { IntervalSegment, IntervalSession } from '../models';

export const MIN_ANALYTICS_INTERVAL_SECONDS = 5 * 60; // 5 minutes

const toMs = (value?: string): number | undefined => {
  if (!value) return undefined;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : undefined;
};

export const normalizeSegments = (
  segments?: IntervalSegment[],
  fallbackStartMs?: number,
  fallbackEndMs?: number,
): IntervalSegment[] => {
  if (segments && segments.length > 0) {
    return segments.map((segment) => ({
      start: segment.start,
      end: segment.end ?? segment.start,
    }));
  }

  if (fallbackStartMs === undefined) {
    return [];
  }

  const endMs = fallbackEndMs ?? fallbackStartMs;
  return [{ start: fallbackStartMs, end: endMs }];
};

export const getWallDurationSeconds = (interval: IntervalSession): number => {
  if (typeof interval.wallDurationSeconds === 'number') {
    return interval.wallDurationSeconds;
  }

  const startMs = toMs(interval.startedAt);
  const endMs = toMs(interval.endedAt) ?? startMs;

  if (startMs === undefined || endMs === undefined) return 0;

  return Math.max(0, Math.round((endMs - startMs) / 1000));
};

export const getActiveDurationSecondsFromSegments = (
  segments?: IntervalSegment[],
): number => {
  if (!segments || segments.length === 0) return 0;

  const totalMs = segments.reduce((total, segment) => {
    const duration = Math.max(0, (segment.end ?? segment.start) - segment.start);
    return total + duration;
  }, 0);

  return Math.max(0, Math.round(totalMs / 1000));
};

export const getActiveDurationSeconds = (interval: IntervalSession): number => {
  if (typeof interval.activeDurationSeconds === 'number') {
    return interval.activeDurationSeconds;
  }

  const startMs = toMs(interval.startedAt);
  const endMs = toMs(interval.endedAt);
  const segments = normalizeSegments(interval.segments, startMs, endMs ?? startMs);

  return getActiveDurationSecondsFromSegments(segments);
};

export const getAnalyticsDurationSeconds = (interval: IntervalSession): number => {
  if (typeof interval.analyticsDurationSeconds === 'number' && interval.endedAt) {
    return interval.analyticsDurationSeconds;
  }

  const activeSeconds = getActiveDurationSeconds(interval);
  const plannedSeconds = interval.durationSeconds ?? activeSeconds;

  if (plannedSeconds > 0) {
    return Math.min(activeSeconds, plannedSeconds);
  }

  return activeSeconds;
};

export const closeCurrentSegment = (
  segments: IntervalSegment[] | undefined,
  endTimeMs: number,
): IntervalSegment[] => {
  const normalized = segments && segments.length > 0 ? [...segments] : [];

  if (normalized.length === 0) {
    return [{ start: endTimeMs, end: endTimeMs }];
  }

  const current = normalized[normalized.length - 1];
  normalized[normalized.length - 1] = { ...current, end: endTimeMs };
  return normalized;
};

export const startNewSegment = (
  segments: IntervalSegment[] | undefined,
  startTimeMs: number,
): IntervalSegment[] => {
  const normalized = segments && segments.length > 0 ? [...segments] : [];
  normalized.push({ start: startTimeMs, end: startTimeMs });
  return normalized;
};
