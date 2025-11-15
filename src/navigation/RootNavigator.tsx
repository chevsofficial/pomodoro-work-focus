import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import { InfoScreen } from '../screens/InfoScreen';
import { PomodoroScreen } from '../screens/PomodoroScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { TasksScreen } from '../screens/TasksScreen';
import { TaskDetailScreen } from '../screens/TaskDetailScreen';
import { colors } from '../theme/colors';

export type RootTabParamList = {
  Tasks: undefined;
  Pomodoro: undefined;
  Analytics: undefined;
  Settings: undefined;
  Info: undefined;
};

export type RootStackParamList = {
  RootTabs: undefined;
  TaskDetail: { taskId: string };
};

const Tab = createBottomTabNavigator<RootTabParamList>();

// <-- add this line
const AnyTabNavigator = Tab.Navigator as any;

const Stack = createNativeStackNavigator<RootStackParamList>();

function TabNavigator() {
  return (
    <AnyTabNavigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        tabBarStyle: { backgroundColor: colors.surface },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
      }}
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
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="RootTabs" component={TabNavigator} options={{ headerShown: false }} />
      <Stack.Screen
        name="TaskDetail"
        component={TaskDetailScreen}
        options={{
          title: 'Task Detail',
        }}
      />
    </Stack.Navigator>
  );
}
