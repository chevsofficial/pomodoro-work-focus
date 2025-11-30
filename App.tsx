import 'react-native-gesture-handler';
import React, { useEffect, useMemo } from 'react';
import * as Linking from 'expo-linking';
import { NavigationContainer, DefaultTheme, Theme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar, StatusBarStyle } from 'expo-status-bar';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ThemeProvider } from './src/theme/ThemeProvider';
import { useThemeColors } from './src/theme/useThemeColors';
import useAppStore, { useSettings } from './src/store/appStore';
import { initializeNotifications, requestNotificationPermissions } from './src/utils/notificationService';
import { supabase } from './src/services/supabaseClient';
import { cloudSyncApi } from './src/services/cloudSyncApi';

const App: React.FC = () => {
  const colors = useThemeColors();
  const settings = useSettings();

  const statusBarStyle = useMemo<StatusBarStyle>(() => {
    const hex = colors.background.replace('#', '');

    if (hex.length === 6 || hex.length === 3) {
      const expandedHex = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
      const r = parseInt(expandedHex.slice(0, 2), 16);
      const g = parseInt(expandedHex.slice(2, 4), 16);
      const b = parseInt(expandedHex.slice(4, 6), 16);

      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.6 ? 'dark' : 'light';
    }

    return 'light';
  }, [colors.background]);

  const navigationTheme = useMemo<Theme>(
    () => ({
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.textPrimary,
        border: colors.surface,
        notification: colors.accent,
      },
    }),
    [colors],
  );

  const linking = useMemo(
    () => ({
      prefixes: ['tomoflow://', Linking.createURL('/')],
      config: {
        screens: {
          RootTabs: {
            screens: {
              Pomodoro: 'pomodoro',
              Tasks: 'tasks',
              Analytics: 'analytics',
              Settings: 'settings',
              Info: 'info',
            },
          },
          AuthCallback: 'auth-callback',
          TaskDetail: 'task/:taskId',
          Paywall: 'paywall',
          Auth: 'auth',
        },
      },
    }),
    [],
  );

  useEffect(() => {
    initializeNotifications();
  }, []);

  useEffect(() => {
    if (settings.notificationsEnabled) {
      requestNotificationPermissions();
    }
  }, [settings.notificationsEnabled]);

  useEffect(() => {
    const handleAuthCallback = async (url: string) => {
      const { path } = Linking.parse(url);

      if (path !== 'auth-callback') {
        return;
      }

      try {
        const parsedUrl = new URL(url);
        const hash = parsedUrl.hash.startsWith('#') ? parsedUrl.hash.slice(1) : parsedUrl.hash;

        if (!hash) {
          return;
        }

        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const expiresIn = params.get('expires_in');

        if (!accessToken || !refreshToken) {
          return;
        }

        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
          ...(expiresIn ? { expires_in: Number(expiresIn) } : {}),
        });
      } catch (error) {
        console.warn('Failed to handle auth callback URL', error);
      }
    };

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleAuthCallback(url);
    });

    Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl) {
        handleAuthCallback(initialUrl);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const appStore = useAppStore.getState();

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const userId = session?.user?.id;

      if (!userId) {
        appStore.setCloudUser(undefined);
        appStore.setCloudSyncEnabled(false);
        return;
      }

      appStore.setCloudUser(userId);

      const cloudSnapshot = await cloudSyncApi.fetchSnapshot(userId);
      if (cloudSnapshot) {
        appStore.hydrateFromCloudSnapshot(cloudSnapshot);
      }
    });

    return () => {
      subscription?.subscription.unsubscribe();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <NavigationContainer linking={linking} theme={navigationTheme}>
          <StatusBar style={statusBarStyle} backgroundColor={colors.background} />
          <RootNavigator />
        </NavigationContainer>
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

export default App;
