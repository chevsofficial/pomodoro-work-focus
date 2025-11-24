export type ThemeId =
  | 'dark'
  | 'light'
  | 'forest'
  | 'ocean'
  | 'sunset'
  | 'winter'
  | 'autumn'
  | 'spring'
  | 'summer'
  | 'neon';

export type AppColors = {
  primary: string;
  accent: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  danger: string;
  chipBackground: string;
  chipSelectedBackground: string;
  tabBarBackground: string;
  tabBarActive: string;
  tabBarInactive: string;
  cardShadow: string;
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
  light: {
    id: 'light',
    name: 'Light',
    colors: {
      primary: '#E05255',
      accent: '#1E88E5',
      background: '#F7F8FB',
      surface: '#FFFFFF',
      surfaceAlt: '#EFF2F8',
      textPrimary: '#0F172A',
      textSecondary: '#475569',
      textMuted: '#94A3B8',
      border: 'rgba(15, 23, 42, 0.12)',
      danger: '#DC2626',
      chipBackground: '#EFF2F8',
      chipSelectedBackground: '#E05255',
      tabBarBackground: '#FFFFFF',
      tabBarActive: '#E05255',
      tabBarInactive: '#94A3B8',
      cardShadow: 'rgba(18, 18, 30, 0.06)',
    },
    previewColors: ['#FFFFFF', '#F7F8FB', '#E05255'],
    isProOnly: false,
  },
  dark: {
    id: 'dark',
    name: 'Dark',
    colors: {
      primary: '#FF5A5F',
      accent: '#00A896',
      background: '#121417',
      surface: '#1E2126',
      surfaceAlt: '#2A2E35',
      textPrimary: '#FFFFFF',
      textSecondary: '#A0A5B1',
      textMuted: '#7A7F8B',
      border: 'rgba(255, 255, 255, 0.08)',
      danger: '#FF6B6B',
      chipBackground: '#2A2E35',
      chipSelectedBackground: '#FF5A5F',
      tabBarBackground: '#121417',
      tabBarActive: '#FF5A5F',
      tabBarInactive: '#7A7F8B',
      cardShadow: 'rgba(0, 0, 0, 0.65)',
    },
    previewColors: ['#121417', '#1E2126', '#FF5A5F'],
    isProOnly: false,
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    colors: {
      primary: '#4CAF50',
      accent: '#8BC34A',
      background: '#0F1A12',
      surface: '#162318',
      surfaceAlt: '#1D2C1E',
      textPrimary: '#E8F5E9',
      textSecondary: '#A5D6A7',
      textMuted: '#7CB08C',
      border: 'rgba(232, 245, 233, 0.12)',
      danger: '#E57373',
      chipBackground: '#1D2C1E',
      chipSelectedBackground: '#4CAF50',
      tabBarBackground: '#0F1A12',
      tabBarActive: '#4CAF50',
      tabBarInactive: '#7CB08C',
      cardShadow: 'rgba(0, 0, 0, 0.65)',
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
      surfaceAlt: '#123049',
      textPrimary: '#E3F2FD',
      textSecondary: '#9CC4E4',
      textMuted: '#6E94B3',
      border: 'rgba(227, 242, 253, 0.12)',
      danger: '#FF6B6B',
      chipBackground: '#123049',
      chipSelectedBackground: '#1E88E5',
      tabBarBackground: '#0D1A24',
      tabBarActive: '#1E88E5',
      tabBarInactive: '#6E94B3',
      cardShadow: 'rgba(0, 0, 0, 0.65)',
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
      surfaceAlt: '#2D1A1E',
      textPrimary: '#FFECE6',
      textSecondary: '#FFC8B2',
      textMuted: '#D9A38B',
      border: 'rgba(255, 236, 230, 0.12)',
      danger: '#FF6B6B',
      chipBackground: '#2D1A1E',
      chipSelectedBackground: '#FF7043',
      tabBarBackground: '#1A0F12',
      tabBarActive: '#FF7043',
      tabBarInactive: '#D9A38B',
      cardShadow: 'rgba(0, 0, 0, 0.65)',
    },
    previewColors: ['#1A0F12', '#FF7043', '#FBC02D'],
    isProOnly: true,
  },
  winter: {
    id: 'winter',
    name: 'Winter',
    colors: {
      primary: '#80DEEA',
      accent: '#4DD0E1',
      background: '#0E1A21',
      surface: '#13222B',
      surfaceAlt: '#19323E',
      textPrimary: '#E0F7FA',
      textSecondary: '#A7D7E7',
      textMuted: '#7EA8BA',
      border: 'rgba(224, 247, 250, 0.14)',
      danger: '#FF6B6B',
      chipBackground: '#19323E',
      chipSelectedBackground: '#80DEEA',
      tabBarBackground: '#0E1A21',
      tabBarActive: '#80DEEA',
      tabBarInactive: '#7EA8BA',
      cardShadow: 'rgba(0, 0, 0, 0.65)',
    },
    previewColors: ['#0E1A21', '#80DEEA', '#4DD0E1'],
    isSeasonal: true,
    isProOnly: true,
  },
  autumn: {
    id: 'autumn',
    name: 'Autumn',
    colors: {
      background: '#1B1410',
      surface: '#241915',
      surfaceAlt: '#2E2019',
      primary: '#FF9F43',
      accent: '#E85D3A',
      border: 'rgba(255,255,255,0.14)',
      textPrimary: '#FFFFFF',
      textSecondary: '#F5CBA7',
      textMuted: '#B5835A',
      danger: '#FF4C4C',
      chipBackground: '#2E2019',
      chipSelectedBackground: '#FF9F43',
      tabBarBackground: '#1B1410',
      tabBarActive: '#FF9F43',
      tabBarInactive: '#B5835A',
      cardShadow: 'rgba(0,0,0,0.65)',
    },
    previewColors: ['#1B1410', '#FF9F43', '#E85D3A'],
    isProOnly: true,
  },
  spring: {
    id: 'spring',
    name: 'Spring',
    colors: {
      background: '#F4FBF7',
      surface: '#FFFFFF',
      surfaceAlt: '#E5F5EC',
      primary: '#34C759',
      accent: '#FF9FB6',
      border: 'rgba(0,0,0,0.06)',
      textPrimary: '#183024',
      textSecondary: '#4F6A59',
      textMuted: '#8DA79A',
      danger: '#E0527E',
      chipBackground: '#E5F5EC',
      chipSelectedBackground: '#34C759',
      tabBarBackground: '#FFFFFF',
      tabBarActive: '#34C759',
      tabBarInactive: '#8DA79A',
      cardShadow: 'rgba(18,18,30,0.06)',
    },
    previewColors: ['#F4FBF7', '#34C759', '#FF9FB6'],
    isProOnly: true,
  },
  summer: {
    id: 'summer',
    name: 'Summer',
    colors: {
      background: '#FFF9F0',
      surface: '#FFFFFF',
      surfaceAlt: '#FFEFD4',
      primary: '#FFB347',
      accent: '#00B8D9',
      border: 'rgba(0,0,0,0.06)',
      textPrimary: '#2C2015',
      textSecondary: '#7A5B3A',
      textMuted: '#B08A63',
      danger: '#FF4C4C',
      chipBackground: '#FFEFD4',
      chipSelectedBackground: '#FFB347',
      tabBarBackground: '#FFFFFF',
      tabBarActive: '#FFB347',
      tabBarInactive: '#B08A63',
      cardShadow: 'rgba(18,18,30,0.06)',
    },
    previewColors: ['#FFF9F0', '#FFB347', '#00B8D9'],
    isProOnly: true,
  },
  neon: {
    id: 'neon',
    name: 'Neon',
    colors: {
      background: '#050712',
      surface: '#101322',
      surfaceAlt: '#161A2B',
      primary: '#00FFC3',
      accent: '#FF47A3',
      border: 'rgba(0,255,195,0.3)',
      textPrimary: '#FFFFFF',
      textSecondary: '#A0B2FF',
      textMuted: '#707493',
      danger: '#FF4C7D',
      chipBackground: '#161A2B',
      chipSelectedBackground: '#00FFC3',
      tabBarBackground: '#050712',
      tabBarActive: '#00FFC3',
      tabBarInactive: '#707493',
      cardShadow: 'rgba(0,0,0,0.7)',
    },
    previewColors: ['#050712', '#00FFC3', '#FF47A3'],
    isProOnly: true,
  },
};

export { THEMES };
