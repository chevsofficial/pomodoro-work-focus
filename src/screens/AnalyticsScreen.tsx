import React, { useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { ScreenContainer } from '../components/ScreenContainer';
import { RootStackParamList } from '../navigation/RootNavigator';
import { navigateToProUpsell } from '../navigation/proNavigation';
import { IntervalSession } from '../models';
import useAppStore, {
  useAnalyticsMinDate,
  useIsPro,
} from '../store/appStore';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

type AnalyticsRangeKey =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'previous_week'
  | 'this_month'
  | 'previous_month'
  | 'this_year'
  | 'previous_year'
  | 'all_time'
  | 'custom';

const PRO_ONLY_RANGE_KEYS: AnalyticsRangeKey[] = [
  'previous_week',
  'this_month',
  'previous_month',
  'this_year',
  'previous_year',
  'all_time',
  'custom',
];

const DATE_RANGE_OPTIONS: { key: AnalyticsRangeKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'this_week', label: 'This week' },
  { key: 'previous_week', label: 'Previous week' },
  { key: 'this_month', label: 'This month' },
  { key: 'previous_month', label: 'Previous month' },
  { key: 'this_year', label: 'This year' },
  { key: 'previous_year', label: 'Previous year' },
  { key: 'all_time', label: 'All data' },
  { key: 'custom', label: 'Custom' },
];

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

const endOfDay = (d: Date) => {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
};

const computePresetRange = (
  range: AnalyticsRangeKey,
  intervals: IntervalSession[],
): { rangeStart: Date; rangeEnd: Date } => {
  const now = new Date();
  const todayStart = startOfDay(now);

  if (range === 'today') {
    return { rangeStart: todayStart, rangeEnd: endOfDay(todayStart) };
  }

  if (range === 'yesterday') {
    const start = addDays(todayStart, -1);
    return { rangeStart: start, rangeEnd: endOfDay(start) };
  }

  if (range === 'this_week') {
    const start = startOfWeek(now);
    return { rangeStart: start, rangeEnd: endOfDay(todayStart) };
  }

  if (range === 'previous_week') {
    const thisWeekStart = startOfWeek(now);
    const prevWeekStart = addDays(thisWeekStart, -7);
    const prevWeekEnd = addDays(prevWeekStart, 6);
    return { rangeStart: prevWeekStart, rangeEnd: endOfDay(prevWeekEnd) };
  }

  if (range === 'this_month') {
    const start = startOfMonth(now);
    return { rangeStart: start, rangeEnd: endOfDay(todayStart) };
  }

  if (range === 'previous_month') {
    const thisMonthStart = startOfMonth(now);
    const prevMonthStart = new Date(
      thisMonthStart.getFullYear(),
      thisMonthStart.getMonth() - 1,
      1,
    );
    const prevMonthEnd = addDays(thisMonthStart, -1);
    return { rangeStart: prevMonthStart, rangeEnd: endOfDay(prevMonthEnd) };
  }

  if (range === 'this_year') {
    const start = startOfYear(now);
    return { rangeStart: start, rangeEnd: endOfDay(todayStart) };
  }

  if (range === 'previous_year') {
    const thisYearStart = startOfYear(now);
    const prevYearStart = new Date(thisYearStart.getFullYear() - 1, 0, 1);
    const prevYearEnd = new Date(thisYearStart.getFullYear() - 1, 11, 31);
    return { rangeStart: prevYearStart, rangeEnd: endOfDay(prevYearEnd) };
  }

  if (range === 'all_time' || range === 'custom') {
    if (intervals.length > 0) {
      const times = intervals.map((i) => new Date(i.startedAt).getTime());
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      const start = startOfDay(new Date(minTime));
      const end = endOfDay(new Date(maxTime));
      return { rangeStart: start, rangeEnd: end };
    }
    return { rangeStart: todayStart, rangeEnd: endOfDay(todayStart) };
  }

  return { rangeStart: todayStart, rangeEnd: endOfDay(todayStart) };
};

