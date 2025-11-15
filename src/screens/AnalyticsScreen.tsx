import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ScreenContainer } from '../components/ScreenContainer';
import { colors } from '../theme/colors';
import { useAnalyticsStats, AnalyticsRange } from '../store/analyticsSelectors';

const TIME_RANGE_OPTIONS: { label: string; value: AnalyticsRange }[] = [
  { label: 'Today', value: 'today' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'All Time', value: 'all' },
];

const formatFocusTime = (seconds: number) => {
  if (seconds <= 0) {
    return '0m';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts = [] as string[];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }

  if (minutes > 0 || hours === 0) {
    parts.push(`${minutes}m`);
  }

  return parts.join(' ');
};

export const AnalyticsScreen: React.FC = () => {
  const [selectedRange, setSelectedRange] = useState<AnalyticsRange>('all');
  const stats = useAnalyticsStats(selectedRange);

  const statCards = useMemo(
    () => [
      { label: 'Completed Work Intervals', value: stats.completedWorkIntervals.toString() },
      { label: 'Skipped Intervals', value: stats.skippedIntervals.toString() },
      { label: 'Completed Tasks', value: stats.completedTasks.toString() },
      { label: 'Total Focus Time', value: formatFocusTime(stats.totalFocusSeconds) },
    ],
    [stats],
  );

  return (
    <ScreenContainer>
      <Text style={styles.title}>Analytics</Text>
      <Text style={styles.subtitle}>Review your productivity insights.</Text>
      <View style={styles.rangeContainer}>
        {TIME_RANGE_OPTIONS.map((option) => {
          const selected = option.value === selectedRange;
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.rangeChip, selected && styles.rangeChipSelected]}
              onPress={() => setSelectedRange(option.value)}
            >
              <Text style={[styles.rangeChipLabel, selected && styles.rangeChipLabelSelected]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.cardsContainer}>
        {statCards.map((card) => (
          <View key={card.label} style={styles.card}>
            <Text style={styles.cardLabel}>{card.label}</Text>
            <Text style={styles.cardValue}>{card.value}</Text>
          </View>
        ))}
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  rangeContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  rangeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    marginRight: 8,
    marginBottom: 8,
  },
  rangeChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  rangeChipLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  rangeChipLabelSelected: {
    color: colors.textPrimary,
  },
  cardsContainer: {
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
