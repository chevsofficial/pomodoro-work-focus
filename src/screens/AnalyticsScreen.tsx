import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { RootStackParamList } from '../navigation/RootNavigator';
import { IntervalSession } from '../models';
import useAppStore from '../store/appStore';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

type DateRangeKey =
  | 'today'
  | 'yesterday'
  | 'thisWeek'
  | 'previousWeek'
  | 'last7'
  | 'thisMonth'
  | 'previousMonth'
  | 'last30'
  | 'thisYear'
  | 'previousYear'
  | 'all'
  | 'custom';

type ViewMode = 'summary' | 'graph' | 'pie';
type MetricUnit = 'workIntervals' | 'focusHours';

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
  } else if (range === 'last7') {
    start = addDays(todayStart, -6);
    end = addDays(todayStart, 1);
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
  } else if (range === 'last30') {
    start = addDays(todayStart, -29);
    end = addDays(todayStart, 1);
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
  const isPro = useAppStore((state) => state.isPro);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const intervals = useAppStore((state) => state.intervals);
  const tasks = useAppStore((state) => state.tasks);

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

    const filtered = intervals.filter((interval) => {
      const startedMs = new Date(interval.startedAt).getTime();
      return startedMs >= startMs && startedMs < endMs;
    });

    const completedWorkIntervals = filtered.filter(
      (i) => i.type === 'work' && !i.wasSkipped && i.endedAt,
    ).length;

    const skippedIntervals = filtered.filter((i) => i.wasSkipped).length;

    const totalFocusSeconds = filtered
      .filter((i) => i.type === 'work' && !i.wasSkipped && i.endedAt)
      .reduce((sum, i) => sum + i.durationSeconds, 0);

    const completedTasks = tasks.filter((t) => {
      if (!t.completedAt) return false;
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
  }, [intervals, tasks, range]);

  const graphData = useMemo(() => {
    if (filteredIntervals.length === 0) return [];

    const byDay: Record<
      string,
      { date: Date; workCount: number; focusSeconds: number }
    > = {};

    filteredIntervals.forEach((i) => {
      if (i.type !== 'work' || !i.endedAt || i.wasSkipped) return;

      const day = startOfDay(new Date(i.startedAt));
      const key = day.toISOString().slice(0, 10);

      if (!byDay[key]) {
        byDay[key] = { date: day, workCount: 0, focusSeconds: 0 };
      }

      byDay[key].workCount += 1;
      byDay[key].focusSeconds += i.durationSeconds;
    });

    const rows = Object.values(byDay).sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );

    return rows.map((row) => ({
      x: row.date,
      y:
        metricUnit === 'workIntervals'
          ? row.workCount
          : row.focusSeconds / 3600,
    }));
  }, [filteredIntervals, metricUnit]);

  const pieData = useMemo(() => {
    if (filteredIntervals.length === 0) return [];

    const aggregate = {
      work: { label: 'Work', workCount: 0, focusSeconds: 0 },
      short_break: { label: 'Short break', workCount: 0, focusSeconds: 0 },
      long_break: { label: 'Long break', workCount: 0, focusSeconds: 0 },
    };

    filteredIntervals.forEach((i) => {
      const bucket = aggregate[i.type as keyof typeof aggregate];
      if (!bucket) return;
      if (!i.endedAt || i.wasSkipped) return;

      if (i.type === 'work') {
        bucket.workCount += 1;
        bucket.focusSeconds += i.durationSeconds;
      } else {
        bucket.workCount += 1;
      }
    });

    const items = Object.values(aggregate);

    return items
      .filter((item) =>
        metricUnit === 'workIntervals'
          ? item.workCount > 0
          : item.focusSeconds > 0,
      )
      .map((item) => ({
        label: item.label,
        value:
          metricUnit === 'workIntervals'
            ? item.workCount
            : item.focusSeconds / 3600,
      }));
  }, [filteredIntervals, metricUnit]);

  const hasAnyData =
    stats.completedWorkIntervals > 0 ||
    stats.skippedIntervals > 0 ||
    stats.completedTasks > 0 ||
    stats.totalFocusSeconds > 0;

  const renderRangePill = (label: string, key: DateRangeKey) => (
    <TouchableOpacity
      key={label}
      style={[styles.rangePill, range === key && styles.rangePillActive]}
      onPress={() => setRange(key)}
    >
      <Text
        style={[styles.rangePillText, range === key && styles.rangePillTextActive]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer>
      <Text style={styles.title}>Analytics</Text>
      <Text style={styles.subtitle}>
        Your focus analytics will appear here once you start using the app.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Date range</Text>
        <View style={styles.rangeRow}>
          {renderRangePill('Today', 'today')}
          {renderRangePill('Yesterday', 'yesterday')}
          {renderRangePill('This week', 'thisWeek')}
          {renderRangePill('Previous week', 'previousWeek')}
          {renderRangePill('Last 7 days', 'last7')}
          {renderRangePill('This month', 'thisMonth')}
          {renderRangePill('Previous month', 'previousMonth')}
          {renderRangePill('Last 30 days', 'last30')}
          {renderRangePill('This year', 'thisYear')}
          {renderRangePill('Previous year', 'previousYear')}
          {renderRangePill('All data', 'all')}

          <TouchableOpacity
            style={[
              styles.rangePill,
              range === 'custom' && styles.rangePillActive,
              !isPro && styles.rangePillLocked,
            ]}
            onPress={() => {
              if (!isPro) {
                Alert.alert('Pro feature', 'Custom date ranges are available in Pro.');
                navigation.navigate('Paywall');
                return;
              }
              setRange('custom');
            }}
          >
            <Text
              style={[
                styles.rangePillText,
                range === 'custom' && styles.rangePillTextActive,
                !isPro && styles.rangePillTextLocked,
              ]}
            >
              Custom {!isPro && '🔒'}
            </Text>
          </TouchableOpacity>
        </View>
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
              {filteredIntervals.length === 0 ? (
                <Text style={styles.emptyText}>
                  Not enough data to display a graph.
                </Text>
              ) : (
                <Text style={styles.placeholderText}>
                  Graph view coming soon. Data points: {graphData.length}
                </Text>
              )}
            </View>
          )}

          {viewMode === 'pie' && (
            <View style={styles.statsCard}>
              {pieData.length === 0 ? (
                <Text style={styles.emptyText}>
                  Not enough data to display a pie chart.
                </Text>
              ) : (
                <Text style={styles.placeholderText}>
                  Pie chart view coming soon. Slices: {pieData.length}
                </Text>
              )}
            </View>
          )}
        </>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  rangePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rangePillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  rangePillPro: {
    borderColor: colors.primary,
  },
  rangePillLocked: {
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  rangePillText: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  rangePillTextActive: {
    color: colors.textOnPrimary,
  },
  rangePillTextPro: {
    color: colors.primary,
  },
  rangePillTextLocked: {
    color: colors.textSecondary,
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
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
