import React, { useEffect, useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker from 'react-native-ui-datepicker';
import { spacing } from '../theme/spacing';
import { useThemeColors } from '../theme/useThemeColors';

type Range = {
  startDate: Date;
  endDate: Date;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (range: Range) => void;
  initialStartDate: Date;
  initialEndDate: Date;
  minDate?: Date;
  maxDate?: Date;
  locale: 'es' | 'en';
  colors: ReturnType<typeof useThemeColors>;
  title: string;
  cancelLabel: string;
  applyLabel: string;
};

const toDate = (value: unknown, fallback: Date) => {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return fallback;
};

export const DateRangePickerModal: React.FC<Props> = ({
  visible,
  onClose,
  onConfirm,
  initialStartDate,
  initialEndDate,
  minDate,
  maxDate,
  locale,
  colors,
  title,
  cancelLabel,
  applyLabel,
}) => {
  const [startDate, setStartDate] = useState<Date>(initialStartDate);
  const [endDate, setEndDate] = useState<Date>(initialEndDate);
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    if (!visible) return;
    setStartDate(initialStartDate);
    setEndDate(initialEndDate);
  }, [initialEndDate, initialStartDate, visible]);

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <DateTimePicker
            mode="range"
            startDate={startDate}
            endDate={endDate}
            minDate={minDate}
            maxDate={maxDate}
            locale={locale}
            onChange={(params) => {
              const nextStart = toDate(params.startDate, startDate);
              const nextEnd = toDate(params.endDate ?? params.startDate, endDate);
              setStartDate(nextStart);
              setEndDate(nextEnd);
            }}
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => onConfirm({ startDate, endDate })}
            >
              <Text style={styles.applyButtonText}>{applyLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: spacing.md,
    },
    cancelButton: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      marginRight: spacing.sm,
    },
    cancelButtonText: {
      color: colors.textSecondary,
      fontWeight: '600',
    },
    applyButton: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      backgroundColor: colors.primary,
      borderRadius: 999,
    },
    applyButtonText: {
      color: colors.background,
      fontWeight: '700',
    },
  });
}
