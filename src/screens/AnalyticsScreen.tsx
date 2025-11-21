import React, { useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';
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

type ViewMode = 'summary' | 'graph' | 'pie';
type MetricUnit = 'workIntervals' | 'focusHours';
type TaskFilterId = 'all' | string;

const PIE_COLORS = ['#FF5A5F', '#4CAF50', '#FFC107'];
const screenWidth = Dimensions.get('window').width;
const CHART_HORIZONTAL_MARGIN = 24;
const chartWidth = screenWidth - CHART_HORIZONTAL_MARGIN * 2;

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
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [metricUnit, setMetricUnit] = useState<MetricUnit>('workIntervals');
  const [selectedTaskId, setSelectedTaskId] = useState<TaskFilterId>('all');
  const isPro = useAppStore((state) => state.isPro);
  const intervals = useAppStore((state) => state.intervals);
  const tasks = useAppStore((state) => state.tasks);

  const selectableTasks = useMemo(
    () => tasks.filter((t) => !t.deletedAt),
    [tasks],
  );

  const { filteredIntervals, stats, dateLabels } = useMemo(() => {
    if (!intervals || intervals.length === 0) {
      const now = new Date();
      const todayLabel = formatRangeDateLabel(startOfDay(now));
      return {
        filteredIntervals: [] as IntervalSession[],
        stats: {
          completedWorkIntervals: 0,
          skippedIntervals: 0,
          completedTasks: 0,
          totalFocusSeconds: 0,
        },
        dateLabels: {
          start: todayLabel,
          end: todayLabel,
        },
      };
    }

    const { startMs, endMs, labelStart, labelEnd } = getRangeBounds(
      range,
      intervals,
    );

    const filteredByDate = intervals.filter((interval) => {
      const startedMs = new Date(interval.startedAt).getTime();
      return startedMs >= startMs && startedMs < endMs;
    });

    const filtered =
      selectedTaskId === 'all'
        ? filteredByDate
        : filteredByDate.filter((i) => i.taskId === selectedTaskId);

    const completedWorkIntervals = filtered.filter(
      (i) => i.type === 'work' && !i.wasSkipped && i.endedAt,
    ).length;

    const skippedIntervals = filtered.filter((i) => i.wasSkipped).length;

    const totalFocusSeconds = filtered
      .filter((i) => i.type === 'work' && !i.wasSkipped && i.endedAt)
      .reduce((sum, i) => sum + i.durationSeconds, 0);

    const completedTasks = tasks.filter((t) => {
      if (!t.completedAt) return false;
      if (selectedTaskId !== 'all' && t.id !== selectedTaskId) return false;
      const completedMs = new Date(t.completedAt).getTime();
      return completedMs >= startMs && completedMs < endMs;
    }).length;

    return {
      filteredIntervals: filtered,
      stats: {
        completedWorkIntervals,
        skippedIntervals,
        completedTasks,
        totalFocusSeconds,
      },
      dateLabels: {
        start: labelStart,
        end: labelEnd,
      },
    };
  }, [intervals, tasks, range, selectedTaskId]);

  const graphData = useMemo(() => {
    if (filteredIntervals.length === 0) return [];

    const byDay: Record<
      string,
      { label: string; workCount: number; focusSeconds: number }
    > = {};

    filteredIntervals.forEach((i) => {
      if (i.type !== 'work' || !i.endedAt || i.wasSkipped) return;

      const day = startOfDay(new Date(i.startedAt));
      const key = day.toISOString().slice(0, 10);

      if (!byDay[key]) {
        byDay[key] = {
          label: day.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          }),
          workCount: 0,
          focusSeconds: 0,
        };
      }

      byDay[key].workCount += 1;
      byDay[key].focusSeconds += i.durationSeconds;
    });

    return Object.values(byDay)
      .sort((a, b) => a.label.localeCompare(b.label))
      .map((row) => ({
        label: row.label,
        y:
          metricUnit === 'workIntervals'
            ? row.workCount
            : row.focusSeconds / 3600,
      }));
  }, [filteredIntervals, metricUnit]);

  const graphLabels = graphData.map((d) => d.label);
  const graphValues = graphData.map((d) => d.y);

  const pieData = useMemo(() => {
    if (filteredIntervals.length === 0) return [];

    const aggregate = {
      work: { label: 'Work', count: 0, seconds: 0 },
      short_break: { label: 'Short break', count: 0, seconds: 0 },
      long_break: { label: 'Long break', count: 0, seconds: 0 },
    };

    filteredIntervals.forEach((i) => {
      const bucket = aggregate[i.type as keyof typeof aggregate];
      if (!bucket) return;
      if (!i.endedAt || i.wasSkipped) return;

      bucket.count += 1;
      bucket.seconds += i.durationSeconds;
    });

    return Object.values(aggregate)
      .filter((item) =>
        metricUnit === 'workIntervals'
          ? item.count > 0
          : item.seconds > 0,
      )
      .map((item) => ({
        label: item.label,
        value:
          metricUnit === 'workIntervals'
            ? item.count
            : item.seconds / 3600,
      }));
  }, [filteredIntervals, metricUnit]);

  const pieChartData = pieData.map((item, index) => ({
    name: item.label,
    population: item.value,
    color: PIE_COLORS[index % PIE_COLORS.length],
    legendFontColor: colors.textPrimary,
    legendFontSize: 12,
  }));

  const chartConfig = {
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    decimalPlaces: metricUnit === 'focusHours' ? 1 : 0,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(200, 200, 200, ${opacity})`,
    propsForLabels: {
      fontSize: 10,
    },
  } as const;

  const hasAnyData =
    stats.completedWorkIntervals > 0 ||
    stats.skippedIntervals > 0 ||
    stats.completedTasks > 0 ||
    stats.totalFocusSeconds > 0;

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
            <Text style={styles.dateTabValue}>{dateLabels.start}</Text>
          </View>
          <View style={styles.dateTab}>
            <Text style={styles.dateTabLabel}>End date</Text>
            <Text style={styles.dateTabValue}>{dateLabels.end}</Text>
          </View>
        </View>

        <View style={styles.viewModeRow}>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'summary' && styles.viewModeButtonActive]}
            onPress={() => setViewMode('summary')}
          >
            <Text
              style={[styles.viewModeLabel, viewMode === 'summary' && styles.viewModeLabelActive]}
            >
              Summary
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'graph' && styles.viewModeButtonActive]}
            onPress={() => setViewMode('graph')}
          >
            <Text
              style={[styles.viewModeLabel, viewMode === 'graph' && styles.viewModeLabelActive]}
            >
              Graph
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'pie' && styles.viewModeButtonActive]}
            onPress={() => setViewMode('pie')}
          >
            <Text
              style={[styles.viewModeLabel, viewMode === 'pie' && styles.viewModeLabelActive]}
            >
              Pie
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.unitRow}>
          <TouchableOpacity
            style={[styles.unitButton, metricUnit === 'workIntervals' && styles.unitButtonActive]}
            onPress={() => setMetricUnit('workIntervals')}
          >
            <Text
              style={[styles.unitLabel, metricUnit === 'workIntervals' && styles.unitLabelActive]}
            >
              Work intervals
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.unitButton, metricUnit === 'focusHours' && styles.unitButtonActive]}
            onPress={() => setMetricUnit('focusHours')}
          >
            <Text
              style={[styles.unitLabel, metricUnit === 'focusHours' && styles.unitLabelActive]}
            >
              Focus time (h)
            </Text>
          </TouchableOpacity>
        </View>

        {!hasAnyData ? (
          <View style={styles.placeholderCard}>
            <Text style={styles.placeholderTitle}>No data yet</Text>
            <Text style={styles.placeholderText}>
              Complete a few pomodoro sessions and check back to see your productivity stats.
            </Text>
          </View>
        ) : (
          <>
            {viewMode === 'summary' && (
              <View style={styles.statsCard}>
                <Text style={styles.statsTitle}>Summary</Text>
                <Text style={styles.statsRow}>
                  Completed work intervals: {stats.completedWorkIntervals}
                </Text>
                <Text style={styles.statsRow}>
                  Skipped intervals: {stats.skippedIntervals}
                </Text>
                <Text style={styles.statsRow}>Completed tasks: {stats.completedTasks}</Text>
                <Text style={styles.statsRow}>
                  Total focus time: {Math.round(stats.totalFocusSeconds / 60)} minutes
                </Text>
                <Text style={styles.statsMeta}>
                  Intervals in range: {filteredIntervals.length}
                </Text>
              </View>
            )}

            {viewMode === 'graph' && (
              <View style={styles.statsCard}>
                {filteredIntervals.length === 0 || graphData.length === 0 ? (
                  <Text style={styles.emptyText}>
                    Not enough data to display a graph.
                  </Text>
                ) : (
                  <View style={styles.chartContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <BarChart
                        data={{
                          labels: graphLabels,
                          datasets: [{ data: graphValues }],
                        }}
                        width={Math.max(chartWidth, graphLabels.length * 40)}
                        height={220}
                        fromZero
                        chartConfig={chartConfig}
                        style={{ borderRadius: 16, alignSelf: 'center' }}
                        showValuesOnTopOfBars
                        yAxisLabel=""
                        yAxisSuffix={metricUnit === 'focusHours' ? 'h' : ''}
                      />
                    </ScrollView>
                  </View>
                )}
              </View>
            )}

            {viewMode === 'pie' && (
              <View style={styles.statsCard}>
                {pieChartData.length === 0 ? (
                  <Text style={styles.emptyText}>
                    Not enough data to display a pie chart.
                  </Text>
                ) : (
                  <View style={styles.chartContainer}>
                    <PieChart
                      data={pieChartData}
                      width={chartWidth}
                      height={220}
                      chartConfig={chartConfig}
                      accessor="population"
                      backgroundColor="transparent"
                      paddingLeft="16"
                      absolute={metricUnit === 'workIntervals'}
                      style={{ alignSelf: 'center' }}
                    />
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: 14,
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
    fontWeight: '500',
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
  viewModeRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.xs,
    marginBottom: spacing.md,
  },
  viewModeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 12,
  },
  viewModeButtonActive: {
    backgroundColor: colors.primary,
  },
  viewModeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  viewModeLabelActive: {
    color: colors.background,
  },
  unitRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  unitButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: spacing.xs,
    marginHorizontal: spacing.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surface,
  },
  unitButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  unitLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  unitLabelActive: {
    color: colors.textPrimary,
    fontWeight: '600',
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
  statsCard: {
    borderRadius: 16,
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  statsRow: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  statsMeta: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: colors.textSecondary,
  },
  chartContainer: {
    marginTop: spacing.sm,
    marginHorizontal: CHART_HORIZONTAL_MARGIN,
    borderRadius: 16,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  emptyText: {
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
});
