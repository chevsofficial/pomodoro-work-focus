import React, { useEffect, useMemo } from 'react';
import useAppStore, { useIsPro } from '../store/appStore';
import { THEMES } from './themes';

const FALLBACK_THEME_ID = 'dark';

type ThemeProviderProps = {
  children: React.ReactNode;
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const isPro = useIsPro();

  const theme = useMemo(() => {
    const requestedId = settings.themeId ?? FALLBACK_THEME_ID;
    const requested = THEMES[requestedId] ?? THEMES[FALLBACK_THEME_ID];

    if (!isPro && requested.isProOnly) {
      return THEMES[FALLBACK_THEME_ID];
    }

    return requested;
  }, [settings.themeId, isPro]);

  useEffect(() => {
    if (settings.themeId && theme.id !== settings.themeId) {
      updateSettings({ themeId: theme.id });
    }
  }, [settings.themeId, theme.id, updateSettings]);

  return <>{children}</>;
};
