import { useMemo } from 'react';
import useAppStore from '../store/appStore';
import { ThemeName } from '../models';

export type AppColors = {
  background: string;
  surface: string;
  surfaceAlt: string;
  primary: string;
  accent: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  borderSubtle: string;
  danger: string;
};

export const darkColors: AppColors = {
  background: '#111216',
  surface: '#1E2126',
  surfaceAlt: '#242830',
  primary: '#FF5A5F',
  accent: '#FF9F43',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A5B1',
  border: 'rgba(255,255,255,0.08)',
  borderSubtle: 'rgba(255,255,255,0.08)',
  danger: '#FF4B4B',
};

export const lightColors: AppColors = {
  background: '#F5F6FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F2F7',
  primary: '#FF5A5F',
  accent: '#FF9F43',
  textPrimary: '#111216',
  textSecondary: '#6B7280',
  border: 'rgba(15,17,21,0.08)',
  borderSubtle: 'rgba(15,17,21,0.08)',
  danger: '#E02424',
};

// Default static export for backward compatibility (dark theme)
export const colors = darkColors;

export const getThemeColors = (theme: ThemeName): AppColors =>
  theme === 'light' ? lightColors : darkColors;

export const useThemeColors = (): AppColors => {
  const theme = useAppStore((s) => s.settings.theme ?? 'dark');
  return useMemo(() => getThemeColors(theme), [theme]);
};
