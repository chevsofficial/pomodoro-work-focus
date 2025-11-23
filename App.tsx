import 'react-native-gesture-handler';
import React, { useEffect, useMemo } from 'react';
import { NavigationContainer, DefaultTheme, Theme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { RootNavigator } from './src/navigation/RootNavigator';
import type { RootStackParamList } from './src/navigation/RootNavigator';
import { ThemeProvider } from './src/theme/ThemeProvider';
import { useThemeColors } from './src/theme/useThemeColors';
import { useSettings } from './src/store/appStore';
import { initializeNotifications, requestNotificationPermissions } from './src/utils/notificationService';

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

const App: React.FC = () => {
  const colors = useThemeColors();
  const settings = useSettings();

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

  useEffect(() => {
    void initializeNotifications();
  }, []);

  useEffect(() => {
    if (settings.notificationsEnabled) {
      void requestNotificationPermissions();
    }
  }, [settings.notificationsEnabled]);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <NavigationContainer theme={navigationTheme}>
          <StatusBar style="light" />
          <RootNavigator />
        </NavigationContainer>
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

export default App;
