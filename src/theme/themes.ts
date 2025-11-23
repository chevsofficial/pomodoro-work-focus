export type ThemeId = 'dark' | 'forest' | 'ocean' | 'sunset' | 'winter';

export type AppColors = {
  primary: string;
  accent: string;
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
};

type ThemeDefinition = {
  id: ThemeId;
  name: string;
  colors: AppColors;
  previewColors: string[];
  isProOnly?: boolean;
  isSeasonal?: boolean;
};

const THEMES: Record<ThemeId, ThemeDefinition> = {
  dark: {
    id: 'dark',
    name: 'Midnight',
    colors: {
      primary: '#FF5A5F',
      accent: '#00A896',
      background: '#121417',
      surface: '#1E2126',
      textPrimary: '#FFFFFF',
      textSecondary: '#A0A5B1',
      border: 'rgba(255, 255, 255, 0.08)',
    },
    previewColors: ['#121417', '#1E2126', '#FF5A5F'],
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    colors: {
      primary: '#4CAF50',
      accent: '#8BC34A',
      background: '#0F1A12',
      surface: '#162318',
      textPrimary: '#E8F5E9',
      textSecondary: '#A5D6A7',
      border: 'rgba(232, 245, 233, 0.12)',
    },
    previewColors: ['#0F1A12', '#4CAF50', '#8BC34A'],
    isProOnly: true,
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    colors: {
      primary: '#1E88E5',
      accent: '#26C6DA',
      background: '#0D1A24',
      surface: '#102232',
      textPrimary: '#E3F2FD',
      textSecondary: '#9CC4E4',
      border: 'rgba(227, 242, 253, 0.12)',
    },
    previewColors: ['#0D1A24', '#1E88E5', '#26C6DA'],
    isProOnly: true,
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    colors: {
      primary: '#FF7043',
      accent: '#FBC02D',
      background: '#1A0F12',
      surface: '#241418',
      textPrimary: '#FFECE6',
      textSecondary: '#FFC8B2',
      border: 'rgba(255, 236, 230, 0.12)',
    },
    previewColors: ['#1A0F12', '#FF7043', '#FBC02D'],
  },
  winter: {
    id: 'winter',
    name: 'Winter',
    colors: {
      primary: '#80DEEA',
      accent: '#4DD0E1',
      background: '#0E1A21',
      surface: '#13222B',
      textPrimary: '#E0F7FA',
      textSecondary: '#A7D7E7',
      border: 'rgba(224, 247, 250, 0.14)',
    },
    previewColors: ['#0E1A21', '#80DEEA', '#4DD0E1'],
    isSeasonal: true,
  },
};

export { THEMES };
