import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from 'react-native-ui-datepicker';
import { spacing } from '../theme/spacing';
import { useThemeColors } from '../theme/useThemeColors';

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (range: { startDate: Date; endDate: Date }) => void;
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

const coerceDate = (value?: Date | string | number | null) => {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
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

  const handleApply = () => {
    const normalizedStart = startDate ?? initialStartDate;
    let normalizedEnd = endDate ?? initialEndDate ?? normalizedStart;

    if (normalizedEnd < normalizedStart) {
      normalizedEnd = normalizedStart;
    }

    onConfirm({ startDate: normalizedStart, endDate: normalizedEnd });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.modalWrapper}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>

          <View style={styles.pickerWrapper}>
            <DateTimePicker
              mode="range"
              startDate={startDate}
              endDate={endDate}
              onChange={({ startDate: nextStart, endDate: nextEnd }) => {
                const parsedStart = coerceDate(nextStart);
                const parsedEnd = coerceDate(nextEnd);

                if (parsedStart) {
                  setStartDate(parsedStart);
                }
                if (parsedEnd) {
                  setEndDate(parsedEnd);
                } else if (parsedStart && !parsedEnd) {
                  setEndDate(parsedStart);
                }
              }}
              minDate={minDate}
              maxDate={maxDate}
              locale={locale}
              calendarTextStyle={{ color: colors.textPrimary }}
              headerTextStyle={{ color: colors.textPrimary }}
              selectedItemColor={colors.primary}
              selectedTextStyle={{ color: colors.background }}
              todayTextStyle={{ color: colors.primary }}
              weekDaysTextStyle={{ color: colors.textSecondary }}
            />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleApply} style={styles.applyButton}>
              <Text style={styles.applyText}>{applyLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalWrapper: {
      flex: 1,
      justifyContent: 'center',
      padding: spacing.lg,
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
    pickerWrapper: {
      marginBottom: spacing.lg,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.sm,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: spacing.sm,
    },
    cancelButton: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: 999,
      backgroundColor: 'transparent',
    },
    cancelText: {
      color: colors.textSecondary,
      fontWeight: '600',
    },
    applyButton: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: 999,
      backgroundColor: colors.primary,
    },
    applyText: {
      color: colors.background,
      fontWeight: '700',
    },
  });
