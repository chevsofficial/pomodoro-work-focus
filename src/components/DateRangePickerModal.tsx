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

/**
 * DateType in react-native-ui-datepicker can be:
 * string | number | Dayjs | Date | null | undefined
 * (per the library's type definitions) :contentReference[oaicite:1]{index=1}
 */
const toJSDate = (value: DateType): Date | null => {
  if (value == null) return null;

  if (value instanceof Date) return value;

  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // Dayjs (or compatible) usually has toDate()
  const maybe: any = value;
  if (typeof maybe?.toDate === 'function') {
    const d = maybe.toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
  }

  // last resort
  try {
    const d = new Date(maybe);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
};

const getContrastingTextColor = (bgHex: string) => {
  // expects #RRGGBB, fallback to white text
  const hex = (bgHex || '').replace('#', '');
  if (hex.length !== 6) return '#FFFFFF';

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  // simple luminance approximation
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // If background is bright, use dark text; otherwise white text
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

  useEffect(() => {
    if (__DEV__ && visible) {
      // eslint-disable-next-line no-console
      console.log('[DatePicker styles keys]', Object.keys(defaultStyles || {}));
    }
  }, [defaultStyles, visible]);

  // Keep state as DateType so we can accept Dayjs returned by the picker.
  const [startDate, setStartDate] = useState<DateType>(initialStartDate);
  const [endDate, setEndDate] = useState<DateType>(initialEndDate);

  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    if (!visible) return;
    setStartDate(initialStartDate);
    setEndDate(initialEndDate);
  }, [initialEndDate, initialStartDate, visible]);

  // Theme-aware contrast for selected date label
  const selectedLabelColor = useMemo(
    () => getContrastingTextColor(colors.primary),
    [colors.primary],
  );
  const rangeFillBg = useMemo(
    () => withAlpha(colors.primary, 0.18),
    [colors.primary],
  );

  /**
   * IMPORTANT:
   * This library expects styling via `styles` prop + useDefaultStyles().
   * The props like calendarTextStyle/headerTextStyle/etc. are NOT part of DatePickerRangeProps,
   * which is why TS errors were showing. :contentReference[oaicite:2]{index=2}
   */
  const pickerStyles = useMemo(() => {
    // We "as any" here because the library's Styles type is an internal mapped enum;
    // extra keys are ignored safely, and it keeps TS from blocking builds.
    const base: any = { ...defaultStyles };

    const merge = (key: string, value: any) => {
      base[key] = { ...(base[key] ?? {}), ...value };
    };

    // ---- Modal/picker base surfaces ----
    merge('container', { backgroundColor: colors.surface });
    merge('header', { backgroundColor: colors.surface });
    merge('weekdays', { backgroundColor: colors.surface });

    // ---- Month header label ----
    const monthLabelStyle = {
      color: colors.textPrimary,
      fontWeight: '700',
      textTransform: 'capitalize',
    };
    merge('header_label', monthLabelStyle);
    merge('month_label', monthLabelStyle);
    merge('month_year_label', monthLabelStyle);
    merge('headerLabel', monthLabelStyle);

    // ---- Weekday labels ----
    merge('weekday_label', { color: colors.textSecondary, fontWeight: '600' });
    merge('weekDaysLabel', { color: colors.textSecondary, fontWeight: '600' });

    // ---- Day labels (default) ----
    merge('day', { backgroundColor: 'transparent' });
    merge('day_label', { color: colors.textPrimary, fontWeight: '600' });
    merge('dayLabel', { color: colors.textPrimary, fontWeight: '600' });

    // Outside month days
    merge('outside_label', { color: colors.textMuted });
    merge('outsideLabel', { color: colors.textMuted });

    // ---- Today styling ----
    merge('today', {
      borderColor: colors.primary,
      borderWidth: 1,
      backgroundColor: 'transparent',
    });
    merge('today_label', { color: colors.primary, fontWeight: '700' });
    merge('todayLabel', { color: colors.primary, fontWeight: '700' });

    // ---- Selected day styling ----
    merge('selected', { backgroundColor: colors.primary });
    merge('selected_label', { color: selectedLabelColor, fontWeight: '800' });
    merge('selectedLabel', { color: selectedLabelColor, fontWeight: '800' });

    // ---- Range fill styling ----
    merge('range_fill', { backgroundColor: rangeFillBg });
    merge('rangeFill', { backgroundColor: rangeFillBg });

    const rangeLabelStyle = { color: colors.textPrimary, fontWeight: '600' };
    merge('range_fill_label', rangeLabelStyle);
    merge('rangeFillLabel', rangeLabelStyle);
    merge('range_middle_label', rangeLabelStyle);
    merge('rangeMiddleLabel', rangeLabelStyle);
    merge('in_range_label', rangeLabelStyle);
    merge('inRangeLabel', rangeLabelStyle);

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
                // nextStart/nextEnd are DateType (can be Dayjs)
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
      backgroundColor: colors.surface, // important: prevents “all black” bleed-through
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
      // Keep this readable across themes too:
      color: getContrastingTextColor(colors.primary),
      fontWeight: '700',
    },
  });
