import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { RootStackParamList } from '../navigation/RootNavigator';
import { IntervalSession } from '../models';
import useAppStore, { useIsPro } from '../store/appStore';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

// Loosen typing so we can safely use `key` on these elements without TS complaining
const AnyView = View as any;
const AnyTouchableOpacity = TouchableOpacity as any;

type DateRangeKey = 'last7' | 'last30';

const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const addDays = (date: Date, days: number) => {
  const clone = new Date(date);
  clone.setDate(clone.getDate() + days);
  return clone;
};

// IMPORTANT: named export must be called AnalyticsScreen
export const AnalyticsScreen: React.FC = () => {
  const [range, setRange] = useState<DateRangeKey>('last7');
  const isPro = useIsPro();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const intervals = useAppStore((state) => state.intervals);
  const tasks = useAppStore((state) => state.tasks);

  const { filteredIntervals, stats } = useMemo(() => {
    if (!intervals || intervals.length === 0) {
      return {
        filteredIntervals: [] as IntervalSession[],
        stats: {
          completedWorkIntervals: 0,
          skippedIntervals: 0,
          completedTasks: 0,
          totalFocusSeconds: 0,
        },
      };
    }

    const todayStart = startOfToday();
    const todayEnd = addDays(todayStart, 1);

    const rangeStart =
      range === 'last7'
        ? addDays(todayStart, -6)
        : addDays(todayStart, -29);

    const rangeStartMs = rangeStart.getTime();
    const rangeEndMs = todayEnd.getTime();

    const filtered = intervals.filter((interval) => {
      const startedMs = new Date(interval.startedAt).getTime();
      return startedMs >= rangeStartMs && startedMs < rangeEndMs;
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
      return completedMs >= rangeStartMs && completedMs < rangeEndMs;
    }).length;

    return {
      filteredIntervals: filtered,
      stats: {
        completedWorkIntervals,
        skippedIntervals,
        completedTasks,
        totalFocusSeconds,
      },
    };
  }, [intervals, tasks, range]);

  const handleUpgradePress = () => {
    navigation.navigate('Paywall');
  };

  const hasAnyData =
    stats.completedWorkIntervals > 0 ||
    stats.skippedIntervals > 0 ||
    stats.completedTasks > 0 ||
    stats.totalFocusSeconds > 0;

  const baseRanges: { label: string; key: DateRangeKey }[] = [
    { label: 'Last 7 days', key: 'last7' },
    { label: 'Last 30 days', key: 'last30' },
  ];
  const advancedRanges = ['Last 90 days', 'Custom range'];

  return (
    <ScreenContainer>
      <Text style={styles.title}>Analytics</Text>
      <Text style={styles.subtitle}>
        Your focus analytics will appear here once you start using the app.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Date range</Text>
        <View style={styles.rangeRow}>
          {baseRanges.map(({ label, key }) => (
            <TouchableOpacity
              key={label}
              style={[styles.rangePill, range === key && styles.rangePillActive]}
              onPress={() => setRange(key)}
            >
              <Text
                style={[
                  styles.rangePillText,
                  range === key && styles.rangePillTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}

          {isPro
            ? advancedRanges.map((label) => (
                <AnyView
                  key={label}
                  style={[styles.rangePill, styles.rangePillPro]}
                >
                  <Text style={[styles.rangePillText, styles.rangePillTextPro]}>
                    {label}
                  </Text>
                </AnyView>
              ))
            : (
                <AnyTouchableOpacity
                  key="pro-lock"
                  style={[styles.rangePill, styles.rangePillLocked]}
                  onPress={handleUpgradePress}
                >
                  <Text
                    style={[styles.rangePillText, styles.rangePillTextLocked]}
                  >
                    Custom range · Pro
                  </Text>
                </AnyTouchableOpacity>
              )}
        </View>
        {!isPro && (
          <Text style={styles.proHint}>
            Unlock advanced date ranges and more insights with Pomodoro Focus Pro.
          </Text>
        )}
      </View>

      <Text>Intervals in store: {intervals.length}</Text>
      <Text>Tasks in store: {tasks.length}</Text>

      {!hasAnyData ? (
        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderTitle}>No data yet</Text>
          <Text style={styles.placeholderText}>
            Complete a few pomodoro sessions and check back to see your productivity stats.
          </Text>
        </View>
      ) : (
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Summary</Text>
          <Text style={styles.statsRow}>
            Completed work intervals: {stats.completedWorkIntervals}
          </Text>
          <Text style={styles.statsRow}>Skipped intervals: {stats.skippedIntervals}</Text>
          <Text style={styles.statsRow}>Completed tasks: {stats.completedTasks}</Text>
          <Text style={styles.statsRow}>
            Total focus time: {Math.round(stats.totalFocusSeconds / 60)} minutes
          </Text>
          <Text style={styles.statsMeta}>Intervals in range: {filteredIntervals.length}</Text>
        </View>
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
});
