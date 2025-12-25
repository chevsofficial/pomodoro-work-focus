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
import { AppColors } from '../theme/themes';
import { useThemeColors } from '../theme/useThemeColors';
import { getContrastingTextColor, withAlpha } from '../utils/color';

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

const getDatePickerTheme = (colors: AppColors) => {
  const selectedBg = colors.primary;
  const selectedText = getContrastingTextColor(selectedBg);
  const modalBg = colors.surface;
  const todayColor = colors.accent;

  return {
    modalBg,
    headerText: colors.textPrimary,
    weekDaysText: colors.textSecondary,
    dayText: colors.textPrimary,
    mutedText: colors.textMuted,
    selectedBg,
    selectedText,
    todayText: todayColor,
    todayOutline: todayColor,
    border: colors.border,
    rangeFill: withAlpha(colors.primary, 0.18),
  };
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
  const pickerTheme = useMemo(() => getDatePickerTheme(colors), [colors]);
  const styles = useMemo(
    () => createStyles(colors, pickerTheme),
    [colors, pickerTheme],
  );

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
              calendarTextStyle={{ color: pickerTheme.dayText }}
              headerTextStyle={{
                color: pickerTheme.headerText,
                fontWeight: '700',
              }}
              weekDaysTextStyle={{
                color: pickerTheme.weekDaysText,
                fontWeight: '600',
              }}
              selectedItemColor={pickerTheme.selectedBg}
              selectedTextStyle={{
                color: pickerTheme.selectedText,
                fontWeight: '700',
              }}
              todayTextStyle={{ color: pickerTheme.todayText, fontWeight: '700' }}
              dayContainerStyle={{ backgroundColor: 'transparent' }}
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

const createStyles = (
  colors: ReturnType<typeof useThemeColors>,
  pickerTheme: ReturnType<typeof getDatePickerTheme>,
) =>
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
      backgroundColor: pickerTheme.modalBg,
      borderRadius: 20,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: pickerTheme.border,
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: pickerTheme.headerText,
      marginBottom: spacing.md,
    },
    pickerWrapper: {
      marginBottom: spacing.lg,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: pickerTheme.border,
      padding: spacing.sm,
      backgroundColor: pickerTheme.modalBg,
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
