import React, { useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DateRangePickerModal } from '../components/DateRangePickerModal';
import { ScreenContainer } from '../components/ScreenContainer';
import { RootStackParamList } from '../navigation/RootNavigator';
import { navigateToProUpsell } from '../navigation/proNavigation';
import { ACTIVITY_TYPE_COLORS, OTHER_ACTIVITY_TYPE_ID, OTHER_ACTIVITY_TYPE_LABEL } from '../config/activityTypeConstants';
import { IntervalSession, Task } from '../models';
import useAppStore, {
  useAnalyticsMinDate,
  useIsPro,
  useStreak,
} from '../store/appStore';
import {
  getAnalyticsDurationSeconds,
  MIN_ANALYTICS_INTERVAL_SECONDS,
} from '../utils/intervalUtils';
import { formatAnalyticsDate } from '../utils/dateFormatting';
import { spacing } from '../theme/spacing';
import { useThemeColors } from '../theme/useThemeColors';
import { t } from '../i18n/translations';

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

const getEffectiveActivityTypeId = (
  interval: IntervalSession,
  taskMapById: Record<string, Task | undefined>,
) => {
  const task = interval.taskId ? taskMapById[interval.taskId] : undefined;

  return interval.activityTypeId ?? task?.activityTypeId ?? OTHER_ACTIVITY_TYPE_ID;
};

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
  const [showRangeModal, setShowRangeModal] = useState(false);
  const [draftStart, setDraftStart] = useState<Date>(customStartDate ?? new Date());
  const [draftEnd, setDraftEnd] = useState<Date>(
    customEndDate ?? customStartDate ?? new Date(),
  );

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isPro = useIsPro();
  const streak = useStreak();
  const analyticsMinDate = useAnalyticsMinDate();
  const intervals = useAppStore((state) => state.intervals);
  const tasks = useAppStore((state) => state.tasks);
  const activityTypes = useAppStore((state) => state.activityTypes);
  const language = useAppStore((state) => state.language);
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const dateRangeOptions: { key: AnalyticsRangeKey; label: string }[] = [
    { key: 'today', label: t('analytics.rangeToday') },
    { key: 'yesterday', label: t('analytics.rangeYesterday') },
    { key: 'this_week', label: t('analytics.rangeWeek') },
    { key: 'previous_week', label: t('analytics.rangePreviousWeek') },
    { key: 'this_month', label: t('analytics.rangeMonth') },
    { key: 'previous_month', label: t('analytics.rangePreviousMonth') },
    { key: 'this_year', label: t('analytics.rangeYear') },
    { key: 'previous_year', label: t('analytics.rangePreviousYear') },
    { key: 'all_time', label: t('analytics.rangeAllTime') },
    { key: 'custom', label: t('analytics.rangeCustom') },
  ];
  const defaultActivityName = t('tasks.add.none');

  const freezeUsesLeftThisWeek = isPro
    ? Math.max(0, 1 - (streak.freezeUsesThisWeek ?? 0))
    : 0;

  const handleSelectRange = (key: AnalyticsRangeKey) => {
    if (!isPro && PRO_ONLY_RANGE_KEYS.includes(key)) {
      navigateToProUpsell(navigation);
      return;
    }

    if (key === 'custom') {
      const today = new Date();
      const start = customStartDate ?? today;
      const end = customEndDate ?? start;
      setDraftStart(start);
      setDraftEnd(end);
      setSelectedRangeKey('custom');
      setShowRangeModal(true);
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

  const labelStart = useMemo(() => formatAnalyticsDate(rangeStart), [rangeStart]);
  const labelEnd = useMemo(() => formatAnalyticsDate(rangeEnd), [rangeEnd]);

  const analyticsIntervals = useMemo(
    () =>
      (intervals ?? []).filter((interval) => {
        if (!interval.endedAt) return false;

        const analyticsSeconds = getAnalyticsDurationSeconds(interval);
        if (interval.wasSkipped && analyticsSeconds < MIN_ANALYTICS_INTERVAL_SECONDS) {
          return false;
        }

        return true;
      }),
    [intervals],
  );

  const workIntervals = useMemo(
    () => analyticsIntervals.filter((i) => i.type === 'work' && !!i.startedAt),
    [analyticsIntervals],
  );

  const filteredIntervals = useMemo(() => {
    if (!effectiveRangeStart || !effectiveRangeEnd) return [] as IntervalSession[];

    return analyticsIntervals.filter((interval) => {
      const startedAt = new Date(interval.startedAt);
      return startedAt >= effectiveRangeStart && startedAt <= effectiveRangeEnd;
    });
  }, [analyticsIntervals, effectiveRangeEnd, effectiveRangeStart]);

  const workIntervalsInRange = useMemo(() => {
    return filteredIntervals.filter((i) => i.type === 'work' && !!i.startedAt);
  }, [filteredIntervals]);

  const lifetimeCompletedWork = useMemo(
    () => workIntervals.filter((i) => !i.wasSkipped && i.endedAt).length,
    [workIntervals],
  );

  const lifetimeFocusSeconds = useMemo(
    () =>
      workIntervals
        .filter((i) => !i.wasSkipped && i.endedAt)
        .reduce((sum, i) => sum + getAnalyticsDurationSeconds(i), 0),
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
        .reduce((sum, i) => sum + getAnalyticsDurationSeconds(i), 0),
    [workIntervalsInRange],
  );

  const rangeFocusHours = rangeFocusSeconds / 3600;

  const activityTypeMap = useMemo(() => {
    const entries = activityTypes.map((type) => [type.id, type] as const);
    return Object.fromEntries(entries) as Record<string, (typeof activityTypes)[number]>;
  }, [activityTypes]);

  const taskMap = useMemo(() => {
    const map: Record<string, (typeof tasks)[number] | undefined> = {};
    tasks.forEach((task) => {
      map[task.id] = task;
    });
    return map;
  }, [tasks]);

  const focusByActivityType = useMemo(() => {
    const totals: Record<string, number> = {};

    for (const interval of workIntervalsInRange) {
      if (interval.wasSkipped || !interval.endedAt) continue;

      const activityId = getEffectiveActivityTypeId(interval, taskMap);
      const hours = getAnalyticsDurationSeconds(interval) / 3600;

      totals[activityId] = (totals[activityId] ?? 0) + hours;
    }

    return totals;
  }, [taskMap, workIntervalsInRange]);

  const totalRangeHours = useMemo(
    () => Object.values(focusByActivityType).reduce((sum, v) => sum + v, 0),
    [focusByActivityType],
  );

  const activityTypeRatio = useMemo(() => {
    return Object.entries(focusByActivityType)
      .filter(([, hours]) => hours > 0)
      .map(([activityTypeId, hours]) => {
        const type = activityTypeMap[activityTypeId];
        const label =
          activityTypeId === OTHER_ACTIVITY_TYPE_ID
            ? OTHER_ACTIVITY_TYPE_LABEL
            : type?.name ?? defaultActivityName;
        const color =
          type?.color ??
          ACTIVITY_TYPE_COLORS[activityTypeId] ??
          ACTIVITY_TYPE_COLORS[OTHER_ACTIVITY_TYPE_ID];

        return {
          key: activityTypeId,
          label,
          color,
          hours,
          percent: totalRangeHours > 0 ? (hours / totalRangeHours) * 100 : 0,
          isArchived: !!type?.archivedAt,
        };
      })
      .sort((a, b) => b.hours - a.hours);
  }, [activityTypeMap, defaultActivityName, focusByActivityType, totalRangeHours]);

  const focusBarSegments = useMemo(() => {
    if (totalRangeHours <= 0) return [] as { key: string; color: string; fraction: number }[];

    return activityTypeRatio.map((row) => ({
      key: row.key,
      color: row.color,
      fraction: row.hours / totalRangeHours,
    }));
  }, [activityTypeRatio, totalRangeHours]);
  const maxHours = Math.max(totalRangeHours, 0.1);

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>{t('analytics.title')}</Text>
        <Text style={styles.subtitle}>{t('analytics.subtitle')}</Text>

        <View style={styles.card}>
          <View style={styles.totalRow}>
            <View style={styles.totalColumn}>
              <Text style={styles.totalLabel}>{t('analytics.totalPomodoros')}</Text>
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
              <Text style={styles.totalLabel}>{t('analytics.totalFocus')}</Text>
              <Text style={styles.totalValue}>{lifetimeFocusHours.toFixed(1)}h</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.streakCard}>
            <Text style={styles.sectionTitle}>{t('analytics.streakTitle')}</Text>

            <View style={styles.streakRow}>
              <View style={styles.streakCol}>
                <Text style={styles.streakValue}>
                  {t('analytics.streakDays').replace('{count}', streak.currentStreak.toString())}
                </Text>
                <Text style={styles.streakLabel}>{t('analytics.streakCurrent')}</Text>
              </View>
              <View style={styles.streakCol}>
                <Text style={styles.streakValue}>
                  {t('analytics.streakDays').replace('{count}', streak.bestStreak.toString())}
                </Text>
                <Text style={styles.streakLabel}>{t('analytics.streakBest')}</Text>
              </View>
            </View>

            {isPro ? (
              <Text style={styles.streakHint}>
                {freezeUsesLeftThisWeek > 0
                  ? t('analytics.streakFreezeAvailable').replace(
                      '{count}',
                      freezeUsesLeftThisWeek.toString(),
                    )
                  : t('analytics.streakFreezeUsed')}
              </Text>
            ) : (
              <TouchableOpacity onPress={() => navigateToProUpsell(navigation)}>
                <Text style={styles.streakProHint}>{t('analytics.streakFreezeUpsell')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('analytics.dateRangeTitle')}</Text>
          <View style={styles.rangeRow}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rangeScrollContent}
            >
              {dateRangeOptions.map((opt) => {
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
            <Text style={styles.dateLabel}>{t('analytics.dateStart')}</Text>
            <TouchableOpacity
              style={styles.dateValueButton}
              onPress={() => {
                if (!isPro && selectedRangeKey !== 'custom') {
                  navigateToProUpsell(navigation);
                  return;
                }
                const today = new Date();
                const start = customStartDate ?? today;
                const end = customEndDate ?? start;
                setDraftStart(start);
                setDraftEnd(end);
                setShowRangeModal(true);
              }}
            >
              <Text style={styles.dateValueText}>
                {selectedRangeKey === 'custom'
                  ? customStartDate
                    ? formatAnalyticsDate(customStartDate)
                    : '-- / -- / --'
                  : labelStart}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dateColumn}>
            <Text style={styles.dateLabel}>{t('analytics.dateEnd')}</Text>
            <TouchableOpacity
              style={styles.dateValueButton}
              onPress={() => {
                if (!isPro && selectedRangeKey !== 'custom') {
                  navigateToProUpsell(navigation);
                  return;
                }
                const today = new Date();
                const start = customStartDate ?? today;
                const end = customEndDate ?? start;
                setDraftStart(start);
                setDraftEnd(end);
                setShowRangeModal(true);
              }}
            >
              <Text style={styles.dateValueText}>
                {selectedRangeKey === 'custom'
                  ? customEndDate
                    ? formatAnalyticsDate(customEndDate)
                    : '-- / -- / --'
                  : labelEnd}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('analytics.focusCardTitle')}</Text>
          <Text style={styles.cardSubtitle}>{t('analytics.focusCardSubtitle')}</Text>

          <View style={styles.focusMetricsRow}>
            <View>
              <Text style={styles.focusMetricLabel}>{t('analytics.focusThisRange')}</Text>
              <Text style={styles.focusMetricValue}>{rangeFocusHours.toFixed(1)}h</Text>
            </View>
          </View>

          {totalRangeHours <= 0 ? (
            <Text style={styles.emptyText}>{t('analytics.emptyRange')}</Text>
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
                  {focusBarSegments.map((segment) => (
                    <View
                      key={segment.key}
                      style={{
                        flex: segment.fraction,
                        backgroundColor: segment.color,
                      }}
                    />
                  ))}
                </View>
              </View>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('analytics.activityRatioTitle')}</Text>
          <Text style={styles.cardSubtitle}>{t('analytics.activityRatioSubtitle')}</Text>

          {activityTypeRatio.length === 0 ? (
            <Text style={styles.emptyText}>{t('analytics.activityRatioEmpty')}</Text>
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
                  <View style={styles.ratioContent}>
                    <Text style={styles.ratioLabel}>
                      {row.label}
                      {row.isArchived && (
                        <Text style={styles.ratioArchivedTag}>{`  ${t('analytics.archivedTag')}`}</Text>
                      )}
                    </Text>
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
          <Text style={styles.cardTitle}>{t('analytics.detailsTitle')}</Text>

          <View style={styles.pomoStatsRow}>
            <View style={styles.pomoStat}>
              <View style={styles.pomoStatHeader}>
                <Image
                  source={require('../../assets/tomato-happy.png')}
                  style={styles.tomatoIconSmall}
                  resizeMode="contain"
                />
                <Text style={styles.pomoStatLabel}>{t('analytics.completedLabel')}</Text>
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
                <Text style={styles.pomoStatLabel}>{t('analytics.skippedLabel')}</Text>
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

      <DateRangePickerModal
        visible={showRangeModal}
        onClose={() => setShowRangeModal(false)}
        onConfirm={({ startDate, endDate }) => {
          let normalizedEnd = endDate;
          if (normalizedEnd < startDate) {
            normalizedEnd = startDate;
          }
          setSelectedRangeKey('custom');
          setCustomStartDate(startDate);
          setCustomEndDate(normalizedEnd);
          setShowRangeModal(false);
        }}
        initialStartDate={draftStart}
        initialEndDate={draftEnd}
        minDate={analyticsMinDate ?? undefined}
        maxDate={new Date()}
        locale={language === 'es' ? 'es' : 'en'}
        colors={colors}
        title={t('analytics.rangeCustom')}
        cancelLabel={t('common.cancel')}
        applyLabel={t('common.apply')}
      />
    </ScreenContainer>
  );
};

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
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
    streakCard: {
      borderRadius: 16,
      padding: spacing.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    streakRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing.sm,
    },
    streakCol: {
      flex: 1,
    },
    streakValue: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    streakLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    streakHint: {
      marginTop: spacing.sm,
      fontSize: 12,
      color: colors.textSecondary,
    },
    streakProHint: {
      marginTop: spacing.sm,
      fontSize: 12,
      color: colors.primary,
      fontWeight: '600',
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
      borderColor: colors.border,
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
    ratioContent: {
      flex: 1,
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
    ratioArchivedTag: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'uppercase',
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
}
