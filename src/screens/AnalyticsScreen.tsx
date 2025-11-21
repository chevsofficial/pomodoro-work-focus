import React, { useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StackedBarChart } from 'react-native-chart-kit';
import { ScreenContainer } from '../components/ScreenContainer';
import { IntervalSession } from '../models';
import useAppStore from '../store/appStore';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

type DateRangeKey =
  | 'custom'
  | 'today'
  | 'yesterday'
  | 'thisWeek'
  | 'previousWeek'
  | 'thisMonth'
  | 'previousMonth'
  | 'thisYear'
  | 'previousYear'
  | 'all';

type TaskFilterId = 'all' | string;

const DATE_RANGE_OPTIONS: { key: DateRangeKey; label: string }[] = [
  { key: 'custom', label: 'Custom' },
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'thisWeek', label: 'This week' },
  { key: 'previousWeek', label: 'Previous week' },
  { key: 'thisMonth', label: 'This month' },
  { key: 'previousMonth', label: 'Previous month' },
  { key: 'thisYear', label: 'This year' },
  { key: 'previousYear', label: 'Previous year' },
  { key: 'all', label: 'All data' },
];

const screenWidth = Dimensions.get('window').width;
const CHART_HORIZONTAL_MARGIN = 24;
const chartWidth = screenWidth - CHART_HORIZONTAL_MARGIN * 2;
const DEFAULT_ACTIVITY_COLOR = '#4A5568';
const DEFAULT_ACTIVITY_NAME = 'No activity type';

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

const addDays = (d: Date, days: number) => {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);

const startOfYear = (d: Date) => new Date(d.getFullYear(), 0, 1);

// Monday as start of week (adjust if you prefer Sunday)
const startOfWeek = (d: Date) => {
  const copy = startOfDay(d);
  const day = copy.getDay(); // 0 (Sun) .. 6 (Sat)
  const diff = (day + 6) % 7; // 0 = Monday
  return addDays(copy, -diff);
};

const formatRangeDateLabel = (d: Date) =>
  d.toLocaleDateString(undefined, {
    weekday: 'short', // Mon
    day: 'numeric',
    month: 'short', // Nov
    year: 'numeric',
  });

const getRangeBounds = (
  range: DateRangeKey,
  intervals: IntervalSession[],
): {
  startMs: number;
  endMs: number;
  labelStart: string;
  labelEnd: string;
} => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = addDays(todayStart, 1);

  let start = todayStart;
  let end = tomorrowStart;

  if (range === 'today') {
    // already todayStart -> tomorrowStart
  } else if (range === 'yesterday') {
    start = addDays(todayStart, -1);
    end = todayStart;
  } else if (range === 'thisWeek') {
    start = startOfWeek(now);
    end = addDays(todayStart, 1);
  } else if (range === 'previousWeek') {
    const thisWeekStart = startOfWeek(now);
    const prevWeekStart = addDays(thisWeekStart, -7);
    const prevWeekEnd = thisWeekStart;
    start = prevWeekStart;
    end = prevWeekEnd;
  } else if (range === 'thisMonth') {
    start = startOfMonth(now);
    end = addDays(todayStart, 1);
  } else if (range === 'previousMonth') {
    const thisMonthStart = startOfMonth(now);
    const prevMonthEnd = thisMonthStart;
    const prevMonthStart = new Date(
      thisMonthStart.getFullYear(),
      thisMonthStart.getMonth() - 1,
      1,
    );
    start = prevMonthStart;
    end = prevMonthEnd;
  } else if (range === 'thisYear') {
    start = startOfYear(now);
    end = addDays(todayStart, 1);
  } else if (range === 'previousYear') {
    const thisYearStart = startOfYear(now);
    const prevYearStart = new Date(thisYearStart.getFullYear() - 1, 0, 1);
    const prevYearEnd = thisYearStart;
    start = prevYearStart;
    end = prevYearEnd;
  } else if (range === 'all' || range === 'custom') {
    // For now, custom behaves like all (eventual PRO date pickers here)
    if (intervals.length > 0) {
      const times = intervals.map((i) => new Date(i.startedAt).getTime());
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      start = startOfDay(new Date(minTime));
      end = addDays(startOfDay(new Date(maxTime)), 1);
    }
  }

  return {
    startMs: start.getTime(),
    endMs: end.getTime(),
    labelStart: formatRangeDateLabel(start),
    labelEnd: formatRangeDateLabel(addDays(end, -1)), // last included day
  };
};

