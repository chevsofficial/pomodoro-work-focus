import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigatorScreenParams } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import { InfoScreen } from '../screens/InfoScreen';
import { PomodoroScreen } from '../screens/PomodoroScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { TasksScreen } from '../screens/TasksScreen';
import { TaskDetailScreen } from '../screens/TaskDetailScreen';
import { PaywallScreen } from '../screens/PaywallScreen';
import { colors } from '../theme/colors';

export type RootTabParamList = {
  Tasks: undefined;
  Pomodoro: { taskId?: string } | undefined;
  Analytics: undefined;
  Settings: undefined;
  Info: undefined;
};

export type RootStackParamList = {
  RootTabs: NavigatorScreenParams<RootTabParamList>;
  TaskDetail: { taskId: string };
  Paywall: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

// Keep this to relax types for Tab.Navigator
const AnyTabNavigator = Tab.Navigator as any;

const Stack = createNativeStackNavigator<RootStackParamList>();

// NEW: relax types for Stack.Navigator as well
const AnyStackNavigator = Stack.Navigator as any;

function TabNavigator() {
  return (
    <AnyTabNavigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        tabBarStyle: { backgroundColor: colors.surface },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
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
              iconName = focused
                ? 'information-circle'
                : 'information-circle-outline';
              break;
            default:
              iconName = focused ? 'ellipse' : 'ellipse-outline';
          }

          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
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
  return (
    <AnyStackNavigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        contentStyle: { backgroundColor: colors.background },
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
        options={{
          title: 'Task Detail',
        }}
      />
      <Stack.Screen
        name="Paywall"
        component={PaywallScreen}
        options={{
          title: 'Upgrade',
        }}
      />
    </AnyStackNavigator>
  );
}
