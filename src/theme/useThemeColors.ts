const colors = {
  primary: '#FF5A5F',
  accent: '#00A896',
  background: '#121417',
  surface: '#1E2126',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A5B1',
  border: 'rgba(255, 255, 255, 0.08)',
} as const;

export type AppColors = typeof colors;

export function useThemeColors() {
  return colors;
}

export { colors };
