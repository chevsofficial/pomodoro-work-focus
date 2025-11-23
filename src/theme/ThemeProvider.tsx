import React, { useEffect } from 'react';
import useAppStore, { useIsPro } from '../store/appStore';
import { THEMES } from './themes';

const FALLBACK_THEME_ID = 'dark';

type ThemeProviderProps = {
  children: React.ReactNode;
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const themeId = useAppStore((state) => state.settings.themeId);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const isPro = useIsPro();

  useEffect(() => {
    const requestedTheme = themeId ? THEMES[themeId] : undefined;
    if (!isPro && requestedTheme?.isProOnly) {
      updateSettings({ themeId: FALLBACK_THEME_ID });
    }
  }, [isPro, themeId, updateSettings]);

  return <>{children}</>;
};
