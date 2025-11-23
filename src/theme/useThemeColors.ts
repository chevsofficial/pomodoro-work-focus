import useAppStore from '../store/appStore';
import { THEMES, ThemeId, AppColors } from './themes';

const FALLBACK_THEME_ID: ThemeId = 'dark';

export function useThemeColors(): AppColors {
  const themeId = useAppStore((state) => state.settings.themeId ?? FALLBACK_THEME_ID);
  return THEMES[themeId]?.colors ?? THEMES[FALLBACK_THEME_ID].colors;
}

export { THEMES, ThemeId, AppColors };
