import { useMemo } from 'react';
import useAppStore, { useIsPro } from '../store/appStore';
import { THEMES, ThemeId, AppColors } from './themes';

const FALLBACK_THEME_ID: ThemeId = 'dark';

export function useThemeColors(): AppColors {
  const themeId = useAppStore((state) => state.settings.themeId ?? FALLBACK_THEME_ID);
  const isPro = useIsPro();

  const theme = useMemo(() => {
    const requestedId = themeId ?? FALLBACK_THEME_ID;
    const requested = THEMES[requestedId] ?? THEMES[FALLBACK_THEME_ID];

    if (!isPro && requested.isProOnly) {
      return THEMES[FALLBACK_THEME_ID];
    }

    return requested;
  }, [themeId, isPro]);

  return theme.colors;
}

export { THEMES, ThemeId, AppColors };