// IMPORTANT: named export must be called AnalyticsScreen
export const AnalyticsScreen: React.FC = () => {
  const [selectedRangeKey, setSelectedRangeKey] = useState<AnalyticsRangeKey>('this_week');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [activeCustomField, setActiveCustomField] = useState<'start' | 'end' | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState<Date>(new Date());

  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const isPro = useIsPro();
  const analyticsMinDate = useAnalyticsMinDate();
  const intervals = useAppStore((state) => state.intervals);
  const tasks = useAppStore((state) => state.tasks);
  const activityTypes = useAppStore((state) => state.activityTypes);

  const handleSelectRange = (key: AnalyticsRangeKey) => {
    if (!isPro && PRO_ONLY_RANGE_KEYS.includes(key)) {
      navigateToProUpsell(navigation);
      return;
    }

    if (key === 'custom') {
      if (!customStartDate || !customEndDate) {
        const today = new Date();
        setCustomStartDate(today);
        setCustomEndDate(today);
      }

      setSelectedRangeKey('custom');
      return;
    }

    setSelectedRangeKey(key);
  };

  const { rangeStart, rangeEnd } = useMemo(() => {
    if (selectedRangeKey === 'custom' && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);

      return { rangeStart: start, rangeEnd: end };
    }

    return computePresetRange(selectedRangeKey, intervals ?? []);
  }, [customEndDate, customStartDate, intervals, selectedRangeKey]);

  const { effectiveRangeStart, effectiveRangeEnd } = useMemo(() => {
    let effectiveStart = rangeStart;
    if (analyticsMinDate && rangeStart < analyticsMinDate) {
      effectiveStart = analyticsMinDate;
    }

    return { effectiveRangeStart: effectiveStart, effectiveRangeEnd: rangeEnd };
  }, [analyticsMinDate, rangeEnd, rangeStart]);

  const labelStart = useMemo(() => formatRangeDateLabel(rangeStart), [rangeStart]);
  const labelEnd = useMemo(() => formatRangeDateLabel(rangeEnd), [rangeEnd]);

  const workIntervals = useMemo(
    () =>
      (intervals ?? []).filter((i) => i.type === 'work' && !!i.startedAt),
    [intervals],
  );

  const filteredIntervals = useMemo(() => {
    if (!effectiveRangeStart || !effectiveRangeEnd) return [] as IntervalSession[];

    return (intervals ?? []).filter((interval) => {
      const startedAt = new Date(interval.startedAt);
      return startedAt >= effectiveRangeStart && startedAt <= effectiveRangeEnd;
    });
  }, [effectiveRangeEnd, effectiveRangeStart, intervals]);

  const workIntervalsInRange = useMemo(() => {
    return filteredIntervals.filter((i) => i.type === 'work' && !!i.startedAt);
  }, [filteredIntervals]);

  const lifetimeCompletedWork = useMemo(
    () =>
      workIntervals.filter((i) => !i.wasSkipped && i.endedAt).length,
    [workIntervals],
  );

  const lifetimeFocusSeconds = useMemo(
    () =>
      workIntervals
        .filter((i) => !i.wasSkipped && i.endedAt)
        .reduce((sum, i) => sum + i.durationSeconds, 0),
    [workIntervals],
  );

  const lifetimeFocusHours = lifetimeFocusSeconds / 3600;

  const rangeCompletedWork = useMemo(
    () =>
      workIntervalsInRange.filter((i) => !i.wasSkipped && i.endedAt).length,
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

  const totalRangeHours = useMemo(
    () => activityTypeRatio.reduce((sum, row) => sum + row.hours, 0),
    [activityTypeRatio],
  );
  const maxHours = Math.max(totalRangeHours, 0.1);

  return (
    <ScreenContainer>
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
                const isActive = selectedRangeKey === opt.key;
                const isLocked = !isPro && PRO_ONLY_RANGE_KEYS.includes(opt.key);
                const iconColor = isActive ? colors.background : colors.textSecondary;

                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.rangePill,
                      isActive && styles.rangePillActive,
                      isLocked && styles.rangePillLocked,
                    ]}
                    onPress={() => handleSelectRange(opt.key)}
                  >
                    <Text
                      style={[
                        styles.rangePillLabel,
                        isActive && styles.rangePillLabelActive,
                      ]}
                    >
                      {opt.label}
                    </Text>

                    {isLocked && (
                      <View style={styles.lockIconContainer}>
                        <Ionicons name="lock-closed" size={12} color={iconColor} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        <View style={styles.dateRow}>
          <View style={styles.dateColumn}>
            <Text style={styles.dateLabel}>Start</Text>
            <TouchableOpacity
              style={styles.dateValueButton}
              onPress={() => {
                if (!isPro || selectedRangeKey !== 'custom') {
                  navigateToProUpsell(navigation);
                  return;
                }
                const base = customStartDate ?? new Date();
                setPickerDate(base);
                setActiveCustomField('start');
                setShowDatePicker(true);
              }}
            >
              <Text style={styles.dateValueText}>
                {selectedRangeKey === 'custom'
                  ? customStartDate
                    ? customStartDate.toLocaleDateString()
                    : '-- / -- / --'
                  : labelStart}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dateColumn}>
            <Text style={styles.dateLabel}>End</Text>
            <TouchableOpacity
              style={styles.dateValueButton}
              onPress={() => {
                if (!isPro || selectedRangeKey !== 'custom') {
                  navigateToProUpsell(navigation);
                  return;
                }
                const base = customEndDate ?? customStartDate ?? new Date();
                setPickerDate(base);
                setActiveCustomField('end');
                setShowDatePicker(true);
              }}
            >
              <Text style={styles.dateValueText}>
                {selectedRangeKey === 'custom'
                  ? customEndDate
                    ? customEndDate.toLocaleDateString()
                    : '-- / -- / --'
                  : labelEnd}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.totalRow}>
            <View style={styles.totalColumn}>
              <Text style={styles.totalLabel}>Total Pomodoros</Text>
              <View style={styles.totalValueRow}>
                <Image
                  source={require('../../assets/tomato-happy.png')}
                  style={styles.tomatoIconLarge}
                  resizeMode="contain"
                />
                <Text style={styles.totalValue}>{lifetimeCompletedWork}</Text>
              </View>
            </View>

            <View style={styles.totalColumn}>
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
          </View>

          {totalRangeHours <= 0 ? (
            <Text style={styles.emptyText}>No work pomodoros in this range yet.</Text>
          ) : (
            <View style={styles.focusChartRow}>
              <View style={styles.focusYAxis}>
                {[1, 0.5, 0].map((fraction) => {
                  const value = maxHours * fraction;
                  return (
                    <View key={fraction} style={styles.yAxisLabelRow}>
                      <Text style={styles.yAxisLabel}>{value.toFixed(1)}h</Text>
                    </View>
                  );
                })}
              </View>

              <View style={styles.focusBarWrapper}>
                <View style={styles.focusBarBackground}>
                  {activityTypeRatio.map((row) => (
                    <View
                      key={row.key}
                      style={{
                        flex: row.hours || 0.0001,
                        backgroundColor: row.color,
                      }}
                    />
                  ))}
                </View>
              </View>
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
                  resizeMode="contain"
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
                  resizeMode="contain"
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
                resizeMode="contain"
              />
            ))}
            {Array.from({ length: Math.min(rangeSkippedWork, 8) }, (_, idx) => (
              <Image
                key={`skipped-${idx}`}
                source={require('../../assets/tomato-withered.png')}
                style={styles.tomatoGridIcon}
                resizeMode="contain"
              />
            ))}
          </View>
        </View>
      </ScrollView>

      {showDatePicker && activeCustomField && (
        <DateTimePicker
          mode="date"
          display="default"
          value={pickerDate}
          onChange={(event, date) => {
            if (event.type === 'dismissed' || !date) {
              setShowDatePicker(false);
              setActiveCustomField(null);
              return;
            }

            if (activeCustomField === 'start') {
              setCustomStartDate(date);
              if (!customEndDate || customEndDate < date) {
                setCustomEndDate(date);
              }
            } else if (activeCustomField === 'end') {
              if (customStartDate && date < customStartDate) {
                setCustomEndDate(customStartDate);
              } else {
                setCustomEndDate(date);
              }
            }

            setShowDatePicker(false);
            setActiveCustomField(null);
          }}
        />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  rangePillActive: {
    backgroundColor: colors.primary,
  },
  rangePillLocked: {
    opacity: 0.6,
  },
  lockIconContainer: {
    marginLeft: 4,
  },
  rangePillLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  rangePillLabelActive: {
    color: colors.background,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  dateColumn: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  dateLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  dateValueButton: {
    borderRadius: 12,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  dateValueText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
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
  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    width: '100%',
    alignSelf: 'stretch',
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
  totalColumn: {
    flex: 1,
  },
  tomatoIconSmall: {
    width: 28,
    height: 28,
    marginRight: spacing.xs,
  },
  tomatoIconLarge: {
    width: 48,
    height: 48,
    marginRight: spacing.sm,
  },
  totalLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: spacing.xs,
  },
  totalValue: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
  },
  totalValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: 20,
    fontWeight: '700',
  },
  focusChartRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: spacing.sm,
  },
  focusYAxis: {
    justifyContent: 'space-between',
    marginRight: spacing.md,
  },
  yAxisLabelRow: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  yAxisLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  focusBarWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  focusBarBackground: {
    width: 36,
    height: 160,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'column',
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
    width: 32,
    height: 32,
    margin: 4,
  },
});