// IMPORTANT: named export must be called AnalyticsScreen
export const AnalyticsScreen: React.FC = () => {
  const [range, setRange] = useState<DateRangeKey>('thisWeek');
  const [selectedTaskId, setSelectedTaskId] = useState<TaskFilterId>('all');
  const isPro = useAppStore((state) => state.isPro);
  const intervals = useAppStore((state) => state.intervals);
  const tasks = useAppStore((state) => state.tasks);
  const activityTypes = useAppStore((state) => state.activityTypes);

  const selectableTasks = useMemo(
    () => tasks.filter((t) => !t.deletedAt),
    [tasks],
  );

  const { startMs, endMs, labelStart, labelEnd } = useMemo(
    () => getRangeBounds(range, intervals ?? []),
    [intervals, range],
  );

  const rangeStart = useMemo(() => new Date(startMs), [startMs]);
  const rangeEnd = useMemo(() => new Date(endMs), [endMs]);

  const workIntervals = useMemo(
    () =>
      (intervals ?? []).filter((i) => i.type === 'work' && !!i.startedAt),
    [intervals],
  );

  const filteredWorkIntervals = useMemo(
    () =>
      selectedTaskId === 'all'
        ? workIntervals
        : workIntervals.filter((i) => i.taskId === selectedTaskId),
    [selectedTaskId, workIntervals],
  );

  const workIntervalsInRange = useMemo(() => {
    if (!rangeStart || !rangeEnd) return [] as IntervalSession[];
    const startTime = rangeStart.getTime();
    const endTime = rangeEnd.getTime();

    return filteredWorkIntervals.filter((i) => {
      const started = new Date(i.startedAt).getTime();
      return started >= startTime && started < endTime;
    });
  }, [filteredWorkIntervals, rangeEnd, rangeStart]);

  const lifetimeCompletedWork = useMemo(
    () => filteredWorkIntervals.filter((i) => !i.wasSkipped).length,
    [filteredWorkIntervals],
  );

  const lifetimeFocusSeconds = useMemo(
    () =>
      filteredWorkIntervals
        .filter((i) => !i.wasSkipped && i.endedAt)
        .reduce((sum, i) => sum + i.durationSeconds, 0),
    [filteredWorkIntervals],
  );

  const lifetimeFocusHours = lifetimeFocusSeconds / 3600;

  const rangeCompletedWork = useMemo(
    () => workIntervalsInRange.filter((i) => !i.wasSkipped).length,
    [workIntervalsInRange],
  );

  const rangeSkippedWork = useMemo(
    () => workIntervalsInRange.filter((i) => i.wasSkipped).length,
    [workIntervalsInRange],
  );

  const rangeFocusSeconds = useMemo(
    () =>
      workIntervalsInRange
        .filter((i) => !i.wasSkipped && i.endedAt)
        .reduce((sum, i) => sum + i.durationSeconds, 0),
    [workIntervalsInRange],
  );

  const rangeFocusHours = rangeFocusSeconds / 3600;

  const activityTypeMap = useMemo(() => {
    const entries = activityTypes.map((t) => [t.id, t] as const);
    return Object.fromEntries(entries) as Record<string, (typeof activityTypes)[number]>;
  }, [activityTypes]);

  const taskMap = useMemo(() => {
    const map: Record<string, (typeof tasks)[number]> = {};
    tasks.forEach((t) => {
      map[t.id] = t;
    });
    return map;
  }, [tasks]);

  const dailyBuckets = useMemo(() => {
    const map = new Map<
      string,
      {
        dateKey: string;
        label: string;
        activityTotals: Record<string, number>;
      }
    >();

    for (const interval of workIntervalsInRange) {
      const started = new Date(interval.startedAt);
      const dateKey = started.toISOString().slice(0, 10);
      const label = started
        .toLocaleDateString(undefined, { weekday: 'short' })
        .slice(0, 1);

      const bucket =
        map.get(dateKey) ?? {
          dateKey,
          label,
          activityTotals: {},
        };

      const task = interval.taskId ? taskMap[interval.taskId] : undefined;
      const activityId = task?.activityTypeId ?? 'none';
      const hours = interval.durationSeconds / 3600;

      bucket.activityTotals[activityId] =
        (bucket.activityTotals[activityId] ?? 0) + hours;
      map.set(dateKey, bucket);
    }

    return Array.from(map.values()).sort((a, b) =>
      a.dateKey.localeCompare(b.dateKey),
    );
  }, [taskMap, workIntervalsInRange]);

  const activityKeysInRange = useMemo(() => {
    const set = new Set<string>();
    dailyBuckets.forEach((bucket) => {
      Object.keys(bucket.activityTotals).forEach((k) => set.add(k));
    });
    return Array.from(set);
  }, [dailyBuckets]);

  const stackedColors = activityKeysInRange.map((key) =>
    key === 'none'
      ? DEFAULT_ACTIVITY_COLOR
      : activityTypeMap[key]?.color ?? DEFAULT_ACTIVITY_COLOR,
  );

  const stackedLegend = activityKeysInRange.map((key) =>
    key === 'none'
      ? DEFAULT_ACTIVITY_NAME
      : activityTypeMap[key]?.name ?? 'Unknown',
  );

  const stackedLabels = dailyBuckets.map((b) => b.label);

  const stackedData = dailyBuckets.map((b) =>
    activityKeysInRange.map((key) => b.activityTotals[key] ?? 0),
  );

  const activityTypeRatio = useMemo(() => {
    const totals: Record<string, number> = {};

    for (const interval of workIntervalsInRange) {
      if (interval.wasSkipped || !interval.endedAt) continue;

      const task = interval.taskId ? taskMap[interval.taskId] : undefined;
      const activityId = task?.activityTypeId ?? 'none';
      const hours = interval.durationSeconds / 3600;

      totals[activityId] = (totals[activityId] ?? 0) + hours;
    }

    const totalHours = Object.values(totals).reduce((sum, v) => sum + v, 0);
    if (totalHours === 0) return [] as {
      key: string;
      label: string;
      color: string;
      hours: number;
      percent: number;
    }[];

    return Object.entries(totals)
      .map(([key, hours]) => {
        const type = key === 'none' ? undefined : activityTypeMap[key];
        return {
          key,
          label: type?.name ?? DEFAULT_ACTIVITY_NAME,
          color: type?.color ?? DEFAULT_ACTIVITY_COLOR,
          hours,
          percent: (hours / totalHours) * 100,
        };
      })
      .sort((a, b) => b.hours - a.hours);
  }, [activityTypeMap, taskMap, workIntervalsInRange]);

  const chartConfig = {
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(200, 200, 200, ${opacity})`,
    propsForLabels: {
      fontSize: 10,
    },
  } as const;

  return (
    <ScreenContainer style={styles.screenContainer}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>Analytics</Text>
        <Text style={styles.subtitle}>
          Your focus analytics will appear here once you start using the app.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date range</Text>
          <View style={styles.rangeRow}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rangeScrollContent}
            >
              {DATE_RANGE_OPTIONS.map((opt) => {
                const isActive = range === opt.key;
                const isCustom = opt.key === 'custom';

                const handlePress = () => {
                  if (isCustom && !isPro) {
                    Alert.alert('Pro feature', 'Custom date ranges are available in Pro.');
                    return;
                  }
                  setRange(opt.key);
                };

                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.rangePill,
                      isActive && styles.rangePillActive,
                      isCustom && !isPro && styles.rangePillLocked,
                    ]}
                    onPress={handlePress}
                  >
                    <Text
                      style={[
                        styles.rangePillLabel,
                        isActive && styles.rangePillLabelActive,
                      ]}
                    >
                      {opt.label}
                      {isCustom && !isPro ? ' 🔒' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        <View style={styles.taskFilterRow}>
          <Text style={styles.taskFilterLabel}>Task</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.taskFilterScroll}
          >
            <TouchableOpacity
              style={[
                styles.taskFilterPill,
                selectedTaskId === 'all' && styles.taskFilterPillActive,
              ]}
              onPress={() => setSelectedTaskId('all')}
            >
              <Text
                style={[
                  styles.taskFilterPillLabel,
                  selectedTaskId === 'all' && styles.taskFilterPillLabelActive,
                ]}
              >
                All tasks
              </Text>
            </TouchableOpacity>

            {selectableTasks.map((task) => (
              <TouchableOpacity
                key={task.id}
                style={[
                  styles.taskFilterPill,
                  selectedTaskId === task.id && styles.taskFilterPillActive,
                ]}
                onPress={() => setSelectedTaskId(task.id)}
              >
                <Text
                  style={[
                    styles.taskFilterPillLabel,
                    selectedTaskId === task.id && styles.taskFilterPillLabelActive,
                  ]}
                  numberOfLines={1}
                >
                  {task.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.dateTabsRow}>
          <View style={styles.dateTab}>
            <Text style={styles.dateTabLabel}>Start date</Text>
            <Text style={styles.dateTabValue}>{labelStart}</Text>
          </View>
          <View style={styles.dateTab}>
            <Text style={styles.dateTabLabel}>End date</Text>
            <Text style={styles.dateTabValue}>{labelEnd}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Total</Text>
          <View style={styles.totalRow}>
            <View style={styles.totalMetric}>
              <Image
                source={require('../../assets/tomato-happy.png')}
                style={styles.tomatoIcon}
              />
              <View>
                <Text style={styles.totalLabel}>Total Pomodoros</Text>
                <Text style={styles.totalValue}>{lifetimeCompletedWork}</Text>
              </View>
            </View>

            <View style={styles.totalMetric}>
              <Text style={styles.totalLabel}>Total Focus</Text>
              <Text style={styles.totalValue}>{lifetimeFocusHours.toFixed(1)}h</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Focus</Text>
          <Text style={styles.cardSubtitle}>Work focus in selected range</Text>

          <View style={styles.focusMetricsRow}>
            <View>
              <Text style={styles.focusMetricLabel}>Focus this range</Text>
              <Text style={styles.focusMetricValue}>{rangeFocusHours.toFixed(1)}h</Text>
            </View>
            <View>
              <Text style={styles.focusMetricLabel}>Completed pomos</Text>
              <Text style={styles.focusMetricValue}>{rangeCompletedWork}</Text>
            </View>
          </View>

          {stackedData.length === 0 ? (
            <Text style={styles.emptyText}>No work pomodoros in this range yet.</Text>
          ) : (
            <View style={styles.chartContainerCard}>
              <StackedBarChart
                data={{
                  labels: stackedLabels,
                  legend: stackedLegend,
                  data: stackedData,
                  barColors: stackedColors,
                }}
                width={chartWidth}
                height={220}
                chartConfig={chartConfig}
                style={{ borderRadius: 16 }}
              />
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Activity Type Ratio</Text>
          <Text style={styles.cardSubtitle}>Focus split by activity type</Text>

          {activityTypeRatio.length === 0 ? (
            <Text style={styles.emptyText}>No focus data for this range yet.</Text>
          ) : (
            <View style={styles.ratioList}>
              {activityTypeRatio.map((row) => (
                <View key={row.key} style={styles.ratioRow}>
                  <View
                    style={[
                      styles.ratioColorDot,
                      { backgroundColor: row.color },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ratioLabel}>{row.label}</Text>
                    <Text style={styles.ratioSubLabel}>
                      {row.hours.toFixed(1)}h · {row.percent.toFixed(0)}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pomodoro Details</Text>

          <View style={styles.pomoStatsRow}>
            <View style={styles.pomoStat}>
              <View style={styles.pomoStatHeader}>
                <Image
                  source={require('../../assets/tomato-happy.png')}
                  style={styles.tomatoIconSmall}
                />
                <Text style={styles.pomoStatLabel}>Completed</Text>
              </View>
              <Text style={styles.pomoStatValue}>{rangeCompletedWork}</Text>
            </View>

            <View style={styles.pomoStat}>
              <View style={styles.pomoStatHeader}>
                <Image
                  source={require('../../assets/tomato-withered.png')}
                  style={styles.tomatoIconSmall}
                />
                <Text style={styles.pomoStatLabel}>Skipped</Text>
              </View>
              <Text style={styles.pomoStatValue}>{rangeSkippedWork}</Text>
            </View>
          </View>

          <View style={styles.tomatoGrid}>
            {Array.from({ length: Math.min(rangeCompletedWork, 24) }, (_, idx) => (
              <Image
                key={`done-${idx}`}
                source={require('../../assets/tomato-happy.png')}
                style={styles.tomatoGridIcon}
              />
            ))}
            {Array.from({ length: Math.min(rangeSkippedWork, 8) }, (_, idx) => (
              <Image
                key={`skipped-${idx}`}
                source={require('../../assets/tomato-withered.png')}
                style={styles.tomatoGridIcon}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  rangeRow: {
    marginBottom: spacing.sm,
  },
  rangeScrollContent: {
    paddingHorizontal: spacing.xs,
  },
  rangePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.xs,
  },
  rangePillActive: {
    backgroundColor: colors.primary,
  },
  rangePillLocked: {
    opacity: 0.6,
  },
  rangePillLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  rangePillLabelActive: {
    color: colors.background,
  },
  dateTabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  dateTab: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.xs,
  },
  dateTabLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  dateTabValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  taskFilterRow: {
    marginBottom: spacing.sm,
  },
  taskFilterLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  taskFilterScroll: {
    paddingHorizontal: spacing.xs,
  },
  taskFilterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.xs,
    maxWidth: 160,
  },
  taskFilterPillActive: {
    backgroundColor: colors.accent,
  },
  taskFilterPillLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  taskFilterPillLabelActive: {
    color: colors.background,
    fontWeight: '600',
  },
  proHint: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: 13,
  },
  placeholderCard: {
    borderRadius: 16,
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  placeholderText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  chart: {
    borderRadius: 16,
  },
  chartCaption: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 12,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  cardSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalMetric: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tomatoIcon: {
    width: 32,
    height: 32,
    marginRight: spacing.sm,
  },
  tomatoIconSmall: {
    width: 20,
    height: 20,
    marginRight: spacing.xs,
  },
  totalLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  totalValue: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  focusMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  focusMetricLabel: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  focusMetricValue: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  chartContainerCard: {
    marginTop: spacing.sm,
  },
  ratioList: {
    marginTop: spacing.sm,
  },
  ratioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  ratioColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  ratioLabel: {
    color: colors.textPrimary,
    fontSize: 14,
  },
  ratioSubLabel: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  pomoStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  pomoStat: {
    flex: 1,
  },
  pomoStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pomoStatLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  pomoStatValue: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  tomatoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  tomatoGridIcon: {
    width: 24,
    height: 24,
    marginRight: 4,
    marginBottom: 4,
  },
});
