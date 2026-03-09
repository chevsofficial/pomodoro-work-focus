import 'react-native-gesture-handler';
import React, { useEffect, useMemo, useState } from 'react';
import * as Linking from 'expo-linking';
import { NavigationContainer, DefaultTheme, Theme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar, StatusBarStyle } from 'expo-status-bar';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ThemeProvider } from './src/theme/ThemeProvider';
import { useThemeColors } from './src/theme/useThemeColors';
import useAppStore, { useLanguage, useSettings } from './src/store/appStore';
import { bootstrapLanguage } from './src/i18n/language';
import { setAppLanguage } from './src/i18n';
import {
  initializeNotifications,
  requestNotificationPermissions,
  syncNotificationChannels,
} from './src/utils/notificationService';
import { supabase } from './src/services/supabaseClient';
import { cloudSyncApi } from './src/services/cloudSyncApi';
import { configureRevenueCat, logInRevenueCat, logOutRevenueCat } from './src/services/revenuecat';
import { refreshWebProEntitlement } from './src/services/webEntitlements';
import { ToastProvider } from './src/components/ToastProvider';
import { AuthCallbackHandler } from './src/components/AuthCallbackHandler';
import { handlePendingNavigation, navigationRef } from './src/navigation/navigationRef';
import { MissingConfig } from './src/config/runtimeConfig';
import { ConfigErrorScreen } from './src/screens/ConfigErrorScreen';
import { isProdBuild } from './src/utils/env';

const App: React.FC = () => {
  const colors = useThemeColors();
  const settings = useSettings();
  const language = useLanguage();
  const [isReady, setIsReady] = useState(false);

  const prodBuild = isProdBuild();
  const shouldBlockSupabase = prodBuild && MissingConfig.supabase;
  const shouldBlockRevenueCat = prodBuild && Platform.OS !== 'web' && MissingConfig.revenueCatProd;
  const shouldBlockApp = shouldBlockSupabase || shouldBlockRevenueCat;

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
    if (shouldBlockApp) return;
    configureRevenueCat();
  }, [shouldBlockApp]);

  useEffect(() => {
    if (shouldBlockApp || Platform.OS !== 'web') return;

    const handleUrl = async (url: string | null) => {
      if (!url) return;
      const parsed = Linking.parse(url);
      const checkoutState = (parsed.queryParams?.checkout as string | undefined) ?? undefined;
      if (!checkoutState) return;

      if (checkoutState === 'cancel') {
        Alert.alert('Checkout canceled', 'You can upgrade any time from the Pro screen.');
        return;
      }

      if (checkoutState !== 'success') return;

      const { data } = await supabase.auth.getSession();
      const userId = data?.session?.user?.id;
      if (!userId) {
        Alert.alert('Sign in required', 'Please sign in to finish Pro activation.');
        return;
      }

      const hasPro = await refreshWebProEntitlement(userId);
      if (hasPro) {
        Alert.alert('Pro unlocked', 'Your subscription is active.');
      } else {
        Alert.alert(
          'Processing subscription',
          'Payment succeeded, but entitlement is still syncing. Refresh in a moment.',
        );
      }
    };

    Linking.getInitialURL().then(handleUrl).catch(() => undefined);
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url).catch(() => undefined);
    });

    return () => subscription.remove();
  }, [shouldBlockApp]);

  useEffect(() => {
    if (shouldBlockApp) return;
    let isMounted = true;

    (async () => {
      const detectedLanguage = await bootstrapLanguage();
      await setAppLanguage(detectedLanguage);

      if (isMounted) {
        setIsReady(true);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [shouldBlockApp]);

  useEffect(() => {
    if (shouldBlockApp) return;
    initializeNotifications({ soundEnabled: settings.soundEnabled });
  }, [settings.soundEnabled, shouldBlockApp]);

  useEffect(() => {
    if (shouldBlockApp) return;
    syncNotificationChannels();
  }, [language, shouldBlockApp]);

  useEffect(() => {
    if (shouldBlockApp) return;
    if (settings.notificationsEnabled) {
      requestNotificationPermissions();
    }
  }, [settings.notificationsEnabled, shouldBlockApp]);

  useEffect(() => {
    if (shouldBlockApp) return;
    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const appStore = useAppStore.getState();

      if (appStore.isPasswordRecovery) {
        // Do not set cloud user or hydrate during recovery
        return;
      }

      const userId = session?.user?.id;

      if (!userId) {
        await logOutRevenueCat();
        appStore.setPro(false);
        appStore.setCloudUser(undefined);
        appStore.setCloudSyncEnabled(false);
        return;
      }

      appStore.setCloudUser(userId);

      if (Platform.OS === 'web') {
        await refreshWebProEntitlement(userId);
      } else {
        const loginResult = await logInRevenueCat(userId);
        if (!loginResult) {
          appStore.setPro(false);
        }
      }

      const cloudSnapshot = await cloudSyncApi.fetchSnapshot(userId);
      if (cloudSnapshot) {
        appStore.hydrateFromCloudSnapshot(cloudSnapshot);
      }
    });

    return () => {
      subscription?.subscription.unsubscribe();
    };
  }, [shouldBlockApp]);

  if (shouldBlockSupabase) {
    return (
      <ConfigErrorScreen message="Missing Supabase configuration (EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY)." />
    );
  }

  if (shouldBlockRevenueCat) {
    return (
      <ConfigErrorScreen message="Missing RevenueCat configuration (EXPO_PUBLIC_REVENUECAT_ANDROID_KEY / EXPO_PUBLIC_REVENUECAT_IOS_KEY)." />
    );
  }

  if (!isReady) {
    return <View style={[styles.bootSplash, { backgroundColor: colors.background }]} />;
  }

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

const styles = StyleSheet.create({
  bootSplash: {
    flex: 1,
  },
});
