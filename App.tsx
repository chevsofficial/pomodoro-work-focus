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
import { configureRevenueCat } from './src/services/revenuecat';
import { ToastProvider } from './src/components/ToastProvider';
import { AuthCallbackHandler } from './src/components/AuthCallbackHandler';
import { handlePendingNavigation, navigationRef } from './src/navigation/navigationRef';

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
      prefixes: ['tomoflow://', 'https://tomoflow.app', 'https://www.tomoflow.app', Linking.createURL('/')],
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
          ResetPassword: 'auth-recovery',
          ForgotPassword: 'forgot-password',
          TaskDetail: 'task/:taskId',
          Paywall: 'paywall',
          Auth: 'auth',
        },
      },
    }),
    [],
  );

  useEffect(() => {
    configureRevenueCat();
  }, []);

  useEffect(() => {
    initializeNotifications();
  }, []);

  useEffect(() => {
    if (settings.notificationsEnabled) {
      requestNotificationPermissions();
    }
  }, [settings.notificationsEnabled]);

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const appStore = useAppStore.getState();

      if (appStore.isPasswordRecovery) {
        // Do not set cloud user or hydrate during recovery
        return;
      }

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
        <ToastProvider>
          <NavigationContainer
            linking={linking as any}
            theme={navigationTheme}
            ref={navigationRef}
            onReady={handlePendingNavigation}
          >
            <StatusBar style={statusBarStyle} backgroundColor={colors.background} />
            <AuthCallbackHandler />
            <RootNavigator />
          </NavigationContainer>
        </ToastProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

export default App;
