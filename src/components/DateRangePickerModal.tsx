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

  /**
   * IMPORTANT:
   * This library expects styling via `styles` prop + useDefaultStyles().
   * The props like calendarTextStyle/headerTextStyle/etc. are NOT part of DatePickerRangeProps,
   * which is why TS errors were showing. :contentReference[oaicite:2]{index=2}
   */
  const pickerStyles = useMemo(() => {
    // We "as any" here because the library's Styles type is an internal mapped enum;
    // extra keys are ignored safely, and it keeps TS from blocking builds.
    const merged: any = {
      ...defaultStyles,

      // Container / general backgrounds
      container: {
        ...(defaultStyles as any).container,
        backgroundColor: colors.surface,
      },

      // Header / month caption
      header: {
        ...(defaultStyles as any).header,
        backgroundColor: colors.surface,
      },
      header_label: {
        ...(defaultStyles as any).header_label,
        color: colors.textPrimary,
        fontWeight: '700',
      },

      // Weekdays row
      weekdays: {
        ...(defaultStyles as any).weekdays,
        backgroundColor: colors.surface,
      },
      weekday_label: {
        ...(defaultStyles as any).weekday_label,
        color: colors.textSecondary,
        fontWeight: '600',
      },

      // Day cells
      day: {
        ...(defaultStyles as any).day,
        backgroundColor: 'transparent',
      },
      day_label: {
        ...(defaultStyles as any).day_label,
        color: colors.textPrimary,
        fontWeight: '600',
      },

      // "Outside month" days (if shown by default on your version)
      outside: {
        ...(defaultStyles as any).outside,
        backgroundColor: 'transparent',
      },
      outside_label: {
        ...(defaultStyles as any).outside_label,
        color: colors.textMuted,
      },

      // Today highlight
      today: {
        ...(defaultStyles as any).today,
        borderColor: colors.primary,
        borderWidth: 1,
        backgroundColor: 'transparent',
      },
      today_label: {
        ...(defaultStyles as any).today_label,
        color: colors.primary,
        fontWeight: '700',
      },

      // Selected day highlight
      selected: {
        ...(defaultStyles as any).selected,
        backgroundColor: colors.primary,
      },
      selected_label: {
        ...(defaultStyles as any).selected_label,
        color: selectedLabelColor,
        fontWeight: '800',
      },

      // Range styling (some versions use these keys; harmless if ignored)
      range_fill: {
        ...(defaultStyles as any).range_fill,
        backgroundColor: colors.surfaceAlt,
      },
      range_fill_label: {
        ...(defaultStyles as any).range_fill_label,
        color: colors.textPrimary,
      },
    };

    return merged;
  }, [
    colors.primary,
    colors.surface,
    colors.surfaceAlt,
    colors.textMuted,
    colors.textPrimary,
    colors.textSecondary,
    defaultStyles,
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
