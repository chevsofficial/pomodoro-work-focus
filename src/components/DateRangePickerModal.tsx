import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, { DateType, useDefaultStyles } from 'react-native-ui-datepicker';
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

const toJSDate = (value: DateType): Date | null => {
  if (value == null) return null;

  if (value instanceof Date) return value;

  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const maybe: any = value;
  if (typeof maybe?.toDate === 'function') {
    const d = maybe.toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
  }

  try {
    const d = new Date(maybe);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
};

const getContrastingTextColor = (bgHex: string) => {
  const hex = (bgHex || '').replace('#', '');
  if (hex.length !== 6) return '#FFFFFF';

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? '#0F172A' : '#FFFFFF';
};

const withAlpha = (hex: string, alpha: number) => {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;

  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');

  return `#${clean}${a}`;
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
  const defaultStyles = useDefaultStyles();

  // Keep state as DateType (picker may return Dayjs)
  const [startDate, setStartDate] = useState<DateType>(initialStartDate);
  const [endDate, setEndDate] = useState<DateType>(initialEndDate);

  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    if (!visible) return;
    setStartDate(initialStartDate);
    setEndDate(initialEndDate);
  }, [initialEndDate, initialStartDate, visible]);

  const selectedLabelColor = useMemo(
    () => getContrastingTextColor(colors.primary),
    [colors.primary],
  );

  // Use a subtle tint for the range fill so day numbers stay readable
  const rangeFillBg = useMemo(
    () => withAlpha(colors.primary, 0.18),
    [colors.primary],
  );

  const pickerStyles = useMemo(() => {
    const base: any = { ...defaultStyles };

    const merge = (key: string, value: any) => {
      base[key] = { ...(base[key] ?? {}), ...value };
    };

    // ---- Base surfaces ----
    merge('header', { backgroundColor: colors.surface });
    merge('weekdays', { backgroundColor: colors.surface });
    merge('days', { backgroundColor: colors.surface });

    // Ensure day cell itself doesn't force a dark bg
    merge('day_cell', { backgroundColor: 'transparent' });
    merge('day', { backgroundColor: 'transparent' });

    // ---- Header month/year label (THIS fixes the black month text) ----
    // Your version uses month_selector_label / year_selector_label keys.
    const headerLabelStyle = {
      color: colors.textPrimary,
      fontWeight: '700',
      textTransform: 'capitalize' as const, // makes "diciembre" -> "Diciembre"
    };
    merge('month_selector_label', headerLabelStyle);
    merge('year_selector_label', headerLabelStyle);

    // (Optional) if you ever show month/year selector grids
    merge('month_label', { color: colors.textPrimary, fontWeight: '700', textTransform: 'capitalize' });
    merge('year_label', { color: colors.textPrimary, fontWeight: '700' });
    merge('selected_month_label', { color: colors.textPrimary, fontWeight: '800', textTransform: 'capitalize' });
    merge('selected_year_label', { color: colors.textPrimary, fontWeight: '800' });

    // ---- Weekday labels ----
    merge('weekday_label', { color: colors.textSecondary, fontWeight: '700' });

    // ---- Day numbers ----
    merge('day_label', { color: colors.textPrimary, fontWeight: '600' });
    merge('outside_label', { color: colors.textMuted });

    // ---- Today ----
    merge('today', { borderColor: colors.primary, borderWidth: 1, backgroundColor: 'transparent' });
    merge('today_label', { color: colors.primary, fontWeight: '800' });

    // ---- Selected single day ----
    merge('selected', { backgroundColor: colors.primary });
    merge('selected_label', { color: selectedLabelColor, fontWeight: '900' });

    // ---- Range styling (THIS fixes in-range day number visibility) ----
    // Containers:
    merge('range_middle', { backgroundColor: rangeFillBg });
    merge('range_fill', { backgroundColor: rangeFillBg });

    // Week edge fills (important in your version):
    merge('range_fill_weekstart', { backgroundColor: rangeFillBg });
    merge('range_fill_weekend', { backgroundColor: rangeFillBg });

    // Start/End pills:
    merge('range_start', { backgroundColor: colors.primary });
    merge('range_end', { backgroundColor: colors.primary });

    // Labels:
    // Middle of range should be normal readable textPrimary (not same as fill)
    merge('range_middle_label', { color: colors.textPrimary, fontWeight: '700' });

    // Start/end should use contrasting text on primary
    merge('range_start_label', { color: selectedLabelColor, fontWeight: '900' });
    merge('range_end_label', { color: selectedLabelColor, fontWeight: '900' });

    // If any disabled/hidden labels appear
    merge('disabled_label', { color: colors.textMuted });
    merge('hidden', { opacity: 0 });

    return base;
  }, [
    colors.primary,
    colors.surface,
    colors.textMuted,
    colors.textPrimary,
    colors.textSecondary,
    defaultStyles,
    rangeFillBg,
    selectedLabelColor,
  ]);

  const handleApply = () => {
    const start = toJSDate(startDate) ?? initialStartDate;
    let end = toJSDate(endDate) ?? initialEndDate ?? start;

    if (end < start) end = start;

    onConfirm({ startDate: start, endDate: end });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
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
                const parsedStart = nextStart ?? null;
                const parsedEnd = nextEnd ?? null;

                if (parsedStart != null) setStartDate(parsedStart);
                if (parsedEnd != null) setEndDate(parsedEnd);
                else if (parsedStart != null) setEndDate(parsedStart);
              }}
              minDate={minDate}
              maxDate={maxDate}
              locale={locale}
              styles={pickerStyles}
              style={{ backgroundColor: colors.surface }}
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
      backgroundColor: colors.surface,
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
      color: getContrastingTextColor(colors.primary),
      fontWeight: '700',
    },
  });
