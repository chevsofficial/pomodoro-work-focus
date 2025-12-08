import React, { useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigatorScreenParams, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import { InfoScreen } from '../screens/InfoScreen';
import { PomodoroScreen } from '../screens/PomodoroScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { TasksScreen } from '../screens/TasksScreen';
import { TaskDetailScreen } from '../screens/TaskDetailScreen';
import { PaywallScreen } from '../screens/PaywallScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { useThemeColors } from '../theme/useThemeColors';
import { AuthCallbackScreen } from '../screens/AuthCallbackScreen';
import { ActivityTypesManagerScreen } from '../screens/ActivityTypesManagerScreen';
import { t } from '../i18n/translations';
import useAppStore from '../store/appStore';

export type RootTabParamList = {
  Tasks: undefined;
  Pomodoro: { taskId?: string } | undefined;
  Analytics: undefined;
  Settings: undefined;
  Info: { highlightPro?: boolean } | undefined;
};

export type RootStackParamList = {
  RootTabs: NavigatorScreenParams<RootTabParamList>;
  TaskDetail: { taskId: string };
  Paywall: undefined;
  Auth: undefined;
  AuthCallback: undefined;
  ActivityTypesManager: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

// Keep this to relax types for Tab.Navigator
const AnyTabNavigator = Tab.Navigator as any;

const Stack = createNativeStackNavigator<RootStackParamList>();

// NEW: relax types for Stack.Navigator as well
const AnyStackNavigator = Stack.Navigator as any;

type TabIconProps = {
  color: string;
  size: number;
  name: string;
};

const TabIcon = ({ color, size, name }: TabIconProps) => (
  <Ionicons name={name as any} size={size} color={color} />
);

type TabBarIconRenderer = ({
  focused,
  color,
  size,
}: {
  focused: boolean;
  color: string;
  size: number;
}) => JSX.Element;

type TabBarIconProps = {
  routeName: keyof RootTabParamList;
  focused: boolean;
  color: string;
  size: number;
};

const TabBarIcon = ({ routeName, focused, color, size }: TabBarIconProps) => {
  let iconName: string;

  switch (routeName) {
    case 'Tasks':
      iconName = focused ? 'list' : 'list-outline';
      break;
    case 'Pomodoro':
      iconName = focused ? 'timer' : 'timer-outline';
      break;
    case 'Analytics':
      iconName = focused ? 'stats-chart' : 'stats-chart-outline';
      break;
    case 'Settings':
      iconName = focused ? 'settings' : 'settings-outline';
      break;
    case 'Info':
      iconName = focused ? 'information-circle' : 'information-circle-outline';
      break;
    default:
      iconName = focused ? 'ellipse' : 'ellipse-outline';
  }

  return <TabIcon name={iconName} size={size} color={color} />;
};

const renderTabBarIcon = (routeName: keyof RootTabParamList): TabBarIconRenderer => {
  return ({ focused, color, size }) => (
    <TabBarIcon
      routeName={routeName}
      focused={focused}
      color={color}
      size={size}
    />
  );
};

function TabNavigator() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const language = useAppStore((state) => state.language);

  return (
    <AnyTabNavigator
      key={language}
      screenOptions={({
        route,
      }: {
        route: RouteProp<RootTabParamList, keyof RootTabParamList>;
      }) => ({
        headerShown: false,
        headerStyle: styles.header,
        headerTintColor: colors.textPrimary,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: renderTabBarIcon(route.name as keyof RootTabParamList),
        tabBarLabel:
          route.name === 'Pomodoro'
            ? t('nav.tabTimer')
            : route.name === 'Tasks'
            ? t('nav.tabTasks')
            : route.name === 'Analytics'
            ? t('nav.tabAnalytics')
            : route.name === 'Settings'
            ? t('nav.tabSettings')
            : t('nav.tabInfo'),
      })}
    >
      <Tab.Screen name="Tasks" component={TasksScreen} />
      <Tab.Screen name="Pomodoro" component={PomodoroScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
      <Tab.Screen name="Info" component={InfoScreen} />
    </AnyTabNavigator>
  );
}

export function RootNavigator() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <AnyStackNavigator
      screenOptions={{
        headerStyle: styles.header,
        headerTintColor: colors.textPrimary,
        contentStyle: styles.stackContent,
      }}
    >
      <Stack.Screen
        name="RootTabs"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TaskDetail"
        component={TaskDetailScreen}
      />
      <Stack.Screen
        name="Paywall"
        component={PaywallScreen}
        options={{
          title: 'Upgrade',
        }}
      />
      <Stack.Screen
        name="Auth"
        component={AuthScreen}
        options={{
          title: 'Cloud Sync',
        }}
      />
      <Stack.Screen
        name="AuthCallback"
        component={AuthCallbackScreen}
        options={{
          title: 'Email Confirmed',
        }}
      />
      <Stack.Screen
        name="ActivityTypesManager"
        component={ActivityTypesManagerScreen}
      />
    </AnyStackNavigator>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    header: { backgroundColor: colors.surface },
    tabBar: { backgroundColor: colors.surface },
    tabLabel: { fontSize: 12, fontWeight: '500' },
    stackContent: { backgroundColor: colors.background },
  });
}
