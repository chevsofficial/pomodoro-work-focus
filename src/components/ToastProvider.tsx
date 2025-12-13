import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '../theme/useThemeColors';
import { spacing } from '../theme/spacing';

export type ToastType = 'success' | 'error' | 'info';

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

interface ToastState {
  message: string;
  type: ToastType;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const colors = useThemeColors();
  const [toast, setToast] = useState<ToastState | null>(null);

  const opacity = useRef(new Animated.Value(0)).current;

  // In React Native, setTimeout returns a number (or platform-specific type),
  // so this is the safest cross-platform typing:
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current);
        hideTimeout.current = null;
      }

      setToast({ message, type });

      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      hideTimeout.current = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) {
            setToast(null);
          }
        });
      }, 3500);
    },
    [opacity]
  );

  useEffect(() => {
    return () => {
      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current);
        hideTimeout.current = null;
      }
    };
  }, []);

  const backgroundColor = useMemo(() => {
    switch (toast?.type) {
      case 'success':
        // AppColors doesn't have `success`, so use `primary` as the "success" toast color
        return colors.primary ?? '#1fa971';
      case 'error':
        return colors.danger ?? '#e74c3c';
      case 'info':
      default:
        return colors.surface;
    }
  }, [colors.primary, colors.danger, colors.surface, toast?.type]);

  const textColor =
    toast?.type === 'info'
      ? colors.textPrimary
      : (colors.surface ?? '#ffffff'); // readable on primary/danger backgrounds

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {toast && (
        <Animated.View style={[styles.container, { opacity }]}>
          <View style={[styles.toast, { backgroundColor }]}>
            <Text style={[styles.text, { color: textColor }]}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.xl,
    alignItems: 'center',
    zIndex: 100,
  },
  toast: {
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
