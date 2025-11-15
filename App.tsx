import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme, Theme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { RootNavigator } from './src/navigation/RootNavigator';
import type { RootStackParamList } from './src/navigation/RootNavigator';
import { colors } from './src/theme/colors';
import { useSettings } from './src/store/appStore';
import { initializeNotifications, requestNotificationPermissions } from './src/utils/notificationService';

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

const navigationTheme: Theme = {
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
};

const App: React.FC = () => {
  const settings = useSettings();

  useEffect(() => {
    initializeNotifications();
  }, []);

  useEffect(() => {
    if (settings.notificationsEnabled) {
      void requestNotificationPermissions();
    }
  }, [settings.notificationsEnabled]);

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navigationTheme}>
        <StatusBar style="light" />
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default App;
